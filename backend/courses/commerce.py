"""Enrollment activation, certificates, and education ledger writes."""

import secrets

from django.utils import timezone

from instructors.models import EducationPayment, InstructorProfile
from instructors.services import record_education_payment


def activate_enrollment(enrollment, *, payment_method: str, external_reference: str = ''):
    enrollment.status = 'active'
    enrollment.activated_at = timezone.now()
    enrollment.save(update_fields=['status', 'activated_at'])
    course = enrollment.course
    instructor = course.instructor
    if instructor is None:
        return enrollment
    already = EducationPayment.objects.filter(
        enrollment_id=enrollment.id,
        status=EducationPayment.STATUS_COMPLETED,
    ).exists()
    if already:
        return enrollment
    amount = 0 if course.is_free else course.price
    method = EducationPayment.METHOD_FREE if course.is_free or amount == 0 else payment_method
    record_education_payment(
        student=enrollment.user,
        instructor=instructor,
        product_type=EducationPayment.PRODUCT_TUTORIAL if course.kind == 'tutorial' else EducationPayment.PRODUCT_COURSE,
        product_id=course.id,
        product_title=course.title,
        amount=amount,
        currency=getattr(course, 'currency', None) or 'USD',
        payment_method=method,
        enrollment_id=enrollment.id,
        external_reference=external_reference,
    )
    instructor.students_count = instructor.courses.filter(
        enrollments__status='active'
    ).values('enrollments__user').distinct().count()
    instructor.save(update_fields=['students_count'])
    return enrollment


def issue_certificate(enrollment):
    from courses.models import Certificate, Progress, LessonQuiz, QuizResult

    if enrollment.status != 'active':
        return None
    if hasattr(enrollment, 'certificate'):
        return enrollment.certificate
    course = enrollment.course
    if not course.offers_certificate:
        return None
    user = enrollment.user
    lessons = course.lessons.all()
    total = lessons.count()
    if total == 0:
        return None
    done = Progress.objects.filter(user=user, lesson__in=lessons, completed=True).count()
    if done < total:
        return None
    for lesson in lessons:
        quiz = LessonQuiz.objects.filter(lesson=lesson, is_active=True).first()
        if quiz:
            result = QuizResult.objects.filter(user=user, quiz=quiz).first()
            if not result or not result.passed:
                return None
    instructor = course.instructor
    code = secrets.token_hex(8).upper()
    while Certificate.objects.filter(code=code).exists():
        code = secrets.token_hex(8).upper()
    return Certificate.objects.create(
        enrollment=enrollment,
        course=course,
        student=user,
        instructor=instructor,
        code=code,
        student_name=user.get_full_name() or user.email,
        course_title=course.title,
        instructor_name=instructor.display_name if instructor else 'Zenda',
    )
