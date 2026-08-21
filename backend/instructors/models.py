from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify

from config.locales import SUPPORTED_LOCALES


class EducatorApplication(models.Model):
    """User applies to become instructor, mentor, and/or tutor. Admin must approve."""

    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_MORE_INFO = 'more_info'
    STATUS_SUSPENDED = 'suspended'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_MORE_INFO, 'Request more information'),
        (STATUS_SUSPENDED, 'Suspended'),
    ]

    ROLE_INSTRUCTOR = 'instructor'
    ROLE_MENTOR = 'mentor'
    ROLE_TUTOR = 'tutor'
    ROLE_CHOICES = [
        (ROLE_INSTRUCTOR, 'Instructor'),
        (ROLE_MENTOR, 'Mentor'),
        (ROLE_TUTOR, 'Tutor'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='educator_applications',
    )
    full_name = models.CharField(max_length=200)
    profile_photo = models.ImageField(upload_to='instructor_applications/', blank=True, null=True)
    biography = models.TextField()
    country = models.CharField(max_length=2, blank=True)
    languages = models.JSONField(default=list, blank=True, help_text='Locale codes, e.g. ["pt","en"]')
    areas_of_expertise = models.JSONField(default=list, blank=True)
    qualifications = models.TextField(blank=True)
    experience = models.TextField(blank=True)
    teaching_experience = models.TextField(blank=True)
    areas_to_teach = models.JSONField(default=list, blank=True)
    linkedin_url = models.URLField(blank=True)
    website = models.URLField(blank=True)
    youtube_channel = models.URLField(blank=True)
    social_profiles = models.JSONField(default=dict, blank=True)
    identification_notes = models.TextField(
        blank=True,
        help_text='Verification / ID notes. Do not store full ID document numbers in logs.',
    )
    payout_method_preview = models.CharField(max_length=80, blank=True)
    payout_details = models.JSONField(
        default=dict,
        blank=True,
        help_text='Payout setup provided at application time (IBAN last4, method).',
    )
    roles_requested = models.JSONField(
        default=list,
        blank=True,
        help_text='Subset of instructor, mentor, tutor',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    admin_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_educator_applications',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f'{self.full_name} ({self.status})'


class InstructorProfile(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_SUSPENDED = 'suspended'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_SUSPENDED, 'Suspended'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='instructor_profile',
    )
    slug = models.SlugField(max_length=80, unique=True)
    headline = models.CharField(max_length=200, blank=True)
    bio = models.TextField(blank=True)
    country = models.CharField(max_length=2, blank=True)
    languages = models.JSONField(default=list, blank=True)
    expertise = models.JSONField(default=list, blank=True)
    qualifications = models.TextField(blank=True)
    experience = models.TextField(blank=True)
    linkedin_url = models.URLField(blank=True)
    website = models.URLField(blank=True)
    youtube_channel = models.URLField(blank=True)
    social_profiles = models.JSONField(default=dict, blank=True)
    photo = models.ImageField(upload_to='instructor_profiles/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    is_official = models.BooleanField(
        default=False,
        help_text='Zenda Official / first instructor (Rubiane).',
    )
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal('0.00'))
    rating_count = models.PositiveIntegerField(default=0)
    students_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_official', 'headline']

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        name = self.user.get_full_name().strip()
        return name or self.user.email or self.slug

    @property
    def is_approved(self):
        return self.status == self.STATUS_APPROVED

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.display_name) or f'instructor-{self.user_id}'
            slug = base
            n = 2
            while InstructorProfile.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)


class MentorProfile(models.Model):
    STATUS_CHOICES = InstructorProfile.STATUS_CHOICES

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mentor_profile',
    )
    instructor = models.ForeignKey(
        InstructorProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mentor_profiles',
    )
    headline = models.CharField(max_length=200, blank=True)
    bio = models.TextField(blank=True)
    timezone = models.CharField(max_length=64, default='Africa/Luanda')
    languages = models.JSONField(default=list, blank=True)
    subjects = models.JSONField(default=list, blank=True)
    meeting_method = models.CharField(max_length=40, default='video', help_text='video, chat, in_person')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal('0.00'))
    rating_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Mentor {self.user_id}'

    @property
    def is_approved(self):
        return self.status == InstructorProfile.STATUS_APPROVED


class TutorProfile(models.Model):
    STATUS_CHOICES = InstructorProfile.STATUS_CHOICES

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutor_profile',
    )
    instructor = models.ForeignKey(
        InstructorProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tutor_profiles',
    )
    headline = models.CharField(max_length=200, blank=True)
    bio = models.TextField(blank=True)
    timezone = models.CharField(max_length=64, default='Africa/Luanda')
    languages = models.JSONField(default=list, blank=True)
    subjects = models.JSONField(default=list, blank=True)
    hourly_rate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    currency = models.CharField(max_length=3, default='USD')
    session_duration_minutes = models.PositiveIntegerField(default=60)
    meeting_method = models.CharField(max_length=40, default='video')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal('0.00'))
    rating_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Tutor {self.user_id}'

    @property
    def is_approved(self):
        return self.status == InstructorProfile.STATUS_APPROVED


