from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class MobileAppSubscription(models.Model):
    """
    Subscrição do utilizador ao app móvel Zenda.
    - 1 semana grátis ao subscrever
    - Depois subscrição mensal (admin ativa ao aprovar comprovativo)
    - Notificação 7/3/1 dias antes do fim do período
    """
    STATUS_CHOICES = [
        ('trial', 'Período de teste'),
        ('active', 'Ativo'),
        ('paused', 'Pausado'),
        ('expired', 'Expirado'),
        ('cancelled', 'Cancelado'),
    ]
    PLAN_TIER_CHOICES = [
        ('free', 'Free'),
        ('premium', 'Premium'),
        ('business', 'Business'),
        ('family', 'Family'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mobile_app_subscription'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    plan_tier = models.CharField(
        max_length=20,
        choices=PLAN_TIER_CHOICES,
        default='premium',
        help_text='Feature tier: free, premium, business, family',
    )
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
    paused_at = models.DateTimeField(null=True, blank=True)
    expiry_reminder_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Quando foi enviado o aviso de 3 dias antes do fim'
    )
    reminder_7d_sent_at = models.DateTimeField(null=True, blank=True)
    reminder_3d_sent_at = models.DateTimeField(null=True, blank=True)
    reminder_1d_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Subscrição App Móvel'
        verbose_name_plural = 'Subscrições App Móvel'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['plan_tier']),
            models.Index(fields=['subscription_ends_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.get_status_display()}"

    def save(self, *args, **kwargs):
        if not self.pk and not self.trial_ends_at:
            self.trial_ends_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def has_access(self):
        """Utilizador tem acesso ao app (em trial ou subscrição ativa)."""
        if self.status in ('cancelled', 'paused'):
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
        if self.status == 'paused':
            end = self.subscription_ends_at or self.trial_ends_at
        if not end:
            return None
        delta = end.date() - now.date()
        return delta.days if delta.days >= 0 else 0

    @property
    def renewal_at(self):
        if self.status == 'trial':
            return self.trial_ends_at
        return self.subscription_ends_at

    def display_status(self, latest_proof=None):
        """UI status, including payment_failed derived from rejected proofs."""
        if self.status == 'expired':
            proof = latest_proof
            if proof is None:
                proof = self.payment_proofs.order_by('-created_at').first()
            if proof is not None and proof.status == 'rejected':
                return 'payment_failed'
        return self.status


class MobileAppSubscriptionPaymentProof(models.Model):
    """Comprovativo de pagamento da subscrição mensal."""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovado'),
        ('rejected', 'Rejeitado'),
        ('info_requested', 'Informação pedida'),
    ]
    METHOD_CHOICES = [
        ('bank_transfer', 'Transferência bancária'),
        ('apple_iap', 'Apple In-App Purchase'),
        ('card', 'Cartão'),
        ('other', 'Outro'),
    ]

    subscription = models.ForeignKey(
        MobileAppSubscription,
        on_delete=models.CASCADE,
        related_name='payment_proofs'
    )
    file = models.FileField(upload_to='mobile_subscription_proofs/%Y/%m/')
    notes = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=8, default='AOA', blank=True)
    payment_method = models.CharField(max_length=32, choices=METHOD_CHOICES, default='bank_transfer')
    payment_reference = models.CharField(max_length=64, blank=True)
    info_request_message = models.TextField(blank=True)
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
        indexes = [
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"Comprovativo - {self.subscription.user.email} - {self.created_at.date()}"

    @property
    def transaction_id(self):
        return f'ZND-{self.id:06d}'


class SubscriptionAdminAuditLog(models.Model):
    """Immutable record of administrative actions on subscriptions and proofs."""

    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='subscription_admin_audit_logs',
    )
    action = models.CharField(max_length=64)
    subscription = models.ForeignKey(
        MobileAppSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    payment_proof = models.ForeignKey(
        MobileAppSubscriptionPaymentProof,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    customer_email = models.CharField(max_length=254, blank=True)
    result = models.CharField(max_length=20, default='success')
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=400, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Auditoria Admin Subscrição'
        verbose_name_plural = 'Auditorias Admin Subscrição'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['customer_email']),
        ]

    def __str__(self):
        return f'{self.action} {self.customer_email} {self.created_at}'


