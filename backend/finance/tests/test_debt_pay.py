"""Debt payment FX ledger: original currency preserved, snapshot rate stored."""
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from finance.models import Debt, DebtPayment, ExchangeRate

User = get_user_model()


def _seed_rates():
    now = timezone.now() - timedelta(minutes=15)
    pairs = {
        'USD': Decimal('1'),
        'ZAR': Decimal('18.50'),
        'AOA': Decimal('900'),
        'EUR': Decimal('0.92'),
        'GBP': Decimal('0.78'),
    }
    for code, rate in pairs.items():
        ExchangeRate.objects.create(
            base_currency='USD',
            target_currency=code,
            rate=rate,
            source='open.er-api.com',
            provider_updated_at=now,
        )
    return now


class DebtPayFxTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='debtor', email='debtor@test.com', password='pass12345'
        )
        self.other = User.objects.create_user(
            username='other', email='other@test.com', password='pass12345'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.rate_ts = _seed_rates()
        self.debt = Debt.objects.create(
            user=self.user,
            creditor='Bank',
            total_amount=Decimal('10000.00'),
            paid_amount=Decimal('0'),
            currency='USD',
            due_date=timezone.now().date(),
        )

    def _pay(self, debt_id, **payload):
        url = reverse('debt-pay', kwargs={'pk': debt_id})
        return self.client.post(url, payload, format='json')

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_zar_payment_on_usd_debt_stores_snapshot(self, _refresh):
        # 1 USD = 18.50 ZAR → R5000 = 5000/18.50 = 270.27 USD
        response = self._pay(self.debt.id, amount='5000', currency='ZAR')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.debt.refresh_from_db()
        self.assertEqual(self.debt.currency, 'USD')
        self.assertEqual(self.debt.total_amount, Decimal('10000.00'))
        payment = DebtPayment.objects.get(debt=self.debt)
        self.assertEqual(payment.amount, Decimal('5000.00'))
        self.assertEqual(payment.currency, 'ZAR')
        self.assertEqual(payment.converted_amount, Decimal('270.27'))
        self.assertEqual(payment.exchange_rate, Decimal('0.05405405'))
        self.assertEqual(payment.exchange_rate_source, 'open.er-api.com')
        self.assertIsNotNone(payment.exchange_rate_timestamp)
        self.assertEqual(payment.status, 'partial')
        self.assertEqual(self.debt.paid_amount, Decimal('270.27'))
        nested = response.data['payments'][0]
        self.assertEqual(nested['currency'], 'ZAR')
        self.assertEqual(nested['converted_amount'], '270.27')
        self.assertEqual(nested['exchange_rate_source'], 'open.er-api.com')

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_eur_payment_on_zar_debt(self, _refresh):
        zar_debt = Debt.objects.create(
            user=self.user,
            creditor='Landlord',
            total_amount=Decimal('20000.00'),
            currency='ZAR',
            due_date=timezone.now().date(),
        )
        # EUR→ZAR via USD: 1 EUR = 18.50/0.92 ZAR
        response = self._pay(zar_debt.id, amount='500', currency='EUR')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment = DebtPayment.objects.get(debt=zar_debt)
        self.assertEqual(payment.currency, 'EUR')
        zar_debt.refresh_from_db()
        self.assertEqual(zar_debt.currency, 'ZAR')
        self.assertEqual(zar_debt.paid_amount, payment.converted_amount)
        self.assertGreater(payment.converted_amount, Decimal('0'))

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_same_currency_payment(self, _refresh):
        response = self._pay(self.debt.id, amount='1000', currency='USD')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment = DebtPayment.objects.get(debt=self.debt)
        self.assertEqual(payment.converted_amount, Decimal('1000.00'))
        self.assertEqual(payment.exchange_rate, Decimal('1'))
        self.assertEqual(payment.currency, 'USD')

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_aoa_to_usd_and_usd_to_aoa(self, _refresh):
        aoa_debt = Debt.objects.create(
            user=self.user,
            creditor='Kwanza loan',
            total_amount=Decimal('900000.00'),
            currency='AOA',
            due_date=timezone.now().date(),
        )
        r1 = self._pay(aoa_debt.id, amount='100', currency='USD')
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        p1 = DebtPayment.objects.filter(debt=aoa_debt).latest('id')
        self.assertEqual(p1.converted_amount, Decimal('90000.00'))

        r2 = self._pay(self.debt.id, amount='900', currency='AOA')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        p2 = DebtPayment.objects.filter(debt=self.debt).latest('id')
        self.assertEqual(p2.amount, Decimal('900.00'))
        self.assertEqual(p2.currency, 'AOA')
        self.assertEqual(p2.converted_amount, Decimal('1.00'))

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_overpay_rejected(self, _refresh):
        self.debt.paid_amount = Decimal('9990.00')
        self.debt.save()
        response = self._pay(self.debt.id, amount='100', currency='USD')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'overpay')

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_fx_unavailable(self, _refresh):
        response = self._pay(self.debt.id, amount='10', currency='JPY')
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data.get('code'), 'fx_unavailable')

    def test_invalid_currency_code(self):
        response = self._pay(self.debt.id, amount='10', currency='12')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'invalid_currency')

    def test_ownership(self):
        self.client.force_authenticate(user=self.other)
        response = self._pay(self.debt.id, amount='10', currency='USD')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_full_payment_marks_paid(self, _refresh):
        response = self._pay(self.debt.id, amount='10000', currency='USD')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.debt.refresh_from_db()
        self.assertEqual(self.debt.status, 'paid')
        payment = DebtPayment.objects.get(debt=self.debt)
        self.assertEqual(payment.status, 'paid')
