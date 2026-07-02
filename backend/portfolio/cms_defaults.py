"""Fallback CMS payloads when production DB is missing nav/hero/SEO rows."""

from __future__ import annotations

from typing import Any

from .utils import get_translated, normalize_locale

_DEFAULT_NAV_SPECS: list[dict[str, Any]] = [
    {
        'id': -1,
        'url': '/',
        'order': 0,
        'placement': 'both',
        'open_in_new_tab': False,
        'is_active': True,
        'translations': {
            'pt': {'label': 'Início'},
            'en': {'label': 'Home'},
            'fr': {'label': 'Accueil'},
            'es': {'label': 'Inicio'},
        },
    },
    {
        'id': -2,
        'url': '/portfolio',
        'order': 1,
        'placement': 'header',
        'open_in_new_tab': False,
        'is_active': True,
        'translations': {
            'pt': {'label': 'Portfólio'},
            'en': {'label': 'Portfolio'},
            'fr': {'label': 'Portfolio'},
            'es': {'label': 'Portafolio'},
        },
    },
    {
        'id': -3,
        'url': '/cursos',
        'order': 2,
        'placement': 'header',
        'open_in_new_tab': False,
        'is_active': True,
        'translations': {
            'pt': {'label': 'Cursos'},
            'en': {'label': 'Courses'},
            'fr': {'label': 'Cours'},
            'es': {'label': 'Cursos'},
        },
    },
    {
        'id': -4,
        'url': '/zenda',
        'order': 3,
        'placement': 'header',
        'open_in_new_tab': False,
        'is_active': True,
        'translations': {
            'pt': {'label': 'Zenda'},
            'en': {'label': 'Zenda'},
            'fr': {'label': 'Zenda'},
            'es': {'label': 'Zenda'},
        },
    },
    {
        'id': -5,
        'url': '/contact',
        'order': 4,
        'placement': 'header',
        'open_in_new_tab': False,
        'is_active': True,
        'translations': {
            'pt': {'label': 'Contacto'},
            'en': {'label': 'Contact'},
            'fr': {'label': 'Contact'},
            'es': {'label': 'Contacto'},
        },
    },
]

_HERO_TRANSLATIONS: dict[str, dict[str, Any]] = {
    'pt': {
        'title': 'Produtora de Vídeo Criativo',
        'subtitle': '& Marketing Campaign Storyteller',
        'badge': 'Creative Video · Marketing · Storytelling',
        'body': 'Ajudo marcas a criar campanhas em vídeo, entrevistas, reels, roteiros e narrativas que conectam com audiências internacionais.',
        'roles': ['Produtora de Vídeo', 'Roteirista', 'Entrevistas', 'CapCut & Canva', 'Redes Sociais', 'Criadora do Zenda'],
        'ctas': [
            {'key': 'portfolio', 'label': 'Ver Portfólio', 'url': '/portfolio', 'variant': 'secondary'},
            {'key': 'work', 'label': 'Trabalhar Comigo', 'url': '/contact', 'variant': 'primary'},
            {'key': 'zenda', 'label': 'Explorar Zenda', 'url': '/zenda', 'variant': 'outline'},
        ],
    },
    'en': {
        'title': 'Creative Video Producer',
        'subtitle': '& Campaign Storyteller',
        'badge': 'Creative Video · Marketing · Storytelling',
        'body': 'I help brands create video campaigns, interviews, reels, scripts, and stories that connect with international audiences.',
        'roles': ['Video Producer', 'Scriptwriter', 'Interviews', 'CapCut & Canva', 'Social Media', 'Creator of Zenda'],
        'ctas': [
            {'key': 'portfolio', 'label': 'View Portfolio', 'url': '/portfolio', 'variant': 'secondary'},
            {'key': 'work', 'label': 'Work With Me', 'url': '/contact', 'variant': 'primary'},
            {'key': 'zenda', 'label': 'Explore Zenda', 'url': '/zenda', 'variant': 'outline'},
        ],
    },
}

_SEO_TRANSLATIONS: dict[str, dict[str, str]] = {
    'pt': {
        'title': 'Rubiane Joaquim | Produção de Vídeo & Educação Financeira',
        'description': 'Produção criativa de vídeo, storytelling de marketing e educação financeira com a app Zenda.',
    },
    'en': {
        'title': 'Rubiane Joaquim | Video Production & Financial Education',
        'description': 'Creative video production, marketing storytelling, and financial education with the Zenda app.',
    },
    'fr': {
        'title': 'Rubiane Joaquim | Production vidéo & éducation financière',
        'description': 'Production vidéo créative, storytelling marketing et éducation financière avec Zenda.',
    },
    'es': {
        'title': 'Rubiane Joaquim | Producción de video y educación financiera',
        'description': 'Producción de video creativa, storytelling de marketing y educación financiera con Zenda.',
    },
}


def _localized_block(translations: dict[str, dict[str, Any]], lang: str) -> dict[str, Any]:
    locale = normalize_locale(lang)
    block = translations.get(locale) or translations.get('pt') or {}
    return block if isinstance(block, dict) else {}


def default_navigation(lang: str | None, placement: str | None = None) -> list[dict[str, Any]]:
    locale = normalize_locale(lang)
    items: list[dict[str, Any]] = []
    for spec in _DEFAULT_NAV_SPECS:
        if placement and spec['placement'] not in (placement, 'both'):
            continue
        items.append({
            'id': spec['id'],
            'url': spec['url'],
            'order': spec['order'],
            'placement': spec['placement'],
            'open_in_new_tab': spec['open_in_new_tab'],
            'is_active': spec['is_active'],
            'label': get_translated(spec['translations'], 'label', locale, spec['url']),
        })
    return sorted(items, key=lambda item: item['order'])


def default_home_seo(lang: str | None) -> dict[str, str]:
    locale = normalize_locale(lang)
    block = _SEO_TRANSLATIONS.get(locale) or _SEO_TRANSLATIONS['pt']
    return {
        'title': block['title'],
        'description': block['description'],
        'og_title': block['title'],
        'og_description': block['description'],
    }


def default_hero_section(lang: str | None) -> dict[str, Any]:
    locale = normalize_locale(lang)
    block = _localized_block(_HERO_TRANSLATIONS, locale)
    return {
        'id': 0,
        'section_key': 'hero',
        'is_active': True,
        'extra_data': {},
        'title': block.get('title', ''),
        'subtitle': block.get('subtitle', ''),
        'badge': block.get('badge', ''),
        'body': block.get('body', ''),
        'roles': block.get('roles', []),
        'ctas': block.get('ctas', []),
        'trust_items': block.get('trust_items', []),
    }


def apply_homepage_defaults(payload: dict[str, Any], lang: str | None) -> dict[str, Any]:
    """Fill sparse homepage payloads so the public site stays usable."""
    if not payload.get('navigation'):
        payload['navigation'] = default_navigation(lang)

    seo = payload.get('seo') or {}
    if not seo.get('title') and not seo.get('og_title'):
        payload['seo'] = default_home_seo(lang)

    sections = list(payload.get('sections') or [])
    section_keys = {section.get('section_key') for section in sections}
    if 'hero' not in section_keys:
        sections.insert(0, default_hero_section(lang))
        payload['sections'] = sections
        visibility = dict(payload.get('section_visibility') or {})
        visibility['hero'] = True
        payload['section_visibility'] = visibility

    return payload
