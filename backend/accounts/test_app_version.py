from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class AppVersionApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @override_settings(
        APP_MINIMUM_VERSION_IOS='1.0.0',
        APP_MINIMUM_VERSION_ANDROID='1.0.0',
        APP_LATEST_VERSION_IOS='1.0.9',
        APP_LATEST_VERSION_ANDROID='1.0.9',
        APP_FORCE_UPDATE=False,
        APP_STORE_URL_IOS='https://apps.apple.com/app/id6758412176',
        APP_STORE_URL_ANDROID='https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda',
    )
    def test_app_version_v2_nested_payload(self):
        resp = self.client.get('/api/app/version/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['ios']['minimum_version'], '1.0.0')
        self.assertEqual(data['ios']['latest_version'], '1.0.9')
        self.assertIn('store_url', data['ios'])
        self.assertEqual(data['android']['minimum_version'], '1.0.0')
        self.assertFalse(data['force_update'])
        self.assertIn('en', data['message'])
        self.assertIn('pt', data['message'])
        self.assertIn('fr', data['message'])
        self.assertIn('es', data['message'])

    def test_legacy_app_version_still_flat(self):
        resp = self.client.get('/api/config/app-version/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('ios', data)
        self.assertIn('android', data)
        self.assertIn('ios_store_url', data)
        self.assertNotIn('minimum_version', data)
