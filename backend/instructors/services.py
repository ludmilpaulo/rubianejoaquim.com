from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Sum, Q
from django.utils import timezone
from django.utils.text import slugify

from .models import (
    EducationBillingSettings,
    EducationPayment,
    InstructorProfile,
    MentorProfile,
    PayoutRequest,
    TutorProfile,
)


def split_amount(gross: Decimal, commission_percent: Decimal | None = None) -> tuple[Decimal, Decimal, Decimal]:
    settings_row = EducationBillingSettings.get_solo()
    percent = commission_percent if commission_percent is not None else settings_row.platform_commission_percent
    gross = Decimal(gross)
    percent = Decimal(percent)
    fee = (gross * percent / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    net = (gross - fee).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return gross, fee, net


def record_education_payment(
    *,
    student,
    instructor: InstructorProfile,
    product_type: str,
    product_id: int,
    product_title: str,
    amount,
    currency: str,
    payment_method: str,
    enrollment_id: int | None = None,
    external_reference: str = '',
    status: str = EducationPayment.STATUS_COMPLETED,
) -> EducationPayment:
    settings_row = EducationBillingSettings.get_solo()
    gross, fee, net = split_amount(Decimal(str(amount)), settings_row.platform_commission_percent)
    now = timezone.now() if status == EducationPayment.STATUS_COMPLETED else None
    return EducationPayment.objects.create(
        student=student,
        instructor=instructor,
        product_type=product_type,
        product_id=product_id,
        product_title=product_title,
        amount=gross,
        currency=currency or settings_row.default_currency,
        platform_fee=fee,
        instructor_net=net,
        commission_percent=settings_row.platform_commission_percent,
        payment_method=payment_method,
        status=status,
        enrollment_id=enrollment_id,
        external_reference=external_reference,
        completed_at=now,
    )


def instructor_earnings_summary(instructor: InstructorProfile) -> dict:
    completed = EducationPayment.objects.filter(
        instructor=instructor,
        status=EducationPayment.STATUS_COMPLETED,
    )
    refunded = EducationPayment.objects.filter(
        instructor=instructor,
        status=EducationPayment.STATUS_REFUNDED,
    )
    payouts = PayoutRequest.objects.filter(instructor=instructor).exclude(
        status=PayoutRequest.STATUS_REJECTED,
    )
    total_sales = completed.aggregate(s=Sum('amount'))['s'] or Decimal('0')
    fee = completed.aggregate(s=Sum('platform_fee'))['s'] or Decimal('0')
    net = completed.aggregate(s=Sum('instructor_net'))['s'] or Decimal('0')
    refunds = refunded.aggregate(s=Sum('amount'))['s'] or Decimal('0')
    reserved = payouts.filter(
        status__in=[PayoutRequest.STATUS_PENDING, PayoutRequest.STATUS_PROCESSING, PayoutRequest.STATUS_PAID]
    ).aggregate(s=Sum('amount'))['s'] or Decimal('0')
    paid = payouts.filter(status=PayoutRequest.STATUS_PAID).aggregate(s=Sum('amount'))['s'] or Decimal('0')
    pending_payout = payouts.filter(
        status__in=[PayoutRequest.STATUS_PENDING, PayoutRequest.STATUS_PROCESSING]
    ).aggregate(s=Sum('amount'))['s'] or Decimal('0')
    available = net - reserved
    if available < 0:
        available = Decimal('0.00')
    return {
        'total_sales': str(total_sales),
        'platform_fee': str(fee),
        'instructor_net': str(net),
        'refunds': str(refunds),
        'paid': str(paid),
        'pending': str(pending_payout),
        'available': str(available),
        'currency': EducationBillingSettings.get_solo().default_currency,
    }


def ensure_profiles_from_application(application) -> InstructorProfile:
    user = application.user
    roles = application.roles_requested or ['instructor']
    instructor, _ = InstructorProfile.objects.get_or_create(
        user=user,
        defaults={
            'headline': (application.areas_to_teach or application.areas_of_expertise or [''])[0]
            if (application.areas_to_teach or application.areas_of_expertise)
            else '',
            'bio': application.biography,
            'country': application.country,
            'languages': application.languages or [],
            'expertise': application.areas_of_expertise or [],
            'qualifications': application.qualifications,
            'experience': application.experience,
            'linkedin_url': application.linkedin_url,
            'website': application.website,
            'youtube_channel': application.youtube_channel,
            'social_profiles': application.social_profiles or {},
            'status': InstructorProfile.STATUS_APPROVED,
            'slug': slugify(application.full_name) or f'instructor-{user.id}',
        },
    )
    if application.profile_photo and not instructor.photo:
        instructor.photo = application.profile_photo
    instructor.status = InstructorProfile.STATUS_APPROVED
    instructor.bio = instructor.bio or application.biography
    instructor.save()

    if 'mentor' in roles:
        mentor, _ = MentorProfile.objects.get_or_create(
            user=user,
            defaults={
                'instructor': instructor,
                'headline': instructor.headline,
                'bio': instructor.bio,
                'languages': instructor.languages,
                'subjects': instructor.expertise,
                'status': InstructorProfile.STATUS_APPROVED,
            },
        )
        mentor.status = InstructorProfile.STATUS_APPROVED
        mentor.instructor = instructor
        mentor.save()

    if 'tutor' in roles:
        tutor, _ = TutorProfile.objects.get_or_create(
            user=user,
            defaults={
                'instructor': instructor,
                'headline': instructor.headline,
                'bio': instructor.bio,
                'languages': instructor.languages,
                'subjects': instructor.expertise,
                'status': InstructorProfile.STATUS_APPROVED,
            },
        )
        tutor.status = InstructorProfile.STATUS_APPROVED
        tutor.instructor = instructor
        tutor.save()

    return instructor


def get_or_create_official_instructor():
    """Rubiane / Zenda Official — first instructor. Used to backfill existing catalog."""
    from django.contrib.auth import get_user_model

    User = get_user_model()
    official = InstructorProfile.objects.filter(is_official=True).first()
    if official:
        return official

    user = (
        User.objects.filter(email__icontains='rubiane').first()
        or User.objects.filter(is_superuser=True).order_by('id').first()
        or User.objects.filter(is_staff=True).order_by('id').first()
    )
    if user is None:
        user = User.objects.create_user(
            username='zenda-official',
            email='contacto@rubianejoaquim.com',
            first_name='Rubiane',
            last_name='Joaquim',
            password=None,
        )
        user.set_unusable_password()
        user.save()

    official, _ = InstructorProfile.objects.get_or_create(
        user=user,
        defaults={
            'slug': 'rubiane-joaquim',
            'headline': 'Financial Educator & Business Mentor',
            'bio': 'Founder of Zenda. Official Zenda instructor.',
            'country': 'AO',
            'languages': ['pt', 'en'],
            'expertise': ['Finance', 'Business', 'Investing'],
            'status': InstructorProfile.STATUS_APPROVED,
            'is_official': True,
        },
    )
    if not official.is_official:
        official.is_official = True
        official.status = InstructorProfile.STATUS_APPROVED
        official.save(update_fields=['is_official', 'status'])
    MentorProfile.objects.get_or_create(
        user=user,
        defaults={
            'instructor': official,
            'headline': official.headline,
            'bio': official.bio,
            'languages': official.languages,
            'subjects': official.expertise,
            'status': InstructorProfile.STATUS_APPROVED,
        },
    )
    return official


def refresh_course_rating(course):
    from django.db.models import Avg, Count
    from courses.models import CourseReview

    agg = course.reviews.filter(status=CourseReview.STATUS_PUBLISHED).aggregate(
        avg=Avg('rating'),
        count=Count('id'),
    )
    course.rating_avg = agg['avg'] or 0
    course.rating_count = agg['count'] or 0
    course.save(update_fields=['rating_avg', 'rating_count'])
    if course.instructor_id:
        inst_agg = CourseReview.objects.filter(
            course__instructor=course.instructor,
            status=CourseReview.STATUS_PUBLISHED,
        ).aggregate(avg=Avg('rating'), count=Count('id'))
        course.instructor.rating_avg = inst_agg['avg'] or 0
        course.instructor.rating_count = inst_agg['count'] or 0
        course.instructor.save(update_fields=['rating_avg', 'rating_count'])
