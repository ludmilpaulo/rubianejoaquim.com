from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

User = get_user_model()


class AdminEmailConfigTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='mailadmin',
            email='mailadmin@zenda.test',
            password='pass12345',
            is_staff=True,
        )
        self.token = Token.objects.create(user=self.admin)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_email_config_masks_password(self):
        res = self.client.patch(
            '/api/auth/admin/email-config/update/',
            {
                'is_active': True,
                'email_host_user': 'noreply@rubianejoaquim.com',
                'email_host_password': 'smtp-secret',
                'default_from_email': 'Rubiane Joaquim <noreply@rubianejoaquim.com>',
            },
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['password_set'])
        self.assertNotIn('smtp-secret', str(res.data))

        res = self.client.get('/api/auth/admin/email-config/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['email_host'], 'smtpout.secureserver.net')
