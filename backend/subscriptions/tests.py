from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from subscriptions.models import MobileAppSubscription, MobileAppSubscriptionPaymentProof, SubscriptionAdminAuditLog

User = get_user_model()


class SubscriptionAdminApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@zenda.test',
            password='pass12345',
            is_staff=True,
        )
        self.user = User.objects.create_user(
            username='jane',
            email='jane@zenda.test',
            password='pass12345',
            first_name='Jane',
            last_name='Doe',
            phone='944000111',
        )
        self.token = Token.objects.create(user=self.admin)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        now = timezone.now()
        self.sub = MobileAppSubscription.objects.create(
            user=self.user,
            status='active',
            plan_tier='premium',
            subscription_ends_at=now + timedelta(days=10),
        )

    def test_non_admin_forbidden(self):
        other = User.objects.create_user(username='u2', email='u2@zenda.test', password='pass12345')
        token = Token.objects.create(user=other)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        res = client.get('/api/subscriptions/admin/subscriptions/')
        self.assertEqual(res.status_code, 403)

    def test_list_paginated_and_search(self):
        res = self.client.get('/api/subscriptions/admin/subscriptions/', {'q': 'jane', 'page_size': 25})
        self.assertEqual(res.status_code, 200)
        self.assertIn('results', res.data)
        self.assertEqual(res.data['count'], 1)
        row = res.data['results'][0]
        self.assertEqual(row['user_email'], 'jane@zenda.test')
        self.assertEqual(row['plan_tier'], 'premium')
        self.assertIn('amount', row)
        self.assertEqual(row['currency'], 'AOA')

    def test_analytics_from_backend(self):
        res = self.client.get('/api/subscriptions/admin/subscriptions/analytics/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['kpis']['total_users']['value'], 1)
        self.assertEqual(res.data['kpis']['active_subscriptions']['value'], 1)
        self.assertEqual(res.data['pricing']['currency'], 'AOA')
        self.assertTrue(len(res.data['plan_performance']) >= 1)

    def test_pause_and_audit(self):
        res = self.client.post(f'/api/subscriptions/admin/subscriptions/{self.sub.id}/pause/')
        self.assertEqual(res.status_code, 200)
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.status, 'paused')
        self.assertFalse(self.sub.has_access)
        self.assertTrue(
            SubscriptionAdminAuditLog.objects.filter(action='pause_subscription', subscription=self.sub).exists()
        )

    def test_change_plan(self):
        res = self.client.post(
            f'/api/subscriptions/admin/subscriptions/{self.sub.id}/change-plan/',
            {'plan_tier': 'business'},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.plan_tier, 'business')

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_approve_proof_extends_subscription(self):
        proof = MobileAppSubscriptionPaymentProof.objects.create(
            subscription=self.sub,
            file=SimpleUploadedFile('receipt.jpg', b'fake-image', content_type='image/jpeg'),
            notes='IBAN transfer',
            status='pending',
        )
        res = self.client.post(f'/api/subscriptions/admin/payment-proofs/{proof.id}/approve/')
        self.assertEqual(res.status_code, 200)
        proof.refresh_from_db()
        self.assertEqual(proof.status, 'approved')
        self.assertEqual(proof.amount, Decimal('10000'))

    def test_export_csv_respects_filter(self):
        res = self.client.get('/api/subscriptions/admin/subscriptions/export/', {'status': 'active', 'export_format': 'csv'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/csv', res['Content-Type'])
        self.assertIn(b'jane@zenda.test', res.content)

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        TWILIO_ACCOUNT_SID='sid',
        TWILIO_AUTH_TOKEN='token',
        TWILIO_SMS_FROM='+15550001111',
        TWILIO_WHATSAPP_FROM='whatsapp:+15550001111',
    )
    def test_send_reminder_uses_all_channels(self):
        from unittest.mock import patch

        class FakeResponse:
            status_code = 201
            content = b'{"data":[]}'

            def json(self):
                return {'data': []}

        with patch('subscriptions.notify.requests.post', return_value=FakeResponse()):
            res = self.client.post(
                f'/api/subscriptions/admin/subscriptions/{self.sub.id}/send-reminder/',
                {'channels': ['email', 'push', 'sms', 'whatsapp'], 'days': 3},
                format='json',
            )
        self.assertEqual(res.status_code, 200)
        results = res.data['results']
        self.assertNotIn('not_configured', results.values())
        self.assertEqual(results['email'], 'sent')
        self.assertEqual(results['push'], 'sent')
        self.assertEqual(results['sms'], 'sent')
        self.assertEqual(results['whatsapp'], 'sent')
        from tasks.models import Notification
        self.assertTrue(
            Notification.objects.filter(
                user=self.user, notification_type='subscription_reminder'
            ).exists()
        )

    def test_whatsapp_from_uses_provider_number(self):
        from subscriptions.notify import whatsapp_from_number

        with self.settings(TWILIO_WHATSAPP_FROM='', WHATSAPP_PROVIDER_NUMBER='+27659031894'):
            self.assertEqual(whatsapp_from_number(), 'whatsapp:+27659031894')

    def test_whatsapp_uses_green_api(self):
        from unittest.mock import patch

        class FakeResponse:
            status_code = 200
            content = b'{"idMessage":"ABC"}'
            text = '{"idMessage":"ABC"}'

            def json(self):
                return {'idMessage': 'ABC'}

        with self.settings(
            GREEN_API_ID_INSTANCE='110100001',
            GREEN_API_API_TOKEN='token123',
            GREEN_API_URL='https://api.green-api.com',
            TWILIO_ACCOUNT_SID='',
            WHATSAPP_ACCESS_TOKEN='',
        ):
            with patch('subscriptions.notify.requests.post', return_value=FakeResponse()) as mock_post:
                from subscriptions.notify import send_whatsapp_channel

                status = send_whatsapp_channel(self.user, 'Olá, renove a Zenda', 3, '24/08/2026')
        self.assertEqual(status, 'sent')
        url = mock_post.call_args.args[0]
        self.assertIn('/waInstance110100001/sendMessage/token123', url)
        self.assertEqual(mock_post.call_args.kwargs['json']['chatId'], '244944000111@c.us')


class SubscriptionPaymentWorkflowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='intl',
            email='intl@zenda.test',
            password='pass12345',
            country='ZA',
            preferred_currency='USD',
        )
        self.ao_user = User.objects.create_user(
            username='ao',
            email='ao@zenda.test',
            password='pass12345',
            country='AO',
            preferred_currency='AOA',
        )
        self.admin = User.objects.create_user(
            username='payadmin',
            email='payadmin@zenda.test',
            password='pass12345',
            is_staff=True,
        )
        self.user_token = Token.objects.create(user=self.user)
        self.ao_token = Token.objects.create(user=self.ao_user)
        self.admin_token = Token.objects.create(user=self.admin)
        self.client = APIClient()

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_checkout_options_routes_by_country(self):
        self._auth(self.ao_token)
        res = self.client.get('/api/subscriptions/checkout-options/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['method'], 'proof_of_payment')
        self.assertEqual(res.data['charge']['currency'], 'AOA')
        self.assertNotIn('app_secret', res.data)
        self.assertNotIn('secret_key', str(res.data))

        self._auth(self.user_token)
        res = self.client.get('/api/subscriptions/checkout-options/?platform=ios')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['charge']['currency'], 'ZAR')
        self.assertIn('apple_iap', res.data['methods'])

    def test_angola_cannot_create_card_session(self):
        self._auth(self.ao_token)
        res = self.client.post('/api/subscriptions/payments/create-session/', {}, format='json')
        self.assertEqual(res.status_code, 400)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_angola_upload_approve_reject_emails_and_ledger(self):
        from django.core import mail
        from subscriptions.models import MobileAppSubscription, SubscriptionPayment

        self._auth(self.ao_token)
        sub = MobileAppSubscription.objects.create(user=self.ao_user, status='expired')
        proof_file = SimpleUploadedFile('receipt.jpg', b'fake-image', content_type='image/jpeg')
        res = self.client.post(
            f'/api/subscriptions/mobile/{sub.id}/upload-proof/',
            {'file': proof_file, 'notes': 'IBAN'},
            format='multipart',
        )
        self.assertEqual(res.status_code, 201)
        payment = SubscriptionPayment.objects.get(user=self.ao_user)
        self.assertEqual(payment.status, 'pending_verification')
        self.assertEqual(payment.method, 'proof_of_payment')

        self._auth(self.admin_token)
        res = self.client.post(f'/api/subscriptions/admin/payment-proofs/{res.data["id"]}/approve/')
        self.assertEqual(res.status_code, 200)
        payment.refresh_from_db()
        sub.refresh_from_db()
        self.assertEqual(payment.status, 'paid')
        self.assertEqual(sub.status, 'active')
        self.assertTrue(mail.outbox)

        proof_file2 = SimpleUploadedFile('receipt2.jpg', b'fake-image-2', content_type='image/jpeg')
        self._auth(self.ao_token)
        res = self.client.post(
            f'/api/subscriptions/mobile/{sub.id}/upload-proof/',
            {'file': proof_file2},
            format='multipart',
        )
        self.assertEqual(res.status_code, 201)
        new_id = res.data['id']
        self._auth(self.admin_token)
        res = self.client.post(f'/api/subscriptions/admin/payment-proofs/{new_id}/reject/', {'reason': 'Unclear'}, format='json')
        self.assertEqual(res.status_code, 200)
        rejected = SubscriptionPayment.objects.get(proof_id=new_id)
        self.assertEqual(rejected.status, 'rejected')

    def test_gateway_config_masks_secrets(self):
        from subscriptions.models import PaymentGatewayConfig
        PaymentGatewayConfig.objects.create(
            provider='ikhokha',
            environment='sandbox',
            is_active=True,
            app_id='IKAPP12345678',
            app_secret='super-secret-value',
            webhook_secret='webhook-secret-value',
        )
        self._auth(self.admin_token)
        res = self.client.get('/api/subscriptions/admin/gateway-config/')
        self.assertEqual(res.status_code, 200)
        body = res.json()
        dumped = str(body)
        self.assertNotIn('super-secret-value', dumped)
        self.assertNotIn('webhook-secret-value', dumped)
        self.assertTrue(body['ikhokha']['app_secret_set'])
        self.assertIn('****', body['ikhokha']['app_id_masked'])

        res = self.client.patch(
            '/api/subscriptions/admin/gateway-config/update/',
            {'ikhokha': {'app_secret': ''}, 'billing': {'monthly_price_zar': '199.00'}},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        cfg = PaymentGatewayConfig.objects.get(provider='ikhokha')
        self.assertTrue(cfg.get_app_secret())
        self.assertNotEqual(cfg.get_app_secret(), '')

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_ikhokha_session_webhook_duplicate_and_failure(self):
        from unittest.mock import patch
        from subscriptions.ikhokha import sign_payload
        from subscriptions.models import PaymentGatewayConfig, SubscriptionPayment

        PaymentGatewayConfig.objects.create(
            provider='ikhokha',
            environment='sandbox',
            is_active=True,
            app_id='IKAPPID',
            app_secret='test-secret',
            callback_url='https://api.example.com/api/subscriptions/ikhokha/webhook/',
        )
        self._auth(self.user_token)
        with patch(
            'subscriptions.payment_views.create_payment_link',
            return_value={'paylink_url': 'https://securepay.ikhokha.red/abc', 'paylink_id': 'abc', 'external_id': 'x'},
        ):
            res = self.client.post('/api/subscriptions/payments/create-session/', {}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertIn('paylink_url', res.data)
        payment_id = res.data['id']
        external_id = res.data['external_id']
        payment = SubscriptionPayment.objects.get(pk=payment_id)
        self.assertEqual(payment.status, 'processing')

        payload = {
            'paylinkID': 'abc',
            'status': 'SUCCESS',
            'externalTransactionID': external_id,
            'responseCode': '00',
        }
        import json
        raw = json.dumps(payload, separators=(',', ':'))
        sig = sign_payload('https://api.example.com/api/subscriptions/ikhokha/webhook/', raw, 'test-secret')

        with patch(
            'subscriptions.payment_views.get_payment_status',
            return_value={'paylink_id': 'abc', 'status': 'PAID'},
        ):
            res = self.client.post(
                '/api/subscriptions/ikhokha/webhook/',
                data=raw,
                content_type='application/json',
                HTTP_IK_SIGN=sig,
                HTTP_IK_APPID='IKAPPID',
            )
        self.assertEqual(res.status_code, 200)
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'paid')
        self.assertIsNotNone(payment.activated_at)
        ends = payment.subscription.subscription_ends_at

        with patch(
            'subscriptions.payment_views.get_payment_status',
            return_value={'paylink_id': 'abc', 'status': 'PAID'},
        ):
            res = self.client.post(
                '/api/subscriptions/ikhokha/webhook/',
                data=raw,
                content_type='application/json',
                HTTP_IK_SIGN=sig,
                HTTP_IK_APPID='IKAPPID',
            )
        self.assertEqual(res.status_code, 200)
        payment.subscription.refresh_from_db()
        self.assertEqual(payment.subscription.subscription_ends_at, ends)

        res = self.client.post(
            '/api/subscriptions/ikhokha/webhook/',
            data=raw,
            content_type='application/json',
            HTTP_IK_SIGN='deadbeef',
            HTTP_IK_APPID='IKAPPID',
        )
        self.assertEqual(res.status_code, 403)

        self._auth(self.user_token)
        with patch(
            'subscriptions.payment_views.create_payment_link',
            return_value={'paylink_url': 'https://securepay.ikhokha.red/fail1', 'paylink_id': 'fail1', 'external_id': 'y'},
        ):
            res = self.client.post('/api/subscriptions/payments/create-session/', {}, format='json')
        fail_id = res.data['id']
        with patch(
            'subscriptions.payment_views.get_payment_status',
            return_value={'paylink_id': 'fail1', 'status': 'FAILED'},
        ):
            res = self.client.post(f'/api/subscriptions/payments/{fail_id}/sync/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        failed = SubscriptionPayment.objects.get(pk=fail_id)
        self.assertEqual(failed.status, 'failed')
        self.assertIsNone(failed.activated_at)

    def test_illegal_transition_rejected(self):
        from subscriptions.models import InvalidPaymentTransition, MobileAppSubscription, SubscriptionPayment
        from subscriptions.payments import new_external_id

        sub = MobileAppSubscription.objects.create(user=self.user, status='expired')
        payment = SubscriptionPayment.objects.create(
            user=self.user,
            subscription=sub,
            plan_tier='premium',
            amount=Decimal('180.00'),
            currency='ZAR',
            plan_amount=Decimal('180.00'),
            plan_currency='ZAR',
            method='card',
            gateway='ikhokha',
            status='paid',
            external_id=new_external_id(),
        )
        with self.assertRaises(InvalidPaymentTransition):
            payment.transition('failed')

    def test_admin_payments_summary(self):
        self._auth(self.admin_token)
        res = self.client.get('/api/subscriptions/admin/payments/summary/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('total', res.data)
        self.assertIn('paid', res.data)

