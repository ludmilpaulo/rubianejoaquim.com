from django.db import models
from django.conf import settings


class MentorshipPackage(models.Model):
    """Pacotes de mentoria — owned by a mentor in the marketplace."""

    TYPE_ONE_TIME = 'one_time'
    TYPE_RECURRING = 'recurring'
    TYPE_PROGRAMME = 'programme'
    TYPE_CHOICES = [
        (TYPE_ONE_TIME, 'One-time session'),
        (TYPE_RECURRING, 'Recurring'),
        (TYPE_PROGRAMME, 'Programme'),
    ]

    STATUS_DRAFT = 'draft'
    STATUS_PENDING = 'pending_review'
    STATUS_PUBLISHED = 'published'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PENDING, 'Pending review'),
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    duration_minutes = models.IntegerField(help_text="Duração em minutos (30, 60, etc.)")
    sessions = models.IntegerField(default=1, help_text="Número de sessões")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    mentor = models.ForeignKey(
        'instructors.MentorProfile',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='packages',
    )
    offering_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_ONE_TIME)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PUBLISHED)
    currency = models.CharField(max_length=3, default='USD')
    language = models.CharField(max_length=5, default='pt')
    programme_outline = models.JSONField(
        default=list,
        blank=True,
        help_text='[{week, title, description}] for programme offerings',
    )
    rejection_reason = models.TextField(blank=True)
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return self.title


class MentorshipRequest(models.Model):
    """Pedido de mentoria"""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovado'),
        ('scheduled', 'Agendado'),
        ('completed', 'Concluído'),
        ('cancelled', 'Cancelado'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='mentorship_requests', on_delete=models.CASCADE)
    package = models.ForeignKey(MentorshipPackage, related_name='requests', on_delete=models.CASCADE)
    objective = models.TextField(help_text="Objetivo da mentoria")
    availability = models.TextField(help_text="Disponibilidade do aluno")
    contact = models.CharField(max_length=200, help_text="Contacto (WhatsApp, email, etc.)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, help_text="Notas internas (admin)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.package.title} - {self.get_status_display()}"


class MentorshipPaymentProof(models.Model):
    """Comprovativo de pagamento da mentoria"""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovado'),
        ('rejected', 'Rejeitado'),
    ]

    request = models.OneToOneField(MentorshipRequest, related_name='payment_proof', on_delete=models.CASCADE)
    file = models.FileField(upload_to='mentorship_payment_proofs/')
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='reviewed_mentorship_payments',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Comprovativo Mentoria - {self.request}"


class MentorAvailability(models.Model):
    WEEKDAYS = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]

    mentor = models.ForeignKey(
        'instructors.MentorProfile',
        on_delete=models.CASCADE,
        related_name='availability',
    )
    weekday = models.PositiveSmallIntegerField(choices=WEEKDAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['weekday', 'start_time']
        unique_together = ['mentor', 'weekday', 'start_time', 'end_time']


class MentorshipSession(models.Model):
    STATUS_SCHEDULED = 'scheduled'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_SCHEDULED, 'Scheduled'),
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

    mentor = models.ForeignKey(
        'instructors.MentorProfile',
        on_delete=models.CASCADE,
        related_name='sessions',
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mentorship_sessions',
    )
    package = models.ForeignKey(
        MentorshipPackage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='session_records',
    )
    request = models.ForeignKey(
        MentorshipRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions',
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    meeting_provider = models.CharField(max_length=32, choices=MEETING_CHOICES, default=MEETING_CUSTOM)
    meeting_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['starts_at']
        constraints = [
            models.UniqueConstraint(
                fields=['mentor', 'starts_at'],
                name='uniq_mentor_session_slot',
            ),
        ]

    def __str__(self):
        return f'Session {self.mentor_id} @ {self.starts_at}'
