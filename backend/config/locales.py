"""Single source of truth for Zenda supported UI locales."""

from typing import Any

SUPPORTED_LOCALES = ('pt', 'en', 'fr', 'es')
DEFAULT_LOCALE = 'pt'

LOCALE_LABELS = {
    'pt': 'Português',
    'en': 'English',
    'fr': 'Français',
    'es': 'Español',
}


def normalize_locale(lang: str | None) -> str:
    if not lang:
        return DEFAULT_LOCALE
    code = str(lang).lower().split('-')[0].strip()
    return code if code in SUPPORTED_LOCALES else DEFAULT_LOCALE


def supported_locales_payload() -> dict[str, Any]:
    return {
        'locales': list(SUPPORTED_LOCALES),
        'default': DEFAULT_LOCALE,
        'labels': LOCALE_LABELS,
    }
