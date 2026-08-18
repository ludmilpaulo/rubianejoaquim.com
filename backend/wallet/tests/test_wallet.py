"""Wallet API tests — sandbox MockProvider only."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from wallet.models import PaymentTransaction
from wallet.services import get_or_create_wallet, process_transfer

User = get_user_model()


class WalletLedgerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='walletuser', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_deposit_creates_ledger_entry(self):
        tx = process_transfer(
            self.user,
            amount=Decimal('1000'),
            currency='AOA',
            direction='credit',
            transaction_type='deposit',
            idempotency_key='dep-001',
        )
        self.assertEqual(tx.status, 'COMPLETED')
        wallet = get_or_create_wallet(self.user)
        account = wallet.accounts.get(currency='AOA')
        self.assertEqual(account.balance, Decimal('1000.00'))

    def test_idempotency_prevents_duplicate(self):
        process_transfer(
            self.user,
            amount=Decimal('500'),
            currency='AOA',
            direction='credit',
            transaction_type='deposit',
            idempotency_key='dep-dup',
        )
        tx2 = process_transfer(
            self.user,
            amount=Decimal('500'),
            currency='AOA',
            direction='credit',
            transaction_type='deposit',
            idempotency_key='dep-dup',
        )
        self.assertEqual(PaymentTransaction.objects.filter(idempotency_key='dep-dup').count(), 1)
        self.assertEqual(tx2.status, 'COMPLETED')

    def test_insufficient_balance_fails(self):
        tx = process_transfer(
            self.user,
            amount=Decimal('100'),
            currency='AOA',
            direction='debit',
            transaction_type='withdrawal',
            idempotency_key='wdr-fail',
        )
        self.assertEqual(tx.status, 'FAILED')

    @override_settings(WALLET_LIVE_ENABLED=False)
    def test_wallet_status_sandbox(self):
        response = self.client.get('/api/wallet/status/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['live_enabled'])
