"""Wallet ledger models — backend is source of truth for balances."""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.db import models

User = get_user_model()


class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    is_active = models.BooleanField(default=True)
    kyc_status = models.CharField(
        max_length=20,
        choices=[
            ('none', 'None'),
            ('pending', 'Pending'),
            ('verified', 'Verified'),
            ('rejected', 'Rejected'),
        ],
        default='none',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f'Wallet({self.user_id})'


class WalletAccount(models.Model):
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='accounts')
    currency = models.CharField(max_length=3)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['wallet', 'currency']

    @property
    def balance(self) -> Decimal:
        total = Decimal('0')
        for entry in self.ledger_entries.filter(status='completed'):
            if entry.direction == 'credit':
                total += entry.amount
            else:
                total -= entry.amount
        return total.quantize(Decimal('0.01'))


class PaymentProviderConfig(models.Model):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=False)
    is_sandbox = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.code


class Beneficiary(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='beneficiaries')
    name = models.CharField(max_length=200)
    country = models.CharField(max_length=2, default='AO')
    currency = models.CharField(max_length=3, default='AOA')
    account_reference = models.CharField(max_length=200)
    provider = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Beneficiaries'


class PaymentTransaction(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
        ('REVERSED', 'Reversed'),
        ('REFUNDED', 'Refunded'),
    ]
    TYPE_CHOICES = [
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('transfer', 'Transfer'),
        ('airtime', 'Airtime'),
        ('electricity', 'Electricity'),
        ('voucher', 'Voucher'),
        ('exchange', 'Exchange'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_transactions')
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    wallet_account = models.ForeignKey(WalletAccount, on_delete=models.PROTECT, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3)
    fee = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))
    direction = models.CharField(max_length=10, choices=[('credit', 'Credit'), ('debit', 'Debit')])
    provider = models.CharField(max_length=32, default='mock')
    provider_reference = models.CharField(max_length=200, blank=True)
    idempotency_key = models.CharField(max_length=64, unique=True)
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=8, null=True, blank=True)
    beneficiary = models.ForeignKey(Beneficiary, null=True, blank=True, on_delete=models.SET_NULL)
    metadata = models.JSONField(default=dict, blank=True)
    failure_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['provider_reference']),
        ]


class LedgerEntry(models.Model):
    wallet_account = models.ForeignKey(WalletAccount, on_delete=models.CASCADE, related_name='ledger_entries')
    payment_transaction = models.OneToOneField(
        PaymentTransaction, on_delete=models.CASCADE, related_name='ledger_entry'
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3)
    direction = models.CharField(max_length=10, choices=[('credit', 'Credit'), ('debit', 'Debit')])
    status = models.CharField(max_length=20, default='completed')
    created_at = models.DateTimeField(auto_now_add=True)


class WalletAuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallet_audit_logs')
    action = models.CharField(max_length=64)
    payment_transaction = models.ForeignKey(
        PaymentTransaction, null=True, blank=True, on_delete=models.SET_NULL
    )
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
