"""Enrollment activation, certificates, and education ledger writes."""

from django.utils import timezone

from instructors.models import EducationPayment
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
    from courses.assessment import issue_certificate as _issue
    return _issue(enrollment)
