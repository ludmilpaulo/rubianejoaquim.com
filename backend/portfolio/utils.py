"""Translation helpers for multilingual portfolio content."""

from typing import Any

SUPPORTED_LOCALES = ('pt', 'en', 'fr', 'es')
DEFAULT_LOCALE = 'pt'


def normalize_locale(lang: str | None) -> str:
    if not lang:
        return DEFAULT_LOCALE
    code = lang.lower().split('-')[0]
    return code if code in SUPPORTED_LOCALES else DEFAULT_LOCALE


def get_translated(
    translations: dict[str, Any] | None,
    field: str,
    lang: str,
    fallback: str = '',
) -> str:
    """Return translated field with Portuguese fallback."""
    if not translations:
        return fallback
    locale = normalize_locale(lang)
    value = translations.get(locale, {}).get(field)
    if value:
        return str(value)
    value = translations.get(DEFAULT_LOCALE, {}).get(field)
    return str(value) if value else fallback


PORTFOLIO_CATEGORY_LABELS: dict[str, dict[str, str]] = {
    'campaign_videos': {
        'pt': 'Vídeos de Campanha',
        'en': 'Campaign Videos',
        'fr': 'Vidéos de campagne',
        'es': 'Videos de campaña',
    },
    'interviews': {
        'pt': 'Entrevistas',
        'en': 'Interviews',
        'fr': 'Interviews',
        'es': 'Entrevistas',
    },
    'social_reels': {
        'pt': 'Reels',
        'en': 'Social Media Reels',
        'fr': 'Reels',
        'es': 'Reels',
    },
    'canva_designs': {
        'pt': 'Design Canva',
        'en': 'Canva Designs',
        'fr': 'Designs Canva',
        'es': 'Diseños Canva',
    },
    'scriptwriting': {
        'pt': 'Roteiros',
        'en': 'Scriptwriting',
        'fr': 'Scénarios',
        'es': 'Guiones',
    },
    'zenda_content': {
        'pt': 'Conteúdo Zenda',
        'en': 'Zenda Content',
        'fr': 'Contenu Zenda',
        'es': 'Contenido Zenda',
    },
}


def portfolio_category_label(category: str, lang: str) -> str:
    locale = normalize_locale(lang)
    labels = PORTFOLIO_CATEGORY_LABELS.get(category, {})
    return labels.get(locale) or labels.get(DEFAULT_LOCALE) or category.replace('_', ' ').title()


def localize_item(item: dict[str, Any], lang: str, text_fields: list[str]) -> dict[str, Any]:
    """Merge translations into top-level fields for API responses."""
    translations = item.pop('translations', None) or {}
    result = {**item}
    for field in text_fields:
        result[field] = get_translated(translations, field, lang, result.get(field, ''))
    return result
