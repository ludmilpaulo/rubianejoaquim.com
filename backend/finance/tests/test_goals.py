from datetime import date, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from finance.models import Goal
from finance.goal_progress import notify_goal_progress
from tasks.models import Notification

User = get_user_model()


class GoalReminderApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='goaluser', password='testpass123')
        self.user.preferred_currency = 'ZAR'
        self.user.save()
        self.client = APIClient()
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_goal_creation_with_reminder(self):
        resp = self.client.post(
            '/api/finance/personal/goals/',
            {
                'title': 'Save for flight',
                'description': 'Trip',
                'target_amount': '10000.00',
                'current_amount': '0',
                'currency': 'ZAR',
                'target_date': '2026-09-30',
                'reminder_enabled': True,
                'reminder_time': '18:00',
                'reminder_frequency': 'once',
                'reminder_offsets_minutes': [10],
            },
            format='json',
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(resp.data['reminder_enabled'])
        self.assertEqual(resp.data['reminder_time'], '18:00')
        self.assertEqual(resp.data['reminder_offsets_minutes'], [10])
        goal = Goal.objects.get(pk=resp.data['id'])
        self.assertEqual(goal.reminder_time, time(18, 0))

    def test_goal_reminder_update(self):
        goal = Goal.objects.create(
            user=self.user,
            title='Gym',
            target_amount=Decimal('1000'),
            target_date=date(2026, 9, 30),
            reminder_enabled=True,
            reminder_time=time(15, 30),
            reminder_offsets_minutes=[10],
        )
        resp = self.client.patch(
            f'/api/finance/personal/goals/{goal.id}/',
            {'reminder_time': '16:00', 'reminder_offsets_minutes': [10, 60]},
            format='json',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['reminder_time'], '16:00')
        self.assertEqual(resp.data['reminder_offsets_minutes'], [10, 60])

    def test_goal_deletion_cancels_reminder_fields(self):
        goal = Goal.objects.create(
            user=self.user,
            title='Delete me',
            target_amount=Decimal('500'),
            target_date=date(2026, 9, 30),
            reminder_enabled=True,
            reminder_time=time(10, 0),
        )
        resp = self.client.delete(f'/api/finance/personal/goals/{goal.id}/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Goal.objects.filter(pk=goal.id).exists())

    def test_goal_progress_75_and_100_notifications(self):
        goal = Goal.objects.create(
            user=self.user,
            title='Pay university fees',
            target_amount=Decimal('1000'),
            current_amount=Decimal('700'),
            currency='ZAR',
            target_date=date(2026, 9, 30),
        )
        events = notify_goal_progress(goal, Decimal('700'))
        self.assertEqual(events, [])

        goal.current_amount = Decimal('750')
        goal.save()
        events = notify_goal_progress(goal, Decimal('700'))
        self.assertIn('75', events)
        self.assertTrue(
            Notification.objects.filter(
                user=self.user, related_object_id=goal.id, notification_type='target_milestone'
            ).exists()
        )
        events_again = notify_goal_progress(goal, Decimal('750'))
        self.assertEqual(events_again, [])

        goal.current_amount = Decimal('1000')
        goal.status = 'completed'
        goal.save()
        events100 = notify_goal_progress(goal, Decimal('750'))
        self.assertIn('100', events100)
        self.assertTrue(
            Notification.objects.filter(
                user=self.user, related_object_id=goal.id, notification_type='goal_achievement'
            ).exists()
        )

    def test_add_money_returns_progress_events(self):
        goal = Goal.objects.create(
            user=self.user,
            title='Emergency',
            target_amount=Decimal('1000'),
            current_amount=Decimal('700'),
            currency='ZAR',
            target_date=date(2026, 9, 30),
        )
        resp = self.client.post(
            f'/api/finance/personal/goals/{goal.id}/add-money/',
            {'amount': '50', 'currency': 'ZAR'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertIn('75', resp.data.get('progress_events') or [])
