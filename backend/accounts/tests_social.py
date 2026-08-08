"""Unit tests for social authentication service (no live provider calls)."""

from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import SocialAccount, User
from accounts.social_providers import VerifiedProviderUser
from accounts.social_service import (
    SocialAuthError,
    authenticate_social_user,
    confirm_social_link,
    list_login_methods,
    unlink_social_account,
)


def _verified(provider='google', pid='gid-1', email='new@example.com', verified=True):
    return VerifiedProviderUser(
        provider=provider,
        provider_user_id=pid,
        email=email,
        email_verified=verified,
        first_name='Ada',
        last_name='Lovelace',
        full_name='Ada Lovelace',
        picture_url='https://example.com/a.jpg',
    )


class SocialServiceTests(TestCase):
    def test_creates_new_user_and_social_account(self):
        result = authenticate_social_user(_verified())
        self.assertEqual(result.status, 'authenticated')
        self.assertTrue(result.created)
        self.assertIsNotNone(result.token)
        self.assertTrue(
            SocialAccount.objects.filter(provider='google', provider_user_id='gid-1').exists()
        )
        self.assertFalse(result.user.has_usable_password())

    def test_same_provider_id_logs_into_same_user(self):
        first = authenticate_social_user(_verified())
        second = authenticate_social_user(_verified())
        self.assertEqual(first.user.pk, second.user.pk)
        self.assertFalse(second.created)
        self.assertEqual(User.objects.filter(email='new@example.com').count(), 1)

    def test_verified_email_collision_requires_link(self):
        User.objects.create_user(
            username='existing',
            email='john@example.com',
            password='password123',
        )
        result = authenticate_social_user(
            _verified(email='john@example.com', pid='gid-john')
        )
        self.assertEqual(result.status, 'link_required')
        self.assertIsNotNone(result.link_token)
        self.assertEqual(User.objects.filter(email='john@example.com').count(), 1)

    def test_confirm_link_with_password(self):
        user = User.objects.create_user(
            username='existing',
            email='john@example.com',
            password='password123',
        )
        pending = authenticate_social_user(
            _verified(email='john@example.com', pid='gid-john')
        )
        result = confirm_social_link(link_token=pending.link_token, password='password123')
        self.assertEqual(result.status, 'authenticated')
        self.assertEqual(result.user.pk, user.pk)
        self.assertTrue(
            SocialAccount.objects.filter(user=user, provider='google').exists()
        )

    def test_cannot_unlink_last_method(self):
        result = authenticate_social_user(_verified(pid='only-one'))
        with self.assertRaises(SocialAuthError) as ctx:
            unlink_social_account(user=result.user, provider='google')
        self.assertEqual(ctx.exception.code, 'last_login_method')

    def test_link_provider_to_authenticated_user(self):
        user = User.objects.create_user(
            username='u1',
            email='u1@example.com',
            password='password123',
        )
        result = authenticate_social_user(
            _verified(email='other@example.com', pid='gid-link'),
            linking_user=user,
        )
        self.assertEqual(result.user.pk, user.pk)
        methods = list_login_methods(user)
        self.assertTrue(methods['google'])
        self.assertTrue(methods['email'])

    def test_provider_already_linked_elsewhere(self):
        a = authenticate_social_user(_verified(pid='shared', email='a@example.com'))
        other = User.objects.create_user(
            username='other',
            email='b@example.com',
            password='password123',
        )
        with self.assertRaises(SocialAuthError) as ctx:
            authenticate_social_user(
                _verified(pid='shared', email='a@example.com'),
                linking_user=other,
            )
        self.assertEqual(ctx.exception.code, 'provider_already_linked')
        self.assertEqual(a.user.pk, User.objects.get(email='a@example.com').pk)


@override_settings(
    GOOGLE_CLIENT_ID='',
    FACEBOOK_APP_ID='',
    FACEBOOK_APP_SECRET='',
    TIKTOK_CLIENT_KEY='',
)
class SocialAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_social_config_exposes_no_secrets(self):
        resp = self.client.get('/api/auth/social/config/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertNotIn('secret', str(data).lower())
        self.assertNotIn('client_secret', data)
        self.assertIn('google_enabled', data)

    def test_google_missing_token(self):
        resp = self.client.post('/api/auth/social/google/', {}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_logout_deletes_token(self):
        user = User.objects.create_user(username='lo', email='lo@example.com', password='password123')
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        resp = self.client.post('/api/auth/logout/')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(Token.objects.filter(key=token.key).exists())
