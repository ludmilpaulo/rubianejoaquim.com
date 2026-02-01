"""Simple API views for app config (e.g. store version check)."""
from django.http import JsonResponse
from django.conf import settings


def app_version(request):
    """Return latest app versions for store update check. No auth required."""
    return JsonResponse({
        'ios': settings.APP_LATEST_VERSION_IOS,
        'android': settings.APP_LATEST_VERSION_ANDROID,
        'ios_store_url': settings.APP_STORE_URL_IOS,
        'android_store_url': settings.APP_STORE_URL_ANDROID,
    })
