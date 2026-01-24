from django.contrib.auth.models import AbstractUser
from django.db import models
import secrets


class User(AbstractUser):
    """Custom User model"""
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True, help_text="Endereço completo")
    referral_code = models.CharField(max_length=20, unique=True, blank=True, null=True, help_text="Código de referência único")
    referred_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='referrals', help_text="Usuário que indicou este usuário")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def save(self, *args, **kwargs):
        if not self.referral_code:
            self.referral_code = self.generate_referral_code()
        super().save(*args, **kwargs)

    def generate_referral_code(self):
        """Gera um código de referência único"""
        while True:
            code = secrets.token_urlsafe(8)[:12].upper()
            if not User.objects.filter(referral_code=code).exists():
                return code

    def __str__(self):
        return self.email
