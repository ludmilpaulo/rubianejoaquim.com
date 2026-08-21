"""Compare locale catalogs so missing UI keys are visible to admins."""

from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings

from config.locales import DEFAULT_LOCALE, SUPPORTED_LOCALES


def _flatten(obj, prefix=''):
    items = {}
    if isinstance(obj, dict):
        for key, value in obj.items():
            path = f'{prefix}.{key}' if prefix else str(key)
            items.update(_flatten(value, path))
    else:
        items[prefix] = obj
    return items


def compute_coverage() -> dict:
    frontend_dir = Path(settings.BASE_DIR).parent / 'frontend' / 'lib' / 'i18n' / 'messages'
    catalogs = {}
    if frontend_dir.exists():
        for locale in SUPPORTED_LOCALES:
            path = frontend_dir / f'{locale}.json'
            if path.exists():
                catalogs[locale] = json.loads(path.read_text(encoding='utf-8'))
    if not catalogs:
        return {
            'available': False,
            'note': 'Frontend message catalogs are not on this server.',
            'locales': list(SUPPORTED_LOCALES),
            'coverage': {},
            'missing': {},
        }

    base = _flatten(catalogs.get(DEFAULT_LOCALE) or catalogs[next(iter(catalogs))])
    coverage = {}
    missing = {}
    for locale in SUPPORTED_LOCALES:
        flat = _flatten(catalogs.get(locale) or {})
        miss = sorted(k for k in base if k not in flat)
        extra_empty = sorted(k for k, v in flat.items() if v == '' or v is None)
        coverage[locale] = round(100 * (1 - len(miss) / max(len(base), 1)), 1)
        missing[locale] = miss + extra_empty
    return {
        'available': True,
        'locales': list(SUPPORTED_LOCALES),
        'default': DEFAULT_LOCALE,
        'total_keys': len(base),
        'coverage': coverage,
        'missing': missing,
    }
