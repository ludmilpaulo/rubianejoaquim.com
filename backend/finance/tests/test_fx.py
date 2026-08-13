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

from finance.fx import (
    convert_amount,
    fetch_live_usd_rates,
    fetch_usd_rates_open_er,
    get_fx_meta,
    is_rate_stale,
    refresh_exchange_rates,
    sum_in_currency,
)
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
        ExchangeRate.objects.create(
            base_currency='USD',
            target_currency='EUR',
            rate=Decimal('0.90'),
            source='open.er-api.com',
            provider_updated_at=now,
        )
        ExchangeRate.objects.create(
            base_currency='USD',
            target_currency='GBP',
            rate=Decimal('0.80'),
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

    def test_old_provider_clock_is_not_stale_if_recently_fetched(self):
        """Daily APIs often have quote timestamps > TTL hours old; our write time is what matters."""
        old_quote = timezone.now() - timedelta(hours=10)
        ExchangeRate.objects.all().update(provider_updated_at=old_quote)
        self.assertFalse(is_rate_stale())
        meta = get_fx_meta()
        self.assertFalse(meta['stale'])
        self.assertIn(meta['freshness'], ('live', 'cached'))

    def test_reverse_and_cross_pairs(self):
        pairs = [
            (Decimal('100'), 'USD', 'AOA', Decimal('90000.00')),
            (Decimal('900'), 'AOA', 'USD', Decimal('1.00')),
            (Decimal('100'), 'USD', 'ZAR', Decimal('1800.00')),
            (Decimal('180'), 'ZAR', 'USD', Decimal('10.00')),
            (Decimal('900'), 'AOA', 'ZAR', Decimal('18.00')),
            (Decimal('18'), 'ZAR', 'AOA', Decimal('900.00')),
            (Decimal('100'), 'EUR', 'AOA', Decimal('100000.00')),
            (Decimal('900'), 'AOA', 'EUR', Decimal('0.90')),
            (Decimal('100'), 'EUR', 'USD', Decimal('111.11')),
            (Decimal('90'), 'USD', 'EUR', Decimal('81.00')),
            (Decimal('100'), 'EUR', 'ZAR', Decimal('2000.00')),
            (Decimal('18'), 'ZAR', 'EUR', Decimal('0.90')),
            (Decimal('80'), 'GBP', 'USD', Decimal('100.00')),
            (Decimal('100'), 'USD', 'GBP', Decimal('80.00')),
        ]
        for amount, src, dst, expected in pairs:
            result = convert_amount(amount, src, dst)
            self.assertIsNotNone(result, f'{src}->{dst}')
            assert result is not None
            self.assertEqual(result['converted_amount'], expected, f'{src}->{dst}')
            self.assertEqual(result['currency'], src)
            self.assertEqual(result['display_currency'], dst)

    def test_decimal_and_large_values(self):
        result = convert_amount(Decimal('10.50'), 'USD', 'ZAR')
        assert result is not None
        self.assertEqual(result['converted_amount'], Decimal('189.00'))
        result = convert_amount(Decimal('0.50'), 'USD', 'ZAR')
        assert result is not None
        self.assertEqual(result['converted_amount'], Decimal('9.00'))
        result = convert_amount(Decimal('1250.75'), 'USD', 'ZAR')
        assert result is not None
        self.assertEqual(result['converted_amount'], Decimal('22513.50'))
        result = convert_amount(Decimal('1000000'), 'USD', 'AOA')
        assert result is not None
        self.assertEqual(result['converted_amount'], Decimal('900000000.00'))

    def test_missing_pair_returns_none(self):
        self.assertIsNone(convert_amount(Decimal('10'), 'USD', 'JPY'))

    def test_classify_unavailable_when_empty(self):
        ExchangeRate.objects.all().delete()
        self.assertTrue(is_rate_stale())
        self.assertEqual(get_fx_meta()['freshness'], 'unavailable')

    def test_refresh_failure_marks_stale(self):
        with patch('finance.fx.fetch_live_usd_rates', side_effect=RuntimeError('down')):
            result = refresh_exchange_rates(force=True)
            self.assertFalse(result['refreshed'])
            self.assertTrue(result['stale'])
            self.assertTrue(ExchangeRate.objects.filter(target_currency='ZAR').exists())

    def test_market_closed_when_quote_date_is_yesterday(self):
        yesterday = timezone.now() - timedelta(days=1)
        ExchangeRate.objects.all().update(provider_updated_at=yesterday)
        meta = get_fx_meta()
        self.assertTrue(meta['market_closed'])
        self.assertIn(meta['freshness'], ('live', 'cached'))
        old = timezone.now() - timedelta(hours=25)
        ExchangeRate.objects.all().update(updated_at=old)
        self.assertTrue(is_rate_stale())
        self.assertEqual(get_fx_meta()['freshness'], 'stale')

    def test_provider_parse_open_er(self):
        payload = {
            'result': 'success',
            'time_last_update_unix': 1773360000,
            'rates': {'AOA': 923.71, 'ZAR': 16.14, 'EUR': 0.87, 'GBP': 0.74, 'USD': 1},
        }
        with patch('finance.fx._http_get_json', return_value=payload):
            rates, source, ts = fetch_usd_rates_open_er()
        self.assertEqual(source, 'open.er-api.com')
        self.assertEqual(rates['AOA'], Decimal('923.71'))
        self.assertIsNotNone(ts)

    def test_all_providers_timeout(self):
        with patch('finance.fx._http_get_json', side_effect=TimeoutError('timed out')):
            with self.assertRaises(RuntimeError):
                fetch_live_usd_rates()


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
        self.refresh_patcher = patch(
            'finance.fx.refresh_exchange_rates',
            return_value={
                'refreshed': False,
                'stale': False,
                'source': 'open.er-api.com',
                'freshness': 'live',
            },
        )
        self.refresh_patcher.start()
        self.addCleanup(self.refresh_patcher.stop)

    def test_convert_endpoint_exposes_source_and_stale(self):
        url = reverse('exchange-rate-convert')
        response = self.client.get(url, {'amount': '100', 'from': 'ZAR', 'to': 'USD'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['from'], 'ZAR')
        self.assertEqual(response.data['to'], 'USD')
        self.assertEqual(response.data['amount'], '5.00')
        self.assertIn('source', response.data)
        self.assertIn('stale', response.data)
        self.assertIn('freshness', response.data)
        self.assertIn('original_amount', response.data)
        self.assertEqual(response.data['original_currency'], 'ZAR')
        self.assertEqual(response.data['converted_currency'], 'USD')
        self.assertEqual(response.data['original_amount'], '100.00')

    def test_convert_invalid_currency(self):
        url = reverse('exchange-rate-convert')
        response = self.client.get(url, {'amount': '10', 'from': 'USD', 'to': 'JPY'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error'], 'Rate not found')
        self.assertIn('freshness', response.data)

    def test_convert_invalid_amount(self):
        url = reverse('exchange-rate-convert')
        response = self.client.get(url, {'amount': 'abc', 'from': 'USD', 'to': 'ZAR'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_convert_empty_cache_includes_refresh_error(self):
        ExchangeRate.objects.all().delete()
        with patch(
            'finance.fx.refresh_exchange_rates',
            return_value={'refreshed': False, 'error': 'All FX providers failed'},
        ):
            url = reverse('exchange-rate-convert')
            response = self.client.get(url, {'amount': '100', 'from': 'AOA', 'to': 'USD'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Rate not found', response.data['error'])
        self.assertIn('All FX providers failed', response.data['error'])

    def test_list_includes_freshness_meta(self):
        url = reverse('exchange-rate-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('freshness', response.data)
        self.assertIn('source', response.data)
        self.assertGreaterEqual(response.data['count'], 2)


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
