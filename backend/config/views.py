"""Simple API views for app config (store version check) and TikTok domain verification."""
from django.conf import settings
from django.http import HttpResponse, JsonResponse


TIKTOK_DOMAIN_VERIFY_BODY = (
    'tiktok-developers-site-verification=FpaaRaUmoGf5Zl6lZ8hX77igVQZVuzJS\n'
)


def tiktok_domain_verification(_request):
    """Serve TikTok website verification on the OAuth callback host (PythonAnywhere)."""
    return HttpResponse(TIKTOK_DOMAIN_VERIFY_BODY, content_type='text/plain; charset=utf-8')


def _app_version_payload() -> dict:
    ios_min = getattr(settings, 'APP_MINIMUM_VERSION_IOS', '1.0.0') or '1.0.0'
    android_min = getattr(settings, 'APP_MINIMUM_VERSION_ANDROID', '1.0.0') or '1.0.0'
    ios_latest = settings.APP_LATEST_VERSION_IOS
    android_latest = settings.APP_LATEST_VERSION_ANDROID
    return {
        'ios': {
            'minimum_version': ios_min,
            'latest_version': ios_latest,
            'store_url': settings.APP_STORE_URL_IOS,
        },
        'android': {
            'minimum_version': android_min,
            'latest_version': android_latest,
            'store_url': settings.APP_STORE_URL_ANDROID,
        },
        'force_update': bool(getattr(settings, 'APP_FORCE_UPDATE', False)),
        'message': {
            'en': getattr(
                settings,
                'APP_UPDATE_MESSAGE_EN',
                'A new version of Zenda is required. Please update to continue.',
            ),
            'pt': getattr(
                settings,
                'APP_UPDATE_MESSAGE_PT',
                'É necessária uma nova versão da Zenda. Atualize para continuar.',
            ),
            'fr': getattr(
                settings,
                'APP_UPDATE_MESSAGE_FR',
                'Une nouvelle version de Zenda est requise. Veuillez mettre à jour pour continuer.',
            ),
            'es': getattr(
                settings,
                'APP_UPDATE_MESSAGE_ES',
                'Se requiere una nueva versión de Zenda. Actualice para continuar.',
            ),
        },
    }


def app_version_v2(_request):
    """Backend-controlled minimum + latest versions. No auth required."""
    return JsonResponse(_app_version_payload())


def app_version(_request):
    """Legacy latest-only payload used by the website download page."""
    payload = _app_version_payload()
    return JsonResponse({
        'ios': payload['ios']['latest_version'],
        'android': payload['android']['latest_version'],
        'ios_store_url': payload['ios']['store_url'],
        'android_store_url': payload['android']['store_url'],
    })
