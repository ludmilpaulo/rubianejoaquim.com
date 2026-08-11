"""Tests for market FX cache, convert API, and cross-currency budget spent."""
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from finance.fx import convert_amount, get_fx_meta, is_rate_stale, refresh_exchange_rates, sum_in_currency
from finance.models import Budget, Category, ExchangeRate, PersonalExpense

User = get_user_model()


class FxUnitTests(TestCase):
    def setUp(self):
        now = timezone.now()
        ExchangeRate.objects.create(
            base_currency='USD',
            target_currency='USD',
            rate=Decimal('1'),
            source='open.er-api.com',
            provider_updated_at=now,
        )
        ExchangeRate.objects.create(
            base_currency='USD',
            target_currency='ZAR',
            rate=Decimal('18.00'),
            source='open.er-api.com',
            provider_updated_at=now,
        )
        ExchangeRate.objects.create(
            base_currency='USD',
            target_currency='AOA',
            rate=Decimal('900.00'),
            source='open.er-api.com',
            provider_updated_at=now,
        )

    def test_convert_zar_to_usd(self):
        result = convert_amount(Decimal('180'), 'ZAR', 'USD')
        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result['converted_amount'], Decimal('10.00'))
        self.assertEqual(result['currency'], 'ZAR')
        self.assertEqual(result['display_currency'], 'USD')
        self.assertEqual(result['source'], 'open.er-api.com')
        self.assertFalse(result['stale'])

    def test_sum_mixed_currencies(self):
        total = sum_in_currency(
            [
                (Decimal('180'), 'ZAR'),  # 10 USD
                (Decimal('900'), 'AOA'),  # 1 USD
            ],
            'USD',
        )
        self.assertEqual(total, Decimal('11.00'))

    def test_seed_rates_are_stale(self):
        ExchangeRate.objects.all().delete()
        ExchangeRate.objects.create(
            base_currency='USD',
            target_currency='EUR',
            rate=Decimal('0.9'),
            source='seed',
            provider_updated_at=timezone.now(),
        )
        self.assertTrue(is_rate_stale())
        meta = get_fx_meta()
        self.assertTrue(meta['stale'])
        self.assertEqual(meta['source'], 'seed')

    def test_refresh_skips_when_fresh(self):
        with patch('finance.fx.fetch_live_usd_rates') as mocked:
            result = refresh_exchange_rates(force=False)
            mocked.assert_not_called()
            self.assertFalse(result['refreshed'])
            self.assertFalse(result['stale'])

    def test_refresh_failure_marks_stale(self):
        with patch('finance.fx.fetch_live_usd_rates', side_effect=RuntimeError('down')):
            result = refresh_exchange_rates(force=True)
            self.assertFalse(result['refreshed'])
            self.assertTrue(result['stale'])
            self.assertTrue(ExchangeRate.objects.filter(target_currency='ZAR').exists())


class ConvertApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        now = timezone.now()
        ExchangeRate.objects.create(
            base_currency='USD',
            target_currency='USD',
            rate=Decimal('1'),
            source='open.er-api.com',
            provider_updated_at=now,
        )
        ExchangeRate.objects.create(
            base_currency='USD',
            target_currency='ZAR',
            rate=Decimal('20'),
            source='open.er-api.com',
            provider_updated_at=now,
        )

    @patch('finance.fx.refresh_exchange_rates')
    def test_convert_endpoint_exposes_source_and_stale(self, _refresh):
        url = reverse('exchange-rate-convert')
        response = self.client.get(url, {'amount': '100', 'from': 'ZAR', 'to': 'USD'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['from'], 'ZAR')
        self.assertEqual(response.data['to'], 'USD')
        self.assertEqual(response.data['amount'], '5.00')
        self.assertIn('source', response.data)
        self.assertIn('stale', response.data)
        self.assertIn('rate_line', response.data)
        self.assertIn('updated_at', response.data)


class BudgetCrossCurrencyTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='fxuser', email='fx@test.com', password='pass12345')
        self.user.preferred_currency = 'AOA'
        self.user.save(update_fields=['preferred_currency'])
        now = timezone.now()
        ExchangeRate.objects.create(
            base_currency='USD', target_currency='USD', rate=Decimal('1'),
            source='open.er-api.com', provider_updated_at=now,
        )
        ExchangeRate.objects.create(
            base_currency='USD', target_currency='AOA', rate=Decimal('100'),
            source='open.er-api.com', provider_updated_at=now,
        )
        # 1 USD = 100 AOA → 10 USD expense = 1000 AOA in budget currency
        cat = Category.objects.create(name='Food', is_personal=True)
        self.budget = Budget.objects.create(
            user=self.user,
            category=cat,
            amount=Decimal('5000'),
            currency='AOA',
            month=timezone.now().month,
            year=timezone.now().year,
            period_type='monthly',
        )
        PersonalExpense.objects.create(
            user=self.user,
            category=cat,
            amount=Decimal('10.00'),
            currency='USD',
            description='Imported snack',
            date=timezone.now().date(),
        )

    def test_budget_spent_converts_expense_currency(self):
        spent = self.budget.spent
        self.assertEqual(spent, Decimal('1000.00'))
        # Original expense currency untouched
        exp = PersonalExpense.objects.get(description='Imported snack')
        self.assertEqual(exp.currency, 'USD')
        self.assertEqual(exp.amount, Decimal('10.00'))


class CreateWithCurrencyTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='curuser', email='c@test.com', password='pass12345')
        self.user.preferred_currency = 'ZAR'
        self.user.save(update_fields=['preferred_currency'])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        now = timezone.now() - timedelta(hours=1)
        ExchangeRate.objects.create(
            base_currency='USD', target_currency='ZAR', rate=Decimal('18'),
            source='open.er-api.com', provider_updated_at=now,
        )

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_expense_defaults_to_preferred_currency(self, _refresh):
        url = reverse('personal-expense-list')
        response = self.client.post(
            url,
            {
                'amount': '50.00',
                'description': 'Taxi',
                'date': timezone.now().date().isoformat(),
                'payment_method': 'cash',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['currency'], 'ZAR')