class SubscriptionBillingSettings(models.Model):
    """Singleton catalog prices and Angola bank details. PK is always 1."""

    monthly_price_aoa = models.DecimalField(max_digits=12, decimal_places=2, default=10000)
    monthly_price_zar = models.DecimalField(max_digits=12, decimal_places=2, default=180)
    iban = models.CharField(max_length=64, blank=True)
    payee_name = models.CharField(max_length=200, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_subscription_billing_settings',
    )

    class Meta:
        verbose_name = 'Definições de faturação'
        verbose_name_plural = 'Definições de faturação'

    def __str__(self):
        return 'Subscription billing settings'


class PaymentGatewayConfig(models.Model):
    """Admin-configurable payment gateway credentials. Secrets are encrypted at rest."""

    PROVIDER_IKHOKHA = 'ikhokha'
    PROVIDER_CHOICES = [
        (PROVIDER_IKHOKHA, 'iKhokha'),
    ]
    ENV_SANDBOX = 'sandbox'
    ENV_PRODUCTION = 'production'
    ENV_CHOICES = [
        (ENV_SANDBOX, 'Sandbox'),
        (ENV_PRODUCTION, 'Production'),
    ]

    provider = models.CharField(max_length=32, choices=PROVIDER_CHOICES, unique=True, default=PROVIDER_IKHOKHA)
    environment = models.CharField(max_length=16, choices=ENV_CHOICES, default=ENV_PRODUCTION)
    is_active = models.BooleanField(default=False)
    app_id = models.CharField(max_length=128, blank=True)
    app_secret = models.TextField(blank=True)
    webhook_secret = models.TextField(blank=True)
    api_base_url = models.URLField(
        max_length=300,
        blank=True,
        default='https://api.ikhokha.com/public-api/v1',
    )
    payment_url = models.URLField(
        max_length=300,
        blank=True,
        default='https://api.ikhokha.com/public-api/v1/api/payment',
    )
    callback_url = models.URLField(max_length=400, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_payment_gateway_configs',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuração de gateway'
        verbose_name_plural = 'Configurações de gateway'

    def __str__(self):
        return f'{self.provider} ({self.environment})'

    def save(self, *args, **kwargs):
        from .crypto import encrypt_secret

        if self.app_secret and not self.app_secret.startswith('gAAAA'):
            self.app_secret = encrypt_secret(self.app_secret)
        if self.webhook_secret and not self.webhook_secret.startswith('gAAAA'):
            self.webhook_secret = encrypt_secret(self.webhook_secret)
        super().save(*args, **kwargs)

    def get_app_secret(self) -> str:
        from .crypto import decrypt_secret
        if not self.app_secret:
            return ''
        if self.app_secret.startswith('gAAAA'):
            return decrypt_secret(self.app_secret)
        return self.app_secret

    def get_webhook_secret(self) -> str:
        from .crypto import decrypt_secret
        if not self.webhook_secret:
            return ''
        if self.webhook_secret.startswith('gAAAA'):
            return decrypt_secret(self.webhook_secret)
        return self.webhook_secret

    def app_id_masked(self) -> str:
        value = (self.app_id or '').strip()
        if len(value) <= 4:
            return '****' if value else ''
        return f'****{value[-4:]}'


class SubscriptionPayment(models.Model):
    """Canonical payment ledger for Zenda app subscriptions."""

    METHOD_PROOF = 'proof_of_payment'
    METHOD_CARD = 'card'
    METHOD_APPLE_IAP = 'apple_iap'
    METHOD_CHOICES = [
        (METHOD_PROOF, 'Proof of Payment'),
        (METHOD_CARD, 'Card'),
        (METHOD_APPLE_IAP, 'Apple In-App Purchase'),
    ]

    GATEWAY_NONE = 'none'
    GATEWAY_IKHOKHA = 'ikhokha'
    GATEWAY_APPLE = 'apple'
    GATEWAY_CHOICES = [
        (GATEWAY_NONE, 'None'),
        (GATEWAY_IKHOKHA, 'iKhokha'),
        (GATEWAY_APPLE, 'Apple'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_PENDING_VERIFICATION = 'pending_verification'
    STATUS_INFO_REQUESTED = 'info_requested'
    STATUS_PAID = 'paid'
    STATUS_FAILED = 'failed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_REJECTED = 'rejected'
    STATUS_REFUND_REQUESTED = 'refund_requested'
    STATUS_REFUNDED = 'refunded'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_PENDING_VERIFICATION, 'Pending verification'),
        (STATUS_INFO_REQUESTED, 'Info requested'),
        (STATUS_PAID, 'Paid'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_REFUND_REQUESTED, 'Refund requested'),
        (STATUS_REFUNDED, 'Refunded'),
    ]

    ALLOWED_TRANSITIONS = {
        STATUS_PENDING: {STATUS_PROCESSING, STATUS_PENDING_VERIFICATION, STATUS_FAILED, STATUS_CANCELLED},
        STATUS_PROCESSING: {STATUS_PAID, STATUS_FAILED, STATUS_CANCELLED},
        STATUS_PENDING_VERIFICATION: {STATUS_PAID, STATUS_REJECTED, STATUS_INFO_REQUESTED},
        STATUS_INFO_REQUESTED: {STATUS_PENDING_VERIFICATION, STATUS_PAID, STATUS_REJECTED},
        STATUS_PAID: {STATUS_REFUND_REQUESTED},
        STATUS_REFUND_REQUESTED: {STATUS_REFUNDED, STATUS_PAID},
        STATUS_FAILED: set(),
        STATUS_CANCELLED: set(),
        STATUS_REJECTED: set(),
        STATUS_REFUNDED: set(),
    }

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription_payments',
    )
    subscription = models.ForeignKey(
        MobileAppSubscription,
        on_delete=models.CASCADE,
        related_name='payments',
    )
    plan_tier = models.CharField(max_length=20, default='premium')
    country = models.CharField(max_length=2, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8)
    plan_amount = models.DecimalField(max_digits=12, decimal_places=2)
    plan_currency = models.CharField(max_length=8)
    method = models.CharField(max_length=32, choices=METHOD_CHOICES)
    gateway = models.CharField(max_length=32, choices=GATEWAY_CHOICES, default=GATEWAY_NONE)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_PENDING)
    external_id = models.CharField(max_length=64, unique=True)
    paylink_id = models.CharField(max_length=128, blank=True, db_index=True)
    paylink_url = models.URLField(max_length=500, blank=True)
    provider_status = models.CharField(max_length=64, blank=True)
    provider_transaction_id = models.CharField(max_length=128, blank=True)
    proof = models.ForeignKey(
        MobileAppSubscriptionPaymentProof,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ledger_payments',
    )
    failure_reason = models.CharField(max_length=240, blank=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Pagamento de subscrição'
        verbose_name_plural = 'Pagamentos de subscrição'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['method', 'status']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f'{self.external_id} {self.status}'

    @property
    def transaction_id(self):
        if self.provider_transaction_id:
            return self.provider_transaction_id
        if self.paylink_id:
            return self.paylink_id
        if self.proof_id:
            return self.proof.transaction_id
        return self.external_id

    def can_transition(self, new_status: str) -> bool:
        if self.status == new_status:
            return True
        return new_status in self.ALLOWED_TRANSITIONS.get(self.status, set())

    def transition(self, new_status: str, *, save=True, **extra):
        if not self.can_transition(new_status):
            raise InvalidPaymentTransition(self.status, new_status)
        self.status = new_status
        for key, value in extra.items():
            setattr(self, key, value)
        if save:
            self.save()
        return self


class InvalidPaymentTransition(Exception):
    def __init__(self, current, target):
        self.current = current
        self.target = target
        super().__init__(f'Cannot transition payment from {current} to {target}')

