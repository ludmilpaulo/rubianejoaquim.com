from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from courses.assessment import (
    SCORING_PARTIAL,
    certificate_status,
    completion_status,
    issue_certificate,
    revoke_certificate,
    score_question,
    submit_exam_attempt,
    submit_quiz_attempt,
    validate_question_payload,
)
from courses.models import (
    Certificate,
    Choice,
    Course,
    Enrollment,
    FinalExam,
    FinalExamQuestion,
    Lesson,
    LessonQuiz,
    LessonQuizQuestion,
    Progress,
    Question,
)
from instructors.models import InstructorProfile

User = get_user_model()


class AssessmentHelpersMixin:
    def make_user(self, email, **kwargs):
        defaults = {'password': 'pass12345', 'first_name': 'Ada', 'last_name': 'Lovelace'}
        defaults.update(kwargs)
        password = defaults.pop('password')
        user = User.objects.create_user(username=email, email=email, password=password, **defaults)
        return user

    def make_course(self, instructor=None, **kwargs):
        data = {
            'title': 'Finance 101',
            'slug': kwargs.pop('slug', f'finance-{User.objects.count()}'),
            'description': 'Learn money',
            'price': 0,
            'is_free': True,
            'status': Course.STATUS_PUBLISHED,
            'offers_certificate': True,
        }
        data.update(kwargs)
        if instructor:
            data['instructor'] = instructor
        return Course.objects.create(**data)

    def make_lesson(self, course, **kwargs):
        data = {'title': 'Budgeting', 'slug': kwargs.pop('slug', f'l-{Lesson.objects.count()}'), 'course': course}
        data.update(kwargs)
        return Lesson.objects.create(**data)

    def make_question(self, course, lesson, text, options, question_type='single', points=5):
        question = Question.objects.create(
            course=course,
            lesson=lesson,
            question_text=text,
            question_type=question_type,
            points=points,
            explanation='Because a budget plans income and expenses.',
        )
        for index, (label, correct) in enumerate(options):
            Choice.objects.create(question=question, choice_text=label, is_correct=correct, order=index)
        return question

    def attach_quiz(self, lesson, questions, **kwargs):
        quiz = LessonQuiz.objects.create(lesson=lesson, title='Lesson quiz', **kwargs)
        for index, question in enumerate(questions):
            LessonQuizQuestion.objects.create(quiz=quiz, question=question, points=question.points, order=index)
        return quiz


class ScoringUnitTests(AssessmentHelpersMixin, TestCase):
    def setUp(self):
        self.course = self.make_course()
        self.lesson = self.make_lesson(self.course)
        self.single = self.make_question(
            self.course, self.lesson, 'What is a budget?',
            [
                ('A plan for managing income and expenses', True),
                ('A type of bank account', False),
                ('A loan', False),
                ('A credit card', False),
            ],
        )
        self.multi = self.make_question(
            self.course, self.lesson, 'Select income sources',
            [
                ('Salary', True),
                ('Gift', True),
                ('Rent paid', False),
                ('Loan repayment', False),
            ],
            question_type='multiple',
            points=10,
        )

    def test_single_choice_correct(self):
        correct = self.single.choices.get(is_correct=True)
        earned, ok = score_question(self.single, [correct.id], 5)
        self.assertEqual(earned, Decimal('5'))
        self.assertTrue(ok)

    def test_single_choice_incorrect(self):
        wrong = self.single.choices.filter(is_correct=False).first()
        earned, ok = score_question(self.single, [wrong.id], 5)
        self.assertEqual(earned, Decimal('0'))
        self.assertFalse(ok)

    def test_multiple_choice_correct(self):
        ids = list(self.multi.choices.filter(is_correct=True).values_list('id', flat=True))
        earned, ok = score_question(self.multi, ids, 10)
        self.assertEqual(earned, Decimal('10'))
        self.assertTrue(ok)

    def test_multiple_choice_partial(self):
        correct = list(self.multi.choices.filter(is_correct=True).values_list('id', flat=True))
        wrong = self.multi.choices.filter(is_correct=False).first().id
        earned, ok = score_question(self.multi, [correct[0], wrong], 10, SCORING_PARTIAL)
        self.assertFalse(ok)
        self.assertEqual(earned, Decimal('0.00'))
        earned2, ok2 = score_question(self.multi, [correct[0]], 10, SCORING_PARTIAL)
        self.assertEqual(earned2, Decimal('5.00'))
        self.assertFalse(ok2)

    def test_validate_single_requires_one_correct(self):
        errors, _ = validate_question_payload(
            'Q',
            [{'choice_text': 'A', 'is_correct': True}, {'choice_text': 'B', 'is_correct': True}],
            'single',
            1,
        )
        self.assertIn('single_choice_one_correct', errors)


