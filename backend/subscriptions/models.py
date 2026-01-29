from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class MobileAppSubscription(models.Model):
    """
    Subscrição do utilizador ao app móvel Zenda.
    - 1 semana grátis ao subscrever
    - Depois subscrição mensal (admin ativa ao aprovar comprovativo)
    - Notificação 3 dias antes do fim do período
    """
    STATUS_CHOICES = [
        ('trial', 'Período de teste'),
        ('active', 'Ativo'),
        ('expired', 'Expirado'),
        ('cancelled', 'Cancelado'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mobile_app_subscription'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    trial_ends_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Fim da semana grátis (7 dias após subscrever)'
    )
    subscription_ends_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Fim do período pago atual (renovado quando admin aprova pagamento)'
    )
    expiry_reminder_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Quando foi enviado o aviso de 3 dias antes do fim'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Subscrição App Móvel'
        verbose_name_plural = 'Subscrições App Móvel'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.get_status_display()}"

    def save(self, *args, **kwargs):
        if not self.pk and not self.trial_ends_at:
            self.trial_ends_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def has_access(self):
        """Utilizador tem acesso ao app (em trial ou subscrição ativa)."""
        if self.status == 'cancelled':
            return False
        now = timezone.now()
        if self.status == 'trial' and self.trial_ends_at:
            return now < self.trial_ends_at
        if self.status == 'active' and self.subscription_ends_at:
            return now < self.subscription_ends_at
        if self.status == 'expired':
            return False
        return self.status in ('trial', 'active')

    @property
    def days_until_expiry(self):
        """Dias até expirar (trial ou subscrição)."""
        now = timezone.now()
        end = self.subscription_ends_at if self.status == 'active' else self.trial_ends_at
        if not end:
            return None
        delta = end.date() - now.date()
        return delta.days if delta.days >= 0 else 0


class MobileAppSubscriptionPaymentProof(models.Model):
    """Comprovativo de pagamento da subscrição mensal."""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovado'),
        ('rejected', 'Rejeitado'),
    ]

    subscription = models.ForeignKey(
        MobileAppSubscription,
        on_delete=models.CASCADE,
        related_name='payment_proofs'
    )
    file = models.FileField(upload_to='mobile_subscription_proofs/%Y/%m/')
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_mobile_subscription_proofs'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Comprovativo Subscrição App'
        verbose_name_plural = 'Comprovativos Subscrição App'
        ordering = ['-created_at']

    def __str__(self):
        return f"Comprovativo - {self.subscription.user.email} - {self.created_at.date()}"
