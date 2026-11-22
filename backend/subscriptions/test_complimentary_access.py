"""Platform complimentary access: admin grant + mobile /me/ + feature gates."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from subscriptions.billing import clear_complimentary_access, set_complimentary_access
from subscriptions.models import MobileAppSubscription

User = get_user_model()


class ComplimentaryAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@zenda.test',
            password='pass12345',
            is_staff=True,
        )
        self.user = User.objects.create_user(
            username='member',
            email='member@zenda.test',
            password='pass12345',
        )
        self.admin_token = Token.objects.create(user=self.admin)
        self.user_token = Token.objects.create(user=self.user)

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_admin_can_grant_and_clear(self):
        self._auth(self.admin_token)
        res = self.client.post(
            '/api/subscriptions/admin/subscriptions/complimentary-access/',
            {'months': 3, 'plan_tier': 'business'},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['active'])
        self.assertEqual(res.data['plan_tier'], 'business')
        self.assertIsNotNone(res.data['until'])

        cleared = self.client.post(
            '/api/subscriptions/admin/subscriptions/complimentary-access/',
            {'clear': True},
            format='json',
        )
        self.assertEqual(cleared.status_code, 200)
        self.assertFalse(cleared.data['active'])

    def test_rejects_invalid_months(self):
        self._auth(self.admin_token)
        res = self.client.post(
            '/api/subscriptions/admin/subscriptions/complimentary-access/',
            {'months': 9},
            format='json',
        )
        self.assertEqual(res.status_code, 400)

    def test_me_grants_access_without_subscription(self):
        set_complimentary_access(months=2, plan_tier='premium', admin=self.admin)
        self._auth(self.user_token)
        res = self.client.get('/api/subscriptions/mobile/me/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['has_access'])
        self.assertTrue(res.data['complimentary'])
        self.assertEqual(res.data['effective_tier'], 'premium')
        self.assertIn('ai_copilot', res.data['features'])

    def test_feature_gate_allows_business_during_promo(self):
        set_complimentary_access(months=1, plan_tier='business', admin=self.admin)
        self._auth(self.user_token)
        res = self.client.get('/api/finance/business/sales/')
        self.assertEqual(res.status_code, 200)

    def test_feature_gate_blocks_after_clear(self):
        set_complimentary_access(months=1, plan_tier='business', admin=self.admin)
        clear_complimentary_access(admin=self.admin)
        self._auth(self.user_token)
        res = self.client.get('/api/finance/business/sales/')
        self.assertEqual(res.status_code, 403)

    def test_paid_business_beats_premium_promo(self):
        MobileAppSubscription.objects.create(
            user=self.user,
            status='active',
            plan_tier='business',
            subscription_ends_at=timezone.now() + timedelta(days=30),
        )
        set_complimentary_access(months=1, plan_tier='premium', admin=self.admin)
        self._auth(self.user_token)
        res = self.client.get('/api/subscriptions/mobile/me/')
        self.assertEqual(res.data['effective_tier'], 'business')
        self.assertFalse(res.data['complimentary'])
