"""Server-authoritative quiz scoring, course completion, and certificates.

Clients may send answers only. Score, pass/fail, completion, and certificate
issuance are computed here and must never be trusted from the client.

Multiple-choice scoring (configurable per quiz via ``multi_scoring``):
- ``all_or_nothing`` (default): student must select the exact correct set.
- ``partial``: proportional credit for correct selections minus wrong
  selections; selecting every option scores 0 unless every option is correct.
"""

from __future__ import annotations

import secrets
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError


SCORING_ALL_OR_NOTHING = 'all_or_nothing'
SCORING_PARTIAL = 'partial'
QUESTION_SINGLE = 'single'
QUESTION_MULTIPLE = 'multiple'
CERT_VALID = 'valid'
CERT_REVOKED = 'revoked'
CERT_EXPIRED = 'expired'


class AttemptLimitError(ValidationError):
    default_detail = 'attempt_limit_reached'
    default_code = 'attempt_limit'


def q2(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def parse_choice_ids(answer_data) -> list[int]:
    if not isinstance(answer_data, dict):
        return []
    ids: list[int] = []
    raw_ids = answer_data.get('choice_ids')
    if isinstance(raw_ids, list):
        for item in raw_ids:
            try:
                ids.append(int(item))
            except (TypeError, ValueError):
                continue
    choice_id = answer_data.get('choice_id')
    if choice_id is not None:
        try:
            ids.append(int(choice_id))
        except (TypeError, ValueError):
            pass
    seen = set()
    unique: list[int] = []
    for cid in ids:
        if cid not in seen:
            seen.add(cid)
            unique.append(cid)
    return unique


def score_question(question, selected_ids, points, scoring_rule=SCORING_ALL_OR_NOTHING):
    """Return (earned_points: Decimal, fully_correct: bool)."""
    points = Decimal(str(points or 0))
    correct_ids = set(question.choices.filter(is_correct=True).values_list('id', flat=True))
    valid_ids = set(question.choices.values_list('id', flat=True))
    selected = set(selected_ids) & valid_ids
    qtype = getattr(question, 'question_type', QUESTION_SINGLE) or QUESTION_SINGLE

    if qtype == QUESTION_SINGLE:
        if len(selected) == 1 and selected == correct_ids:
            return points, True
        return Decimal('0'), False

    if not correct_ids:
        return Decimal('0'), False
    if selected == correct_ids:
        return points, True

    if scoring_rule == SCORING_PARTIAL:
        if selected == valid_ids and correct_ids != valid_ids:
            return Decimal('0'), False
        right = len(selected & correct_ids)
        wrong = len(selected - correct_ids)
        ratio = Decimal(right - wrong) / Decimal(len(correct_ids))
        earned = max(Decimal('0'), points * ratio)
        return q2(earned), False

    return Decimal('0'), False


def validate_question_payload(question_text, choices, question_type=QUESTION_SINGLE, points=1):
    errors = []
    if not (question_text or '').strip():
        errors.append('question_text_required')
    cleaned = []
    texts = []
    for choice in choices or []:
        text = (choice.get('choice_text') or '').strip()
        if not text:
            continue
        cleaned.append({**choice, 'choice_text': text})
        texts.append(text.lower())
    if len(cleaned) < 2:
        errors.append('min_two_options')
    if len(texts) != len(set(texts)):
        errors.append('duplicate_options')
    correct = [c for c in cleaned if c.get('is_correct')]
    if not correct:
        errors.append('correct_answer_required')
    qtype = question_type or QUESTION_SINGLE
    if qtype == QUESTION_SINGLE and len(correct) != 1:
        errors.append('single_choice_one_correct')
    if qtype == QUESTION_MULTIPLE and len(correct) < 1:
        errors.append('multiple_choice_one_correct')
    try:
        if Decimal(str(points or 0)) <= 0:
            errors.append('points_gt_zero')
    except Exception:
        errors.append('points_gt_zero')
    return errors, cleaned


def validate_quiz_for_publish(quiz) -> list[str]:
    errors = []
    items = list(quiz.questions.select_related('question').prefetch_related('question__choices'))
    if not items:
        errors.append('quiz_needs_question')
        return errors
    for item in items:
        q_errors, _ = validate_question_payload(
            item.question.question_text,
            [
                {'choice_text': c.choice_text, 'is_correct': c.is_correct}
                for c in item.question.choices.all()
            ],
            getattr(item.question, 'question_type', QUESTION_SINGLE),
            item.points,
        )
        errors.extend(q_errors)
    return list(dict.fromkeys(errors))


def _attempt_count(user, quiz):
    from courses.models import QuizResult
    return QuizResult.objects.filter(user=user, quiz=quiz).count()


def _exam_attempt_count(user, exam):
    from courses.models import ExamResult
    return ExamResult.objects.filter(user=user, exam=exam).count()


def _guard_attempts(used, max_attempts):
    allowed = int(max_attempts or 0)
    if allowed > 0 and used >= allowed:
        raise AttemptLimitError({
            'detail': 'attempt_limit_reached',
            'attempts_used': used,
            'attempts_allowed': allowed,
        })


def _shuffle(items, enabled):
    if not enabled:
        return items
    import random
    copied = list(items)
    random.shuffle(copied)
    return copied


@transaction.atomic
def submit_quiz_attempt(user, quiz, answers_data, scoring_rule=None):
    from courses.models import QuizResult, UserQuizAnswer, Progress

    used = _attempt_count(user, quiz)
    _guard_attempts(used, getattr(quiz, 'max_attempts', 0))
    rule = scoring_rule or getattr(quiz, 'multi_scoring', None) or SCORING_ALL_OR_NOTHING
    items = list(
        quiz.questions.select_related('question').prefetch_related('question__choices').order_by('order', 'id')
    )
    by_question = {}
    for row in answers_data or []:
        if not isinstance(row, dict) or row.get('question_id') is None:
            continue
        by_question[int(row['question_id'])] = parse_choice_ids(row)

    result = QuizResult.objects.create(
        user=user,
        quiz=quiz,
        attempt_number=used + 1,
        score=0,
        total_questions=len(items),
        correct_answers=0,
        passed=False,
        earned_points=0,
        maximum_points=0,
        completed_at=timezone.now(),
    )

    earned = Decimal('0')
    maximum = Decimal('0')
    fully_correct = 0
    breakdown = []

    for item in items:
        question = item.question
        points = item.points or getattr(question, 'points', 1) or 1
        maximum += Decimal(str(points))
        selected = by_question.get(question.id, [])
        got, ok = score_question(question, selected, points, rule)
        earned += got
        if ok:
            fully_correct += 1
        UserQuizAnswer.objects.create(
            user=user,
            quiz=quiz,
            question=question,
            result=result,
            selected_choice_id=selected[0] if len(selected) == 1 else None,
            choice_ids=selected,
            is_correct=ok,
            earned_points=got,
        )
        breakdown.append({
            'question_id': question.id,
            'choice_ids': selected,
            'is_correct': ok,
            'earned_points': float(q2(got)),
            'points': float(q2(points)),
            'correct_choice_ids': list(question.choices.filter(is_correct=True).values_list('id', flat=True))
            if getattr(quiz, 'show_correct_after', False) else [],
            'explanation': question.explanation if getattr(quiz, 'show_explanations', False) else '',
        })

    percentage = q2((earned / maximum * 100) if maximum else 0)
    passed = percentage >= Decimal(str(quiz.passing_score or 0))
    result.score = percentage
    result.earned_points = q2(earned)
    result.maximum_points = q2(maximum)
    result.correct_answers = fully_correct
    result.passed = passed
    result.save(update_fields=[
        'score', 'earned_points', 'maximum_points', 'correct_answers', 'passed',
    ])

    if passed:
        progress, _ = Progress.objects.get_or_create(
            user=user, lesson=quiz.lesson, defaults={'completed': True, 'completed_at': timezone.now()}
        )
        if not progress.completed:
            progress.completed = True
            progress.completed_at = timezone.now()
            progress.save(update_fields=['completed', 'completed_at'])

    return result, breakdown


@transaction.atomic
def submit_exam_attempt(user, exam, answers_data):
    from courses.models import ExamResult, UserExamAnswer

    used = _exam_attempt_count(user, exam)
    _guard_attempts(used, exam.max_attempts)
    rule = getattr(exam, 'multi_scoring', None) or SCORING_ALL_OR_NOTHING
    items = list(
        exam.questions.select_related('question').prefetch_related('question__choices').order_by('order', 'id')
    )
    by_question = {}
    for row in answers_data or []:
        if not isinstance(row, dict) or row.get('question_id') is None:
            continue
        by_question[int(row['question_id'])] = parse_choice_ids(row)

    result = ExamResult.objects.create(
        user=user,
        exam=exam,
        attempt_number=used + 1,
        score=0,
        total_questions=len(items),
        correct_answers=0,
        passed=False,
        earned_points=0,
        maximum_points=0,
        completed_at=timezone.now(),
    )
    earned = Decimal('0')
    maximum = Decimal('0')
    fully_correct = 0
    breakdown = []
    for item in items:
        question = item.question
        points = item.points or getattr(question, 'points', 1) or 1
        maximum += Decimal(str(points))
        selected = by_question.get(question.id, [])
        got, ok = score_question(question, selected, points, rule)
        earned += got
        if ok:
            fully_correct += 1
        UserExamAnswer.objects.create(
            user=user,
            exam=exam,
            question=question,
            result=result,
            selected_choice_id=selected[0] if len(selected) == 1 else None,
            choice_ids=selected,
            is_correct=ok,
            earned_points=got,
        )
        breakdown.append({
            'question_id': question.id,
            'choice_ids': selected,
            'is_correct': ok,
            'earned_points': float(q2(got)),
            'points': float(q2(points)),
            'correct_choice_ids': list(question.choices.filter(is_correct=True).values_list('id', flat=True))
            if getattr(exam, 'show_correct_after', False) else [],
            'explanation': question.explanation if getattr(exam, 'show_explanations', False) else '',
        })

    percentage = q2((earned / maximum * 100) if maximum else 0)
    passed = percentage >= Decimal(str(exam.passing_score or 0))
    result.score = percentage
    result.earned_points = q2(earned)
    result.maximum_points = q2(maximum)
    result.correct_answers = fully_correct
    result.passed = passed
    result.save(update_fields=[
        'score', 'earned_points', 'maximum_points', 'correct_answers', 'passed',
    ])
    return result, breakdown


def completion_status(enrollment):
    from courses.models import Progress, LessonQuiz, QuizResult, ExamResult

    course = enrollment.course
    user = enrollment.user
    lessons = list(course.lessons.all())
    total_lessons = len(lessons)
    done = Progress.objects.filter(user=user, lesson__in=lessons, completed=True).count() if total_lessons else 0
    lesson_pct = (done / total_lessons * 100) if total_lessons else 100

    quizzes = list(LessonQuiz.objects.filter(lesson__course=course, is_active=True))
    quiz_total = len(quizzes)
    quiz_passed = 0
    for quiz in quizzes:
        if QuizResult.objects.filter(user=user, quiz=quiz, passed=True).exists():
            quiz_passed += 1
    quiz_pct = (quiz_passed / quiz_total * 100) if quiz_total else 100

    exam = getattr(course, 'final_exam', None)
    exam_required = bool(getattr(course, 'requires_final_exam', False))
    exam_passed = True
    if exam_required:
        exam_passed = bool(
            exam and exam.is_active and ExamResult.objects.filter(user=user, exam=exam, passed=True).exists()
        )
    elif exam and exam.is_active:
        exam_passed = ExamResult.objects.filter(user=user, exam=exam, passed=True).exists()

    lesson_needed = float(getattr(course, 'completion_lesson_percent', 100) or 100)
    quiz_needed = float(getattr(course, 'completion_quiz_percent', 100) or 100)
    completed = (
        enrollment.status == 'active'
        and lesson_pct >= lesson_needed
        and quiz_pct >= quiz_needed
        and exam_passed
        and (total_lessons > 0)
    )
    return {
        'completed': completed,
        'lessons_done': done,
        'lessons_total': total_lessons,
        'lesson_percent': round(lesson_pct, 1),
        'quizzes_passed': quiz_passed,
        'quizzes_total': quiz_total,
        'quiz_percent': round(quiz_pct, 1),
        'exam_required': exam_required or bool(exam and exam.is_active),
        'exam_passed': exam_passed,
        'final_exam': 'completed' if exam_passed and (exam_required or (exam and exam.is_active)) else (
            'not_completed' if (exam_required or (exam and exam.is_active)) else 'not_required'
        ),
    }


def allocate_public_id():
    from courses.models import Certificate
    year = timezone.now().year
    prefix = f'ZND-CERT-{year}-'
    last = Certificate.objects.filter(public_id__startswith=prefix).order_by('-id').first()
    seq = 1
    if last and last.public_id:
        try:
            seq = int(last.public_id.rsplit('-', 1)[-1]) + 1
        except (TypeError, ValueError):
            seq = Certificate.objects.count() + 1
    for _ in range(50):
        public_id = f'{prefix}{seq:06d}'
        if not Certificate.objects.filter(public_id=public_id).exists():
            return public_id
        seq += 1
    return f'{prefix}{secrets.token_hex(3).upper()}'


def allocate_code():
    from courses.models import Certificate
    code = secrets.token_hex(8).upper()
    while Certificate.objects.filter(code=code).exists():
        code = secrets.token_hex(8).upper()
    return code


def certificate_status(cert) -> str:
    status = getattr(cert, 'status', CERT_VALID) or CERT_VALID
    if status == CERT_REVOKED:
        return CERT_REVOKED
    expires_at = getattr(cert, 'expires_at', None)
    if expires_at and expires_at < timezone.now():
        return CERT_EXPIRED
    return CERT_VALID


def issue_certificate(enrollment):
    from courses.models import Certificate

    if enrollment.status != 'active':
        return None
    existing = getattr(enrollment, 'certificate', None)
    if existing:
        return existing
    course = enrollment.course
    if not course.offers_certificate:
        return None
    status = completion_status(enrollment)
    if not status['completed']:
        return None
    instructor = course.instructor
    user = enrollment.user
    return Certificate.objects.create(
        enrollment=enrollment,
        course=course,
        student=user,
        instructor=instructor,
        code=allocate_code(),
        public_id=allocate_public_id(),
        student_name=user.get_full_name() or user.email,
        course_title=getattr(course, 'certificate_title', '') or course.title,
        instructor_name=instructor.display_name if instructor else 'Zenda',
        status=CERT_VALID,
    )


def revoke_certificate(cert, reason=''):
    cert.status = CERT_REVOKED
    cert.revoked_at = timezone.now()
    cert.revoked_reason = reason or ''
    cert.save(update_fields=['status', 'revoked_at', 'revoked_reason'])
    return cert


def can_manage_course(user, course) -> bool:
    from instructors.permissions import approved_instructor, is_staff_admin
    if is_staff_admin(user):
        return True
    instructor = approved_instructor(user)
    return bool(instructor and course and course.instructor_id == instructor.id)


def can_manage_lesson(user, lesson) -> bool:
    return bool(lesson) and can_manage_course(user, getattr(lesson, 'course', None))


def can_manage_question(user, question) -> bool:
    """True only if the user may manage every course the question is attached to."""
    if question is None:
        return False
    from instructors.permissions import is_staff_admin
    if is_staff_admin(user):
        return True
    course = getattr(question, 'course', None)
    lesson = getattr(question, 'lesson', None)
    if lesson is not None and not can_manage_lesson(user, lesson):
        return False
    if course is not None and not can_manage_course(user, course):
        return False
    if course is None and lesson is None:
        return False
    return True
