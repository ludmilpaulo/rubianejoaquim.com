"""Wallet business logic — authoritative balance and idempotent operations."""
from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from wallet.models import LedgerEntry, PaymentTransaction, Wallet, WalletAccount, WalletAuditLog
from wallet.providers.mock import get_provider


def wallet_live_enabled() -> bool:
    return bool(getattr(settings, 'WALLET_LIVE_ENABLED', False))


def get_or_create_wallet(user) -> Wallet:
    wallet, _ = Wallet.objects.get_or_create(user=user)
    return wallet


def get_or_create_account(wallet: Wallet, currency: str) -> WalletAccount:
    account, _ = WalletAccount.objects.get_or_create(wallet=wallet, currency=currency.upper())
    return account


def _audit(user, action: str, tx: PaymentTransaction | None = None, details: dict | None = None):
    WalletAuditLog.objects.create(
        user=user,
        action=action,
        payment_transaction=tx,
        details=details or {},
    )


@transaction.atomic
def process_transfer(
    user,
    *,
    amount: Decimal,
    currency: str,
    direction: str,
    transaction_type: str,
    idempotency_key: str,
    provider_code: str = 'mock',
    beneficiary_id: int | None = None,
    metadata: dict | None = None,
) -> PaymentTransaction:
    existing = PaymentTransaction.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        return existing

    wallet = get_or_create_wallet(user)
    account = get_or_create_account(wallet, currency)
    meta = metadata or {}

    if direction == 'debit' and account.balance < amount:
        tx = PaymentTransaction.objects.create(
            user=user,
            wallet=wallet,
            wallet_account=account,
            transaction_type=transaction_type,
            status='FAILED',
            amount=amount,
            currency=currency.upper(),
            direction='debit',
            provider=provider_code,
            idempotency_key=idempotency_key,
            failure_reason='Insufficient balance',
            metadata=meta,
        )
        _audit(user, 'transfer_failed_insufficient', tx)
        return tx

    tx = PaymentTransaction.objects.create(
        user=user,
        wallet=wallet,
        wallet_account=account,
        transaction_type=transaction_type,
        status='PROCESSING',
        amount=amount,
        currency=currency.upper(),
        direction=direction,
        provider=provider_code if wallet_live_enabled() else 'mock',
        idempotency_key=idempotency_key,
        metadata=meta,
    )

    provider = get_provider(tx.provider)
    if transaction_type == 'deposit':
        result = provider.create_deposit(amount=amount, currency=currency, user_id=user.id, metadata=meta)
    elif transaction_type == 'withdrawal':
        result = provider.create_withdrawal(amount=amount, currency=currency, user_id=user.id, metadata=meta)
    else:
        ben_ref = str(beneficiary_id or '')
        result = provider.send_transfer(
            amount=amount, currency=currency, user_id=user.id, beneficiary_ref=ben_ref, metadata=meta
        )

    tx.provider_reference = result.provider_reference
    tx.status = result.status if result.success else 'FAILED'
    if not result.success:
        tx.failure_reason = result.message
    else:
        tx.completed_at = timezone.now()
        LedgerEntry.objects.create(
            wallet_account=account,
            payment_transaction=tx,
            amount=amount,
            currency=currency.upper(),
            direction=direction,
            status='completed' if tx.status == 'COMPLETED' else 'pending',
        )
    tx.save()
    _audit(user, f'{transaction_type}_{tx.status.lower()}', tx, {'provider': tx.provider})
    return tx


def handle_webhook(provider_code: str, payload: bytes, headers: dict) -> PaymentTransaction | None:
    provider = get_provider(provider_code)
    valid, data = provider.verify_webhook(payload, headers)
    if not valid:
        return None
    ref = data.get('provider_reference')
    if not ref:
        return None
    tx = PaymentTransaction.objects.filter(provider_reference=ref).first()
    if not tx:
        return None
    new_status = data.get('status', tx.status)
    tx.status = new_status
    if new_status == 'COMPLETED':
        tx.completed_at = timezone.now()
    tx.save(update_fields=['status', 'completed_at'])
    return tx