class QuizAttemptTests(AssessmentHelpersMixin, TestCase):
    def setUp(self):
        self.student = self.make_user('student@example.com')
        self.course = self.make_course()
        self.lesson = self.make_lesson(self.course)
        Enrollment.objects.create(user=self.student, course=self.course, status='active')
        q1 = self.make_question(
            self.course, self.lesson, 'Q1',
            [('Yes', True), ('No', False)],
            points=5,
        )
        q2 = self.make_question(
            self.course, self.lesson, 'Q2',
            [('A', True), ('B', True), ('C', False)],
            question_type='multiple',
            points=10,
        )
        q3 = self.make_question(
            self.course, self.lesson, 'Q3',
            [('Right', True), ('Wrong', False)],
            points=5,
        )
        self.q1, self.q2, self.q3 = q1, q2, q3
        self.quiz = self.attach_quiz(
            self.lesson, [q1, q2, q3], passing_score=70, max_attempts=3, multi_scoring='all_or_nothing',
        )

    def test_quiz_score(self):
        answers = [
            {'question_id': self.q1.id, 'choice_id': self.q1.choices.get(is_correct=True).id},
            {'question_id': self.q2.id, 'choice_ids': list(self.q2.choices.filter(is_correct=True).values_list('id', flat=True))},
            {'question_id': self.q3.id, 'choice_id': self.q3.choices.filter(is_correct=False).first().id},
        ]
        result, _ = submit_quiz_attempt(self.student, self.quiz, answers)
        self.assertEqual(result.earned_points, Decimal('15.00'))
        self.assertEqual(result.maximum_points, Decimal('20.00'))
        self.assertEqual(result.score, Decimal('75.00'))
        self.assertTrue(result.passed)

    def test_passing_score(self):
        answers = [
            {'question_id': self.q1.id, 'choice_id': self.q1.choices.get(is_correct=True).id},
            {'question_id': self.q2.id, 'choice_ids': list(self.q2.choices.filter(is_correct=True).values_list('id', flat=True))},
            {'question_id': self.q3.id, 'choice_id': self.q3.choices.get(is_correct=True).id},
        ]
        result, _ = submit_quiz_attempt(self.student, self.quiz, answers)
        self.assertEqual(result.score, Decimal('100.00'))
        self.assertTrue(result.passed)

    def test_failing_score(self):
        answers = [
            {'question_id': self.q1.id, 'choice_id': self.q1.choices.filter(is_correct=False).first().id},
            {'question_id': self.q2.id, 'choice_id': self.q2.choices.filter(is_correct=False).first().id},
            {'question_id': self.q3.id, 'choice_id': self.q3.choices.filter(is_correct=False).first().id},
        ]
        result, _ = submit_quiz_attempt(self.student, self.quiz, answers)
        self.assertEqual(result.score, Decimal('0.00'))
        self.assertFalse(result.passed)

    def test_attempt_limit(self):
        self.quiz.max_attempts = 1
        self.quiz.save()
        answers = [{'question_id': self.q1.id, 'choice_id': self.q1.choices.filter(is_correct=False).first().id}]
        submit_quiz_attempt(self.student, self.quiz, answers)
        from courses.assessment import AttemptLimitError
        with self.assertRaises(AttemptLimitError):
            submit_quiz_attempt(self.student, self.quiz, answers)

    def test_client_score_rejected(self):
        client = APIClient()
        client.force_authenticate(self.student)
        res = client.post(
            f'/api/course/lesson-quiz/{self.quiz.id}/submit/',
            {'answers': [], 'score': 100, 'passed': True},
            format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get('error'), 'client_score_rejected')


