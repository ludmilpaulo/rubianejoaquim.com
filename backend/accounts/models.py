from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import secrets


class User(AbstractUser):
    """Custom User model"""
    email = models.EmailField(unique=True, blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True, help_text="Endereço completo")
    referral_code = models.CharField(max_length=20, unique=True, blank=True, null=True, help_text="Código de referência único")
    referred_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='referrals', help_text="Usuário que indicou este usuário")
    preferred_locale = models.CharField(
        max_length=5,
        default='pt',
        blank=True,
        help_text='pt, en, fr, es — blank means follow device language',
    )
    preferred_currency = models.CharField(max_length=3, default='AOA')
    onboarding_completed = models.BooleanField(default=False)
    onboarding_goals = models.JSONField(default=list, blank=True, help_text='Goal ids from onboarding: save, debt, business, learn, budget')
    finance_level = models.CharField(
        max_length=20,
        default='beginner',
        blank=True,
        help_text='beginner, intermediate, advanced',
    )
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    profile_image_url = models.URLField(max_length=500, blank=True, help_text='External profile image from social providers')
    dark_mode = models.BooleanField(default=False)
    notification_prefs = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            'Notification preferences: enabled, budget_warnings, budget_exceeded, '
            'debt_reminders, savings_reminders, monthly_summary, goal_reminders'
        ),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        if not self.referral_code:
            self.referral_code = self.generate_referral_code()
        super().save(*args, **kwargs)

    def generate_referral_code(self):
        """Gera um código de referência único"""
        while True:
            code = secrets.token_urlsafe(8)[:12].upper()
            if not User.objects.filter(referral_code=code).exists():
                return code

    def has_usable_password_login(self):
        return self.has_usable_password()

    def __str__(self):
        return self.email or self.username


class SocialAccount(models.Model):
    """Linked OAuth provider identity for a user. Unique per provider + provider_user_id."""

    PROVIDER_GOOGLE = 'google'
    PROVIDER_FACEBOOK = 'facebook'
    PROVIDER_TIKTOK = 'tiktok'
    PROVIDER_APPLE = 'apple'
    PROVIDER_CHOICES = [
        (PROVIDER_GOOGLE, 'Google'),
        (PROVIDER_FACEBOOK, 'Facebook'),
        (PROVIDER_TIKTOK, 'TikTok'),
        (PROVIDER_APPLE, 'Apple'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='social_accounts',
    )
    provider = models.CharField(max_length=32, choices=PROVIDER_CHOICES)
    provider_user_id = models.CharField(max_length=255)
    provider_email = models.EmailField(blank=True, null=True)
    provider_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['provider', 'provider_user_id'],
                name='uniq_social_provider_user',
            ),
            models.UniqueConstraint(
                fields=['user', 'provider'],
                name='uniq_user_provider',
            ),
        ]
        indexes = [
            models.Index(fields=['provider', 'provider_user_id']),
        ]

    def __str__(self):
        return f'{self.provider}:{self.provider_user_id} → {self.user_id}'


class AppReferralEvent(models.Model):
    """
    Tracks share/download/register funnel for Zenda app referrals.
    Architecture for future rewards — click → install → register.
    """
    EVENT_CLICK = 'click'
    EVENT_INSTALL = 'install'
    EVENT_REGISTER = 'register'
    EVENT_CHOICES = [
        (EVENT_CLICK, 'Download link click'),
        (EVENT_INSTALL, 'App open / install attributed'),
        (EVENT_REGISTER, 'User registered'),
    ]

    referral_code = models.CharField(max_length=20, db_index=True)
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='app_referral_events_sent',
    )
    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES, default=EVENT_CLICK)
    platform = models.CharField(max_length=20, blank=True, help_text='ios | android | web | unknown')
    user_agent = models.CharField(max_length=500, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='app_referral_events_received',
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['referral_code', 'event_type']),
        ]

    def __str__(self):
        return f'{self.event_type}:{self.referral_code}'


class OAuthState(models.Model):
    """Short-lived CSRF state for OAuth redirect flows (TikTok, etc.)."""

    PURPOSE_LOGIN = 'login'
    PURPOSE_LINK = 'link'
    PURPOSE_CHOICES = [
        (PURPOSE_LOGIN, 'Login'),
        (PURPOSE_LINK, 'Link'),
    ]

    state = models.CharField(max_length=64, unique=True, db_index=True)
    provider = models.CharField(max_length=32)
    purpose = models.CharField(max_length=16, choices=PURPOSE_CHOICES, default=PURPOSE_LOGIN)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='oauth_states',
    )
    redirect_path = models.CharField(max_length=255, blank=True, default='/area-do-aluno')
    code_verifier = models.CharField(max_length=128, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)

    def is_valid(self):
        if self.consumed_at is not None:
            return False
        return timezone.now() < self.expires_at

    def consume(self):
        self.consumed_at = timezone.now()
        self.save(update_fields=['consumed_at'])