class PayoutMethod(models.Model):
    METHOD_BANK = 'bank_transfer'
    METHOD_MOBILE = 'mobile_money'
    METHOD_OTHER = 'other'
    METHOD_CHOICES = [
        (METHOD_BANK, 'Bank transfer'),
        (METHOD_MOBILE, 'Mobile money'),
        (METHOD_OTHER, 'Other'),
    ]

    instructor = models.ForeignKey(
        InstructorProfile,
        on_delete=models.CASCADE,
        related_name='payout_methods',
    )
    method = models.CharField(max_length=32, choices=METHOD_CHOICES, default=METHOD_BANK)
    payee_name = models.CharField(max_length=200)
    iban = models.CharField(max_length=64, blank=True)
    bank_name = models.CharField(max_length=120, blank=True)
    mobile_wallet = models.CharField(max_length=80, blank=True)
    currency = models.CharField(max_length=3, default='AOA')
    is_default = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f'{self.payee_name} ({self.method})'


class EducationBillingSettings(models.Model):
    """Singleton: marketplace commission. PK is always 1. Do not hard-code 20% in code paths."""

    platform_commission_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('20.00'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
    )
    default_currency = models.CharField(max_length=3, default='USD')
    payout_hold_days = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_education_billing_settings',
    )

    class Meta:
        verbose_name = 'Education billing settings'
        verbose_name_plural = 'Education billing settings'

    def __str__(self):
        return 'Education billing settings'

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class EducationPayment(models.Model):
    PRODUCT_COURSE = 'course'
    PRODUCT_TUTORIAL = 'tutorial'
    PRODUCT_MENTORSHIP = 'mentorship'
    PRODUCT_TUTORING = 'tutoring'
    PRODUCT_CHOICES = [
        (PRODUCT_COURSE, 'Course'),
        (PRODUCT_TUTORIAL, 'Tutorial'),
        (PRODUCT_MENTORSHIP, 'Mentorship'),
        (PRODUCT_TUTORING, 'Tutoring'),
    ]

    METHOD_PROOF = 'proof_of_payment'
    METHOD_IAP = 'apple_iap'
    METHOD_CARD = 'card'
    METHOD_FREE = 'free'
    METHOD_POINTS = 'points'
    METHOD_CHOICES = [
        (METHOD_PROOF, 'Proof of payment'),
        (METHOD_IAP, 'Apple IAP'),
        (METHOD_CARD, 'Card'),
        (METHOD_FREE, 'Free'),
        (METHOD_POINTS, 'Points'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_COMPLETED = 'completed'
    STATUS_REFUNDED = 'refunded'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_REFUNDED, 'Refunded'),
        (STATUS_FAILED, 'Failed'),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='education_payments',
    )
    instructor = models.ForeignKey(
        InstructorProfile,
        on_delete=models.PROTECT,
        related_name='education_payments',
    )
    product_type = models.CharField(max_length=20, choices=PRODUCT_CHOICES)
    product_id = models.PositiveIntegerField()
    product_title = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    platform_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    instructor_net = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('20.00'))
    payment_method = models.CharField(max_length=32, choices=METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    enrollment_id = models.PositiveIntegerField(null=True, blank=True)
    external_reference = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['instructor', 'status']),
            models.Index(fields=['student', 'created_at']),
            models.Index(fields=['product_type', 'product_id']),
        ]

    def __str__(self):
        return f'{self.product_type}:{self.product_id} {self.amount} {self.currency}'


class PayoutRequest(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_PAID = 'paid'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_PAID, 'Paid'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    instructor = models.ForeignKey(
        InstructorProfile,
        on_delete=models.CASCADE,
        related_name='payout_requests',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    method = models.CharField(max_length=32, default=PayoutMethod.METHOD_BANK)
    payee_snapshot = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_payouts',
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-requested_at']

    def __str__(self):
        return f'Payout {self.amount} {self.currency} ({self.status})'


class TutorOffering(models.Model):
    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name='offerings')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    subjects = models.JSONField(default=list, blank=True)
    hourly_rate = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    session_duration_minutes = models.PositiveIntegerField(default=60)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class TutorAvailability(models.Model):
    """Weekly recurring availability in the tutor timezone."""

    WEEKDAYS = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]

    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name='availability')
    weekday = models.PositiveSmallIntegerField(choices=WEEKDAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['weekday', 'start_time']
        unique_together = ['tutor', 'weekday', 'start_time', 'end_time']

    def __str__(self):
        return f'{self.tutor_id} {self.weekday} {self.start_time}-{self.end_time}'


class TutorBooking(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    MEETING_ZOOM = 'zoom'
    MEETING_MEET = 'google_meet'
    MEETING_DAILY = 'daily'
    MEETING_CUSTOM = 'custom'
    MEETING_CHOICES = [
        (MEETING_ZOOM, 'Zoom'),
        (MEETING_MEET, 'Google Meet'),
        (MEETING_DAILY, 'Daily.co'),
        (MEETING_CUSTOM, 'Custom'),
    ]

    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name='bookings')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutor_bookings',
    )
    offering = models.ForeignKey(
        TutorOffering,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    meeting_provider = models.CharField(max_length=32, choices=MEETING_CHOICES, default=MEETING_CUSTOM)
    meeting_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['starts_at']
        constraints = [
            models.UniqueConstraint(
                fields=['tutor', 'starts_at'],
                name='uniq_tutor_booking_slot',
            ),
        ]

    def __str__(self):
        return f'Tutor booking {self.tutor_id} @ {self.starts_at}'


class SavedItem(models.Model):
    KIND_COURSE = 'course'
    KIND_TUTOR = 'tutor'
    KIND_MENTOR = 'mentor'
    KIND_CHOICES = [
        (KIND_COURSE, 'Course'),
        (KIND_TUTOR, 'Tutor'),
        (KIND_MENTOR, 'Mentor'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_education_items',
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    object_id = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'kind', 'object_id']
        ordering = ['-created_at']


LOCALE_CHOICES = [(code, code) for code in SUPPORTED_LOCALES]
