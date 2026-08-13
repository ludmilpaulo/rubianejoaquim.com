"""Family financial space: create, invite, join, roles, visibility, settle-up."""
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from finance.models import ExchangeRate
from finance_space.models import FamilyEntry, FinanceSpace, FinanceSpaceMember, SharedBudget

User = get_user_model()


def _seed_rates():
    now = timezone.now() - timedelta(minutes=15)
    for code, rate in {
        'USD': Decimal('1'),
        'ZAR': Decimal('18.50'),
        'AOA': Decimal('900'),
        'EUR': Decimal('0.92'),
    }.items():
        ExchangeRate.objects.create(
            base_currency='USD',
            target_currency=code,
            rate=rate,
            source='open.er-api.com',
            provider_updated_at=now,
        )


class FamilySpaceTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', email='owner@test.com', password='pass12345', first_name='Ada'
        )
        self.guest = User.objects.create_user(
            username='guest', email='guest@test.com', password='pass12345', first_name='Ben'
        )
        self.other = User.objects.create_user(
            username='other', email='other@test.com', password='pass12345'
        )
        self.owner_client = APIClient()
        self.owner_client.force_authenticate(user=self.owner)
        self.guest_client = APIClient()
        self.guest_client.force_authenticate(user=self.guest)
        self.other_client = APIClient()
        self.other_client.force_authenticate(user=self.other)
        _seed_rates()

    def _create_space(self, **extra):
        payload = {
            'name': 'Família Silva',
            'currency': 'AOA',
            'description': 'Casa',
            **extra,
        }
        return self.owner_client.post('/api/finance-space/spaces/', payload, format='json')

    def test_create_family_returns_unique_code_and_invite_url(self):
        response = self._create_space()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Família Silva')
        self.assertEqual(response.data['currency'], 'AOA')
        code = response.data['invite_code']
        self.assertEqual(len(code), 8)
        self.assertTrue(code.startswith('F'))
        self.assertEqual(
            response.data['invite_url'],
            f'https://www.rubianejoaquim.com/family/join/{code}',
        )
        self.assertTrue(response.data['require_approval'])
        self.assertEqual(
            FinanceSpaceMember.objects.filter(
                space_id=response.data['id'], user=self.owner, role='owner', status='active'
            ).count(),
            1,
        )

    def test_invite_codes_are_unique_case_insensitive(self):
        first = self._create_space()
        second = self.owner_client.post(
            '/api/finance-space/spaces/',
            {'name': 'Other', 'currency': 'USD'},
            format='json',
        )
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(
            first.data['invite_code'].upper(),
            second.data['invite_code'].upper(),
        )

    def test_preview_returns_name_count_currency_only(self):
        created = self._create_space()
        code = created.data['invite_code']
        response = self.guest_client.get(
            '/api/finance-space/spaces/preview/',
            {'invite_code': code},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Família Silva')
        self.assertEqual(response.data['currency'], 'AOA')
        self.assertEqual(response.data['member_count'], 1)
        self.assertNotIn('shared_goals', response.data)
        self.assertNotIn('income', response.data)
        self.assertNotIn('invite_code', response.data)

    def test_join_requires_approval_by_default(self):
        created = self._create_space()
        code = created.data['invite_code']
        response = self.guest_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': code},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['status'], 'pending')
        member = FinanceSpaceMember.objects.get(space_id=created.data['id'], user=self.guest)
        self.assertEqual(member.status, 'pending')
        dash = self.guest_client.get(f'/api/finance-space/spaces/{created.data["id"]}/dashboard/')
        self.assertEqual(dash.status_code, status.HTTP_403_FORBIDDEN)

    def test_join_auto_when_approval_off(self):
        created = self._create_space(require_approval=False)
        response = self.guest_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': created.data['invite_code']},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        member = FinanceSpaceMember.objects.get(space_id=created.data['id'], user=self.guest)
        self.assertEqual(member.status, 'active')
        self.assertEqual(member.role, 'adult')

    def test_duplicate_join_returns_already_member(self):
        created = self._create_space(require_approval=False)
        self.guest_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': created.data['invite_code']},
            format='json',
        )
        again = self.guest_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': created.data['invite_code']},
            format='json',
        )
        self.assertEqual(again.status_code, status.HTTP_200_OK)
        self.assertEqual(again.data.get('code'), 'already_member')
        self.assertEqual(
            FinanceSpaceMember.objects.filter(space_id=created.data['id'], user=self.guest).count(),
            1,
        )

    def test_approve_and_decline(self):
        created = self._create_space()
        space_id = created.data['id']
        self.guest_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': created.data['invite_code']},
            format='json',
        )
        approve = self.owner_client.post(
            f'/api/finance-space/spaces/{space_id}/approve/',
            {'user_id': self.guest.id, 'decision': 'approve'},
            format='json',
        )
        self.assertEqual(approve.status_code, status.HTTP_200_OK)
        self.assertEqual(approve.data['status'], 'active')

        self.other_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': created.data['invite_code']},
            format='json',
        )
        decline = self.owner_client.post(
            f'/api/finance-space/spaces/{space_id}/approve/',
            {'user_id': self.other.id, 'decision': 'decline'},
            format='json',
        )
        self.assertEqual(decline.status_code, status.HTTP_200_OK)
        self.assertEqual(decline.data['status'], 'declined')

    def test_invalid_and_expired_code(self):
        missing = self.guest_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': 'FDEADBEE'},
            format='json',
        )
        self.assertEqual(missing.status_code, status.HTTP_404_NOT_FOUND)
        created = self._create_space()
        space = FinanceSpace.objects.get(pk=created.data['id'])
        space.invite_expires_at = timezone.now() - timedelta(hours=1)
        space.save(update_fields=['invite_expires_at'])
        expired = self.guest_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': created.data['invite_code']},
            format='json',
        )
        self.assertEqual(expired.status_code, status.HTTP_410_GONE)

    def test_owner_cannot_leave_with_other_members(self):
        created = self._create_space(require_approval=False)
        space_id = created.data['id']
        self.guest_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': created.data['invite_code']},
            format='json',
        )
        leave = self.owner_client.post(f'/api/finance-space/spaces/{space_id}/leave/')
        self.assertEqual(leave.status_code, status.HTTP_400_BAD_REQUEST)

    def test_set_role(self):
        created = self._create_space(require_approval=False)
        space_id = created.data['id']
        self.guest_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': created.data['invite_code']},
            format='json',
        )
        member = FinanceSpaceMember.objects.get(space_id=space_id, user=self.guest)
        response = self.owner_client.post(
            f'/api/finance-space/spaces/{space_id}/set-role/',
            {'member_id': member.id, 'role': 'viewer'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        member.refresh_from_db()
        self.assertEqual(member.role, 'viewer')

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_private_entry_idor(self, _refresh):
        created = self._create_space(require_approval=False)
        space_id = created.data['id']
        self.guest_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': created.data['invite_code']},
            format='json',
        )
        entry = self.owner_client.post(
            '/api/finance-space/entries/',
            {
                'space': space_id,
                'kind': 'income',
                'title': 'Salary',
                'amount': '1000',
                'currency': 'AOA',
                'date': str(date.today()),
                'visibility': 'private',
            },
            format='json',
        )
        self.assertEqual(entry.status_code, status.HTTP_201_CREATED)
        listed = self.guest_client.get('/api/finance-space/entries/', {'space': space_id})
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        results = listed.data['results'] if isinstance(listed.data, dict) else listed.data
        self.assertEqual(len(results), 0)

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_shared_expense_settle_up_and_budget_alert(self, _refresh):
        created = self._create_space(require_approval=False)
        space_id = created.data['id']
        self.guest_client.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': created.data['invite_code']},
            format='json',
        )
        SharedBudget.objects.create(
            space_id=space_id,
            name='Month',
            amount=Decimal('100'),
            month=date.today().month,
            year=date.today().year,
            currency='AOA',
        )
        expense = self.owner_client.post(
            '/api/finance-space/entries/',
            {
                'space': space_id,
                'kind': 'expense',
                'title': 'Groceries',
                'amount': '80',
                'currency': 'AOA',
                'date': str(date.today()),
                'visibility': 'family',
                'shares': [
                    {'user': self.owner.id, 'share_amount': '40'},
                    {'user': self.guest.id, 'share_amount': '40'},
                ],
            },
            format='json',
        )
        self.assertEqual(expense.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(expense.data['shares']), 2)
        settle = self.owner_client.get(f'/api/finance-space/spaces/{space_id}/settle/')
        self.assertEqual(settle.status_code, status.HTTP_200_OK)
        self.assertTrue(len(settle.data['suggestions']) >= 1)
        suggestion = settle.data['suggestions'][0]
        paid = self.owner_client.post(
            f'/api/finance-space/spaces/{space_id}/settle/',
            {
                'from_user': suggestion['from_user'],
                'to_user': suggestion['to_user'],
                'amount': suggestion['amount'],
                'currency': 'AOA',
                'status': 'paid',
            },
            format='json',
        )
        self.assertEqual(paid.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            FamilyEntry.objects.filter(space_id=space_id, kind='settlement').exists()
        )
        dash = self.owner_client.get(f'/api/finance-space/spaces/{space_id}/dashboard/')
        self.assertEqual(dash.status_code, status.HTTP_200_OK)
        self.assertEqual(dash.data['currency'], 'AOA')
        self.assertEqual(Decimal(dash.data['expenses']), Decimal('80.00'))
        self.assertGreaterEqual(dash.data['budget_pct'], 75)

    def test_unauthenticated_preview_allowed_join_not(self):
        created = self._create_space()
        anon = APIClient()
        preview = anon.get(
            '/api/finance-space/spaces/preview/',
            {'invite_code': created.data['invite_code']},
        )
        self.assertEqual(preview.status_code, status.HTTP_200_OK)
        join = anon.post(
            '/api/finance-space/spaces/join/',
            {'invite_code': created.data['invite_code']},
            format='json',
        )
        self.assertEqual(join.status_code, status.HTTP_401_UNAUTHORIZED)
