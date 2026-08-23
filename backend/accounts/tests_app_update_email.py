from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

User = get_user_model()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class AppUpdateNotificationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='updateadmin',
            email='admin@zenda.test',
            password='pass12345',
            is_staff=True,
            first_name='Admin',
        )
        self.user_a = User.objects.create_user(
            username='studenta',
            email='a@zenda.test',
            password='pass12345',
            first_name='Ana',
            is_active=True,
        )
        self.user_b = User.objects.create_user(
            username='studentb',
            email='b@zenda.test',
            password='pass12345',
            first_name='Bruno',
            is_active=True,
        )
        User.objects.create_user(
            username='inactive',
            email='inactive@zenda.test',
            password='pass12345',
            is_active=False,
        )
        self.token = Token.objects.create(user=self.admin)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    @override_settings(EMAIL_HOST_USER='noreply@test.com', EMAIL_HOST_PASSWORD='secret')
    def test_sends_to_all_active_users(self):
        res = self.client.post(
            '/api/auth/send-app-update-notification/',
            {'app_version': '1.0.14'},
            format='json',
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['sent_count'], 3)  # admin + 2 students
        self.assertEqual(res.data['failed_count'], 0)
        self.assertEqual(len(mail.outbox), 3)
        self.assertIn('1.0.14', mail.outbox[0].subject)
        self.assertIn('/download', mail.outbox[0].body)

    def test_requires_smtp_config(self):
        with override_settings(EMAIL_HOST_USER='', EMAIL_HOST_PASSWORD=''):
            res = self.client.post(
                '/api/auth/send-app-update-notification/',
                {'app_version': '1.0.14'},
                format='json',
            )
        self.assertEqual(res.status_code, 400)
        self.assertIn('SMTP', res.data['error'])

    def test_non_admin_forbidden(self):
        token = Token.objects.create(user=self.user_a)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        with override_settings(EMAIL_HOST_USER='noreply@test.com', EMAIL_HOST_PASSWORD='secret'):
            res = client.post(
                '/api/auth/send-app-update-notification/',
                {'app_version': '1.0.14'},
                format='json',
            )
        self.assertEqual(res.status_code, 403)
