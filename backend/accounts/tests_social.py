"""Unit tests for social authentication service (no live provider calls)."""

from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import OAuthState, SocialAccount, User
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

    def test_tiktok_link_start_requires_auth(self):
        resp = self.client.post('/api/auth/social/tiktok/link-start/', {}, format='json')
        self.assertEqual(resp.status_code, 401)

    @override_settings(
        TIKTOK_CLIENT_KEY='test_key',
        TIKTOK_CLIENT_SECRET='test_secret',
        TIKTOK_REDIRECT_URI='https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/',
        API_PUBLIC_URL='https://ludmilpaulo.pythonanywhere.com',
    )
    def test_tiktok_link_start_returns_authorize_url(self):
        user = User.objects.create_user(username='linker', email='linker@example.com', password='password123')
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        resp = self.client.post(
            '/api/auth/social/tiktok/link-start/',
            {'redirect': '/area-do-aluno'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        url = resp.json().get('authorize_url') or ''
        self.assertIn('tiktok.com', url)
        self.assertIn('client_key=test_key', url)
        self.assertIn('code_challenge', url)
        self.assertTrue(
            OAuthState.objects.filter(provider='tiktok', user=user, purpose='link').exists()
        )

    @override_settings(
        TIKTOK_CLIENT_KEY='test_key',
        TIKTOK_CLIENT_SECRET='test_secret',
        TIKTOK_REDIRECT_URI='https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/',
        API_PUBLIC_URL='https://ludmilpaulo.pythonanywhere.com',
        MOBILE_OAUTH_REDIRECT_URI='zenda://social-callback',
    )
    def test_tiktok_start_redirects_to_tiktok(self):
        resp = self.client.get(
            '/api/auth/social/tiktok/?client=mobile&purpose=login&platform=android'
        )
        self.assertEqual(resp.status_code, 302)
        location = resp['Location']
        self.assertIn('tiktok.com/v2/auth/authorize', location)
        self.assertIn('client_key=test_key', location)
        self.assertIn('redirect_uri=', location)
        self.assertNotIn('enter_from=dev_', location)
        state_row = OAuthState.objects.filter(provider='tiktok').latest('id')
        self.assertTrue(state_row.redirect_path.startswith('mobile:android:'))

    def test_tiktok_callback_is_not_404(self):
        resp = self.client.get('/api/auth/social/tiktok/callback/')
        self.assertNotEqual(resp.status_code, 404)
        self.assertNotEqual(resp.status_code, 400)
        self.assertEqual(resp.status_code, 302)

    @override_settings(MOBILE_OAUTH_REDIRECT_URI='zenda://social-callback')
    def test_tiktok_callback_without_code_is_controlled_oauth_redirect(self):
        resp = self.client.get('/api/auth/social/tiktok/callback/')
        self.assertEqual(resp.status_code, 302)
        self.assertIn('social=tiktok', resp['Location'])
        self.assertIn('status=error', resp['Location'])

    @override_settings(MOBILE_OAUTH_REDIRECT_URI='zenda://social-callback')
    def test_tiktok_callback_mobile_missing_code_redirects_to_app_scheme(self):
        """Django blocks unknown redirect schemes as HTTP 400 unless zenda:// is allowed."""
        OAuthState.objects.create(
            state='mobile-state-no-code',
            provider=SocialAccount.PROVIDER_TIKTOK,
            purpose=OAuthState.PURPOSE_LOGIN,
            redirect_path='mobile:android:/',
            code_verifier='verifier',
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        resp = self.client.get(
            '/api/auth/social/tiktok/callback/?state=mobile-state-no-code'
        )
        self.assertEqual(resp.status_code, 302)
        self.assertTrue(resp['Location'].startswith('zenda://social-callback'))
        self.assertIn('status=error', resp['Location'])

    @override_settings(
        TIKTOK_CLIENT_KEY='test_key',
        TIKTOK_CLIENT_SECRET='test_secret',
        TIKTOK_REDIRECT_URI='https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/',
        MOBILE_OAUTH_REDIRECT_URI='zenda://social-callback',
    )
    def test_tiktok_callback_mobile_success_redirects_to_app_not_400(self):
        OAuthState.objects.create(
            state='mobile-state-ok',
            provider=SocialAccount.PROVIDER_TIKTOK,
            purpose=OAuthState.PURPOSE_LOGIN,
            redirect_path='mobile:android:/',
            code_verifier='pkce-verifier',
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        verified = _verified(provider='tiktok', pid='tt-open-1', email=None, verified=False)
        verified.full_name = 'Tik User'
        with patch('accounts.social_views.exchange_tiktok_code', return_value=verified):
            resp = self.client.get(
                '/api/auth/social/tiktok/callback/?code=fresh-auth-code&state=mobile-state-ok&scopes=user.info.basic'
            )
        self.assertEqual(resp.status_code, 302)
        location = resp['Location']
        self.assertTrue(location.startswith('zenda://social-callback'))
        self.assertIn('status=authenticated', location)
        self.assertIn('exchange_code=', location)

    @override_settings(MOBILE_OAUTH_REDIRECT_URI='zenda://social-callback')
    def test_tiktok_callback_legacy_mobile_path_still_uses_app_scheme(self):
        OAuthState.objects.create(
            state='legacy-mobile-state',
            provider=SocialAccount.PROVIDER_TIKTOK,
            purpose=OAuthState.PURPOSE_LOGIN,
            redirect_path='mobile:/',
            code_verifier='verifier',
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        resp = self.client.get(
            '/api/auth/social/tiktok/callback/?state=legacy-mobile-state'
        )
        self.assertEqual(resp.status_code, 302)
        self.assertTrue(resp['Location'].startswith('zenda://'))

    def test_tiktok_domain_verification_file(self):
        resp = self.client.get('/tiktokFpaaRaUmoGf5Zl6lZ8hX77igVQZVuzJS.txt')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('tiktok-developers-site-verification=', resp.content.decode())


class TikTokProviderHelperTests(TestCase):
    def test_token_error_includes_description_and_log_id(self):
        from accounts.social_providers import _tiktok_error_meta, _tiktok_payload_is_error

        payload = {
            'error': 'invalid_grant',
            'error_description': 'Authorization code is expired or invalid.',
            'log_id': 'abc123',
        }
        self.assertTrue(_tiktok_payload_is_error(payload, 400))
        code, log_id = _tiktok_error_meta(payload)
        self.assertIn('invalid_grant', code)
        self.assertIn('expired', code)
        self.assertEqual(log_id, 'abc123')

    def test_user_info_ok_code_is_not_an_error(self):
        from accounts.social_providers import _tiktok_payload_is_error

        payload = {
            'data': {'user': {'open_id': 'x'}},
            'error': {'code': 'ok', 'message': '', 'log_id': 'z'},
        }
        self.assertFalse(_tiktok_payload_is_error(payload, 200))

    def test_token_fields_unwrap_data_envelope(self):
        from accounts.social_providers import _tiktok_token_fields

        wrapped = {
            'data': {'access_token': 'act.x', 'open_id': 'oid-1'},
            'message': 'success',
        }
        self.assertEqual(_tiktok_token_fields(wrapped)['open_id'], 'oid-1')
        flat = {'access_token': 'act.y', 'open_id': 'oid-2'}
        self.assertEqual(_tiktok_token_fields(flat)['open_id'], 'oid-2')

    @override_settings(TIKTOK_CLIENT_KEY='test_key', TIKTOK_CLIENT_SECRET='test_secret')
    def test_exchange_completes_when_user_info_says_something_went_wrong(self):
        from unittest.mock import Mock, patch

        from accounts.social_providers import exchange_tiktok_code

        token_resp = Mock()
        token_resp.status_code = 200
        token_resp.json.return_value = {
            'access_token': 'act.x',
            'open_id': 'oid-login',
            'token_type': 'Bearer',
        }
        user_resp = Mock()
        user_resp.status_code = 401
        user_resp.headers = {}
        user_resp.json.return_value = {
            'error': {
                'code': 'scope_not_authorized',
                'message': 'Something went wrong',
                'log_id': 'tt-log-1',
            }
        }
        with patch('accounts.social_providers.requests.post', return_value=token_resp):
            with patch('accounts.social_providers.requests.get', return_value=user_resp):
                verified = exchange_tiktok_code(
                    code='fresh-code',
                    redirect_uri='https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/',
                    code_verifier='pkce-verifier',
                )
        self.assertEqual(verified.provider, 'tiktok')
        self.assertEqual(verified.provider_user_id, 'oid-login')
        self.assertIsNone(verified.email)

    @override_settings(TIKTOK_CLIENT_KEY='test_key', TIKTOK_CLIENT_SECRET='test_secret')
    def test_exchange_uses_profile_when_user_info_succeeds(self):
        from unittest.mock import Mock, patch

        from accounts.social_providers import exchange_tiktok_code

        token_resp = Mock()
        token_resp.status_code = 200
        token_resp.json.return_value = {
            'access_token': 'act.x',
            'open_id': 'oid-login',
            'token_type': 'Bearer',
        }
        user_resp = Mock()
        user_resp.status_code = 200
        user_resp.json.return_value = {
            'data': {
                'user': {
                    'open_id': 'oid-login',
                    'display_name': 'Ada Lovelace',
                    'avatar_url': 'https://example.com/a.jpg',
                }
            },
            'error': {'code': 'ok', 'message': '', 'log_id': 'ok-1'},
        }
        with patch('accounts.social_providers.requests.post', return_value=token_resp):
            with patch('accounts.social_providers.requests.get', return_value=user_resp):
                verified = exchange_tiktok_code(
                    code='fresh-code',
                    redirect_uri='https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/',
                    code_verifier='pkce-verifier',
                )
        self.assertEqual(verified.full_name, 'Ada Lovelace')
        self.assertEqual(verified.first_name, 'Ada')
        self.assertEqual(verified.picture_url, 'https://example.com/a.jpg')
