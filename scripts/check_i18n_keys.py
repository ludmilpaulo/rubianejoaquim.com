#!/usr/bin/env python3
"""Fail if en/pt/fr/es translation key trees differ (mobile catalogs + web JSON)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ('en', 'pt', 'fr', 'es')

IDENT = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')


def flatten_json(obj, prefix=''):
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            path = f'{prefix}.{k}' if prefix else str(k)
            if isinstance(v, dict):
                keys |= flatten_json(v, path)
            else:
                keys.add(path)
    return keys


def _skip_string(text: str, i: int) -> int:
    quote = text[i]
    i += 1
    while i < len(text):
        if text[i] == '\\':
            i += 2
            continue
        if text[i] == quote:
            return i + 1
        i += 1
    return i


def flatten_ts_object(text: str, start: int = 0) -> set[str]:
    """Flatten unquoted TS object keys from the first `{` after start."""
    i = text.find('{', start)
    if i < 0:
        return set()
    keys: set[str] = set()
    stack: list[str] = []
    n = len(text)
    i += 1
    while i < n:
        ch = text[i]
        if ch in ' \t\r\n':
            i += 1
            continue
        if ch == '/' and i + 1 < n and text[i + 1] == '/':
            i = text.find('\n', i)
            if i < 0:
                break
            continue
        if ch == '/' and i + 1 < n and text[i + 1] == '*':
            end = text.find('*/', i + 2)
            i = n if end < 0 else end + 2
            continue
        if ch in '\'"`':
            i = _skip_string(text, i)
            continue
        if ch == '}':
            if stack:
                stack.pop()
            i += 1
            continue
        if ch == '{':
            i += 1
            continue
        if ch == ',':
            i += 1
            continue
        m = IDENT.match(text, i)
        if m:
            name = m.group(0)
            j = m.end()
            while j < n and text[j] in ' \t':
                j += 1
            if j < n and text[j] == ':':
                j += 1
                while j < n and text[j] in ' \t\r\n':
                    j += 1
                path = '.'.join(stack + [name])
                if j < n and text[j] == '{':
                    stack.append(name)
                    i = j + 1
                    continue
                keys.add(path)
                i = j
                continue
        i += 1
    return keys


def compare(label: str, by_locale: dict[str, set[str]]) -> list[str]:
    errors = []
    base = by_locale.get('en') or next(iter(by_locale.values()), set())
    for loc, keys in by_locale.items():
        missing = sorted(base - keys)
        extra = sorted(keys - base)
        if missing:
            errors.append(f'{label} missing in {loc}: {", ".join(missing[:40])}')
        if extra:
            errors.append(f'{label} extra in {loc}: {", ".join(extra[:40])}')
    return errors


def main() -> int:
    errors: list[str] = []

    web_dir = ROOT / 'frontend' / 'lib' / 'i18n' / 'messages'
    web = {}
    for loc in LOCALES:
        path = web_dir / f'{loc}.json'
        web[loc] = flatten_json(json.loads(path.read_text(encoding='utf-8')))
    errors.extend(compare('web', web))

    mobile_locales = ROOT / 'mobile' / 'src' / 'i18n' / 'locales'
    mobile = {}
    for loc in LOCALES:
        text = (mobile_locales / f'{loc}.ts').read_text(encoding='utf-8')
        mobile[loc] = flatten_ts_object(text)
    errors.extend(compare('mobile locales', mobile))

    common = (ROOT / 'mobile' / 'src' / 'i18n' / 'commonScreens.ts').read_text(encoding='utf-8')
    common_keys = {}
    for loc in LOCALES:
        marker = f'  {loc}: {{'
        idx = common.find(marker)
        if idx < 0:
            errors.append(f'commonScreens missing locale {loc}')
            continue
        common_keys[loc] = flatten_ts_object(common, idx)
    errors.extend(compare('mobile commonScreens', common_keys))

    if errors:
        print('i18n key mismatch:')
        for err in errors:
            print(f'  - {err}')
        return 1
    print('i18n keys match across en/pt/fr/es (web + mobile).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