class CompletionCertificateTests(AssessmentHelpersMixin, TestCase):
    def setUp(self):
        self.student = self.make_user('learner@example.com')
        self.instructor_user = self.make_user('teacher@example.com')
        self.instructor = InstructorProfile.objects.create(
            user=self.instructor_user, slug='inst-a', status='approved',
        )
        self.course = self.make_course(instructor=self.instructor, slug='course-a')
        self.lesson = self.make_lesson(self.course, slug='lesson-a')
        self.enrollment = Enrollment.objects.create(user=self.student, course=self.course, status='active')
        q = self.make_question(self.course, self.lesson, 'Q', [('Yes', True), ('No', False)], points=10)
        self.quiz = self.attach_quiz(self.lesson, [q], passing_score=70)
        self.correct = q.choices.get(is_correct=True)

    def test_course_completion(self):
        status = completion_status(self.enrollment)
        self.assertFalse(status['completed'])
        submit_quiz_attempt(self.student, self.quiz, [
            {'question_id': self.quiz.questions.first().question_id, 'choice_id': self.correct.id},
        ])
        status = completion_status(self.enrollment)
        self.assertTrue(status['completed'])

    def test_certificate_generation(self):
        submit_quiz_attempt(self.student, self.quiz, [
            {'question_id': self.quiz.questions.first().question_id, 'choice_id': self.correct.id},
        ])
        cert = issue_certificate(self.enrollment)
        self.assertIsNotNone(cert)
        self.assertTrue(cert.public_id.startswith('ZND-CERT-'))
        self.assertEqual(cert.status, 'valid')

    def test_certificate_not_issued_before_requirements(self):
        self.assertIsNone(issue_certificate(self.enrollment))

    def test_certificate_verification(self):
        submit_quiz_attempt(self.student, self.quiz, [
            {'question_id': self.quiz.questions.first().question_id, 'choice_id': self.correct.id},
        ])
        cert = issue_certificate(self.enrollment)
        client = APIClient()
        res = client.get(f'/api/course/certificates/verify/{cert.public_id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['student_name'], 'Ada Lovelace')
        self.assertEqual(res.data['display_status'], 'valid')

    def test_certificate_revocation(self):
        submit_quiz_attempt(self.student, self.quiz, [
            {'question_id': self.quiz.questions.first().question_id, 'choice_id': self.correct.id},
        ])
        cert = issue_certificate(self.enrollment)
        revoke_certificate(cert, 'admin')
        self.assertEqual(certificate_status(cert), 'revoked')
        client = APIClient()
        res = client.get(f'/api/course/certificates/verify/{cert.code}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['display_status'], 'revoked')
        self.assertIn('revoked', (res.data.get('message') or '').lower())


class InstructorPermissionTests(AssessmentHelpersMixin, TestCase):
    def setUp(self):
        self.admin = self.make_user('admin@example.com', is_staff=True, is_superuser=True)
        self.teacher_a = self.make_user('a@example.com')
        self.teacher_b = self.make_user('b@example.com')
        self.inst_a = InstructorProfile.objects.create(
            user=self.teacher_a, slug='a', status='approved',
        )
        self.inst_b = InstructorProfile.objects.create(
            user=self.teacher_b, slug='b', status='approved',
        )
        self.course_a = self.make_course(instructor=self.inst_a, slug='ca')
        self.course_b = self.make_course(instructor=self.inst_b, slug='cb')
        self.lesson_a = self.make_lesson(self.course_a, slug='la')
        self.lesson_b = self.make_lesson(self.course_b, slug='lb')
        q = self.make_question(self.course_a, self.lesson_a, 'Owned by A', [('Yes', True), ('No', False)])
        self.question_a = q
        self.question_b = self.make_question(
            self.course_b, self.lesson_b, 'Owned by B', [('Yes', True), ('No', False)],
        )
        self.choice_a = self.question_a.choices.get(is_correct=True)
        self.quiz_a = self.attach_quiz(self.lesson_a, [self.question_a])
        self.quiz_b = self.attach_quiz(self.lesson_b, [self.question_b])

    def test_instructor_cannot_see_other_questions(self):
        client = APIClient()
        client.force_authenticate(self.teacher_b)
        res = client.get('/api/course/admin/questions/')
        self.assertEqual(res.status_code, 200)
        payload = res.data if isinstance(res.data, list) else res.data.get('results', [])
        ids = [row['id'] for row in payload]
        self.assertNotIn(self.question_a.id, ids)

    def test_instructor_cannot_edit_other_questions(self):
        client = APIClient()
        client.force_authenticate(self.teacher_b)
        res = client.patch(
            f'/api/course/admin/questions/{self.question_a.id}/',
            {'question_text': 'hacked'},
            format='json',
        )
        self.assertIn(res.status_code, (403, 404))
        self.question_a.refresh_from_db()
        self.assertEqual(self.question_a.question_text, 'Owned by A')

    def test_instructor_cannot_create_question_on_foreign_lesson(self):
        client = APIClient()
        client.force_authenticate(self.teacher_b)
        res = client.post(
            '/api/course/admin/questions/',
            {
                'lesson': self.lesson_a.id,
                'question_text': 'Stolen via lesson_id',
                'question_type': 'single',
                'points': 1,
                'choices': [
                    {'choice_text': 'A', 'is_correct': True, 'order': 0},
                    {'choice_text': 'B', 'is_correct': False, 'order': 1},
                ],
            },
            format='json',
        )
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Question.objects.filter(question_text='Stolen via lesson_id').exists())

    def test_instructor_cannot_create_question_with_own_course_and_foreign_lesson(self):
        client = APIClient()
        client.force_authenticate(self.teacher_b)
        res = client.post(
            '/api/course/admin/questions/',
            {
                'course': self.course_b.id,
                'lesson': self.lesson_a.id,
                'question_text': 'Mixed ownership',
                'question_type': 'single',
                'points': 1,
            },
            format='json',
        )
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Question.objects.filter(question_text='Mixed ownership').exists())

    def test_instructor_cannot_see_other_choices(self):
        client = APIClient()
        client.force_authenticate(self.teacher_b)
        res = client.get('/api/course/admin/choices/')
        self.assertEqual(res.status_code, 200)
        payload = res.data if isinstance(res.data, list) else res.data.get('results', [])
        ids = [row['id'] for row in payload]
        self.assertNotIn(self.choice_a.id, ids)

    def test_instructor_cannot_change_other_choices(self):
        client = APIClient()
        client.force_authenticate(self.teacher_b)
        res = client.patch(
            f'/api/course/admin/choices/{self.choice_a.id}/',
            {'is_correct': False, 'choice_text': 'hacked'},
            format='json',
        )
        self.assertIn(res.status_code, (403, 404))
        self.choice_a.refresh_from_db()
        self.assertTrue(self.choice_a.is_correct)
        self.assertNotEqual(self.choice_a.choice_text, 'hacked')

    def test_instructor_cannot_create_choice_on_foreign_question(self):
        client = APIClient()
        client.force_authenticate(self.teacher_b)
        res = client.post(
            '/api/course/admin/choices/',
            {
                'question': self.question_a.id,
                'choice_text': 'injected',
                'is_correct': True,
                'order': 9,
            },
            format='json',
        )
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Choice.objects.filter(choice_text='injected').exists())

    def test_instructor_cannot_see_other_quizzes(self):
        client = APIClient()
        client.force_authenticate(self.teacher_b)
        res = client.get('/api/course/admin/lesson-quizzes/')
        self.assertEqual(res.status_code, 200)
        payload = res.data if isinstance(res.data, list) else res.data.get('results', [])
        ids = [row['id'] for row in payload]
        self.assertNotIn(self.quiz_a.id, ids)
        self.assertIn(self.quiz_b.id, ids)

    def test_instructor_cannot_add_question_to_foreign_quiz(self):
        client = APIClient()
        client.force_authenticate(self.teacher_b)
        res = client.post(
            f'/api/course/admin/lesson-quizzes/{self.quiz_a.id}/add-question/',
            {'question_id': self.question_b.id},
            format='json',
        )
        self.assertIn(res.status_code, (403, 404))
        self.assertFalse(
            LessonQuizQuestion.objects.filter(quiz=self.quiz_a, question=self.question_b).exists()
        )

    def test_instructor_cannot_attach_foreign_question_to_own_quiz(self):
        client = APIClient()
        client.force_authenticate(self.teacher_b)
        res = client.post(
            f'/api/course/admin/lesson-quizzes/{self.quiz_b.id}/add-question/',
            {'question_id': self.question_a.id},
            format='json',
        )
        self.assertEqual(res.status_code, 403)
        self.assertFalse(
            LessonQuizQuestion.objects.filter(quiz=self.quiz_b, question=self.question_a).exists()
        )

    def test_instructor_cannot_create_quiz_on_foreign_lesson(self):
        extra = self.make_lesson(self.course_a, slug='la-extra')
        client = APIClient()
        client.force_authenticate(self.teacher_b)
        res = client.post(
            '/api/course/admin/lesson-quizzes/',
            {'lesson': extra.id, 'title': 'Hijacked quiz'},
            format='json',
        )
        self.assertEqual(res.status_code, 403)
        self.assertFalse(LessonQuiz.objects.filter(lesson=extra).exists())


class FinalExamTests(AssessmentHelpersMixin, TestCase):
    def setUp(self):
        self.student = self.make_user('exam@example.com')
        self.course = self.make_course(slug='exam-course', requires_final_exam=True)
        self.lesson = self.make_lesson(self.course, slug='pre')
        Enrollment.objects.create(user=self.student, course=self.course, status='active')
        q = self.make_question(self.course, self.lesson, 'Final Q', [('Yes', True), ('No', False)], points=10)
        self.exam = FinalExam.objects.create(course=self.course, passing_score=70, max_attempts=2)
        FinalExamQuestion.objects.create(exam=self.exam, question=q, points=10, order=0)
        self.q = q

    def test_final_exam_pass_then_complete(self):
        Progress.objects.create(user=self.student, lesson=self.lesson, completed=True)
        result, _ = submit_exam_attempt(self.student, self.exam, [
            {'question_id': self.q.id, 'choice_id': self.q.choices.get(is_correct=True).id},
        ])
        self.assertTrue(result.passed)
        enrollment = Enrollment.objects.get(user=self.student, course=self.course)
        self.assertTrue(completion_status(enrollment)['completed'])
        cert = issue_certificate(enrollment)
        self.assertIsNotNone(cert)
