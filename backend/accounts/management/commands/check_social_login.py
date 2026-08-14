"""Print social-login configuration status without revealing secrets."""

from django.conf import settings
from django.core.management.base import BaseCommand


def _present(value) -> bool:
    return bool(str(value or '').strip())


def _public_id(value) -> str:
    raw = str(value or '').strip()
    if not raw:
        return '(empty)'
    if ',' in raw:
        parts = [p.strip() for p in raw.split(',') if p.strip()]
        return f'{len(parts)} id(s) set'
    if len(raw) <= 16:
        return raw
    return f'{raw[:12]}…{raw[-8:]}'


class Command(BaseCommand):
    help = 'Audit Google / Facebook / TikTok / Apple social login env (no secrets printed).'

    def handle(self, *args, **options):
        google_web = getattr(settings, 'GOOGLE_CLIENT_ID', '') or ''
        google_ios = getattr(settings, 'GOOGLE_CLIENT_ID_IOS', '') or ''
        google_android = getattr(settings, 'GOOGLE_CLIENT_ID_ANDROID', '') or ''
        fb_id = getattr(settings, 'FACEBOOK_APP_ID', '') or ''
        fb_secret = getattr(settings, 'FACEBOOK_APP_SECRET', '') or ''
        tt_key = getattr(settings, 'TIKTOK_CLIENT_KEY', '') or ''
        tt_secret = getattr(settings, 'TIKTOK_CLIENT_SECRET', '') or ''
        tt_redirect = getattr(settings, 'TIKTOK_REDIRECT_URI', '') or ''
        api_public = getattr(settings, 'API_PUBLIC_URL', '') or ''
        frontend = getattr(settings, 'FRONTEND_URL', '') or ''
        mobile_redirect = getattr(settings, 'MOBILE_OAUTH_REDIRECT_URI', '') or ''
        apple_bundle = getattr(settings, 'APPLE_BUNDLE_ID', '') or ''

        fallback_tt = ''
        if not tt_redirect and api_public:
            fallback_tt = f'{api_public.rstrip("/")}/api/auth/social/tiktok/callback/'

        rows = [
            ('Google enabled', 'yes' if google_web else 'NO — GOOGLE_CLIENT_ID missing'),
            ('Google web client', _public_id(google_web)),
            ('Google iOS client', _public_id(google_ios)),
            ('Google Android client', _public_id(google_android)),
            ('Google client secret', 'set' if _present(getattr(settings, 'GOOGLE_CLIENT_SECRET', '')) else 'not set (ok for ID-token flow)'),
            ('Facebook enabled', 'yes' if fb_id and fb_secret else 'NO — need FACEBOOK_APP_ID + FACEBOOK_APP_SECRET'),
            ('Facebook app id', _public_id(fb_id)),
            ('Facebook app secret', 'set' if _present(fb_secret) else 'MISSING'),
            ('TikTok enabled', 'yes' if tt_key and tt_secret else 'NO — need TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET'),
            ('TikTok client key', _public_id(tt_key)),
            ('TikTok client secret', 'set' if _present(tt_secret) else 'MISSING'),
            ('TikTok redirect URI', tt_redirect or fallback_tt or '(empty)'),
            ('API_PUBLIC_URL', api_public or '(empty)'),
            ('FRONTEND_URL', frontend or '(empty)'),
            ('MOBILE_OAUTH_REDIRECT_URI', mobile_redirect or '(empty)'),
            ('Apple bundle / audience', apple_bundle or 'com.rubianejoaquim.zenda'),
        ]

        self.stdout.write(self.style.NOTICE('Social login configuration (secrets never printed)'))
        for label, value in rows:
            self.stdout.write(f'  {label}: {value}')

        expected_tt = 'https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/'
        effective_tt = tt_redirect or fallback_tt
        if effective_tt and effective_tt != expected_tt:
            self.stdout.write(self.style.WARNING(
                f'\nTikTok redirect URI must match the developer portal exactly.\n'
                f'  Expected: {expected_tt}\n'
                f'  Current:  {effective_tt}'
            ))

        if not (google_web and fb_id and fb_secret and tt_key and tt_secret):
            self.stdout.write(self.style.ERROR(
                '\nOne or more providers are disabled. Set the missing env vars on the production host.'
            ))
            return

        self.stdout.write(self.style.SUCCESS('\nAll provider credentials appear set. Still verify consoles (SHA-1, Live mode, TikTok URI).'))
