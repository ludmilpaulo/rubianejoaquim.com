"""Translation helpers for multilingual portfolio content."""

from typing import Any

from config.locales import SUPPORTED_LOCALES, DEFAULT_LOCALE, normalize_locale


def get_locale_block(translations: dict[str, Any] | None, lang: str | None) -> dict[str, Any]:
    """Return the locale block, supporting both CMS and legacy field-map shapes."""
    if not translations:
        return {}
    locale = normalize_locale(lang)
    block = translations.get(locale)
    if isinstance(block, dict):
        return block
    fallback = translations.get(DEFAULT_LOCALE)
    if isinstance(fallback, dict):
        return fallback

    # Legacy seed shape: {"title": {"pt": "...", "en": "..."}}.
    legacy: dict[str, Any] = {}
    for field, values in translations.items():
        if isinstance(values, dict):
            value = values.get(locale) or values.get(DEFAULT_LOCALE)
            if value is not None:
                legacy[field] = value
    return legacy


def get_translated(
    translations: dict[str, Any] | None,
    field: str,
    lang: str,
    fallback: str = '',
) -> str:
    """Return translated field with Portuguese fallback."""
    if not translations:
        return fallback
    block = get_locale_block(translations, lang)
    value = block.get(field)
    if value:
        return str(value)
    value = get_locale_block(translations, DEFAULT_LOCALE).get(field)
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
