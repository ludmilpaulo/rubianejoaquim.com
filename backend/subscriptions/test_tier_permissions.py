"""Tier flags must block premium endpoints, including when a subscription row is missing."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from subscriptions.models import MobileAppSubscription

User = get_user_model()


class TierPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _auth(self, username, tier=None, staff=False):
        user = User.objects.create_user(
            username=username,
            email=f'{username}@zenda.test',
            password='pass12345',
            is_staff=staff,
        )
        if tier:
            MobileAppSubscription.objects.create(
                user=user,
                status='active',
                plan_tier=tier,
                subscription_ends_at=timezone.now() + timedelta(days=30),
            )
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        return user

    def test_missing_subscription_cannot_use_premium_endpoints(self):
        self._auth('courseonly')
        self.assertEqual(self.client.get('/api/ai-copilot/conversations/').status_code, 403)
        self.assertEqual(self.client.get('/api/finance/dashboard/analytics/').status_code, 403)
        self.assertEqual(self.client.get('/api/finance/business/sales/').status_code, 403)
        self.assertEqual(self.client.get('/api/finance/receipts/').status_code, 403)
        self.assertEqual(self.client.get('/api/finance-space/spaces/').status_code, 403)

    def test_premium_keeps_coach_health_and_family(self):
        self._auth('premiumuser', 'premium')
        self.assertEqual(self.client.get('/api/ai-copilot/conversations/').status_code, 200)
        self.assertEqual(self.client.get('/api/finance/dashboard/analytics/').status_code, 200)
        self.assertEqual(self.client.get('/api/finance/dashboard/health-history/').status_code, 200)
        self.assertEqual(self.client.get('/api/finance-space/spaces/').status_code, 200)
        self.assertEqual(self.client.get('/api/finance/business/sales/').status_code, 403)
        self.assertEqual(self.client.get('/api/finance/receipts/').status_code, 403)

    def test_business_includes_books_and_receipts(self):
        self._auth('bizuser', 'business')
        self.assertEqual(self.client.get('/api/finance/business/sales/').status_code, 200)
        self.assertEqual(self.client.get('/api/finance/business/expenses/').status_code, 200)
        self.assertEqual(self.client.get('/api/finance/receipts/').status_code, 200)
        self.assertEqual(self.client.get('/api/finance-space/spaces/').status_code, 200)

    def test_family_excludes_business_and_receipts(self):
        self._auth('familyuser', 'family')
        self.assertEqual(self.client.get('/api/finance-space/spaces/').status_code, 200)
        self.assertEqual(self.client.get('/api/ai-copilot/conversations/monthly-report/').status_code, 200)
        self.assertEqual(self.client.get('/api/finance/business/sales/').status_code, 403)
        self.assertEqual(self.client.get('/api/finance/receipts/').status_code, 403)

    def test_staff_bypass_without_subscription(self):
        self._auth('staffuser', staff=True)
        self.assertEqual(self.client.get('/api/ai-copilot/conversations/').status_code, 200)
        self.assertEqual(self.client.get('/api/finance/business/sales/').status_code, 200)
