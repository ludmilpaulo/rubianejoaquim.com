"""
Live FX refresh into ExchangeRate cache.

Architecture (mandatory):
  Reliable market source → Zenda backend cache → Android/iOS

Primary: open.er-api.com (ExchangeRate-API free tier, USD base, broad coverage
including AOA / ZAR / MZN). No API key required for the open endpoint.
Fallback: Frankfurter (ECB reference rates, https://www.frankfurter.app/).

Rules:
- Never invent rates locally.
- Never present yesterday's rate as "today" without the real provider timestamp.
- On provider failure: serve last valid cache and mark stale=True.
- Weekends/holidays: show last available market rate with provider_updated_at.
- seed_exchange_rates is emergency bootstrap only (source='seed').
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from accounts.currency_defaults import SUPPORTED_CURRENCIES
from finance.models import ExchangeRate

logger = logging.getLogger(__name__)

# How long cached rates are considered "fresh" before a refresh is preferred.
FX_CACHE_TTL = timedelta(hours=int(getattr(settings, 'FX_CACHE_TTL_HOURS', 6) or 6))

CACHE_SOURCE_KEY = 'zenda_fx_source'
CACHE_PROVIDER_TS_KEY = 'zenda_fx_provider_updated_at'
CACHE_REFRESHED_KEY = 'zenda_fx_refreshed_at'


def _http_get_json(url: str, timeout: int = 12) -> dict[str, Any]:
    req = Request(url, headers={'User-Agent': 'ZendaFX/1.0', 'Accept': 'application/json'})
    with urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode('utf-8')
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError('FX provider returned non-object JSON')
    return data


def _parse_provider_timestamp(raw: Any) -> datetime | None:
    """Normalize provider timestamps to timezone-aware UTC datetimes."""
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return datetime.fromtimestamp(float(raw), tz=dt_timezone.utc)
    if isinstance(raw, str):
        text = raw.strip()
        # Frankfurter uses YYYY-MM-DD (ECB reference date)
        if len(text) == 10 and text[4] == '-' and text[7] == '-':
            try:
                day = datetime.strptime(text, '%Y-%m-%d').replace(tzinfo=dt_timezone.utc)
                return day
            except ValueError:
                pass
        parsed = parse_datetime(text.replace('Z', '+00:00'))
        if parsed is not None:
            if timezone.is_naive(parsed):
                return timezone.make_aware(parsed, dt_timezone.utc)
            return parsed
        # open.er-api style: "Fri, 27 Mar 2020 00:00:00 +0000"
        for fmt in (
            '%a, %d %b %Y %H:%M:%S %z',
            '%Y-%m-%dT%H:%M:%S%z',
            '%Y-%m-%d %H:%M:%S%z',
        ):
            try:
                return datetime.strptime(text, fmt)
            except ValueError:
                continue
    return None


def fetch_usd_rates_open_er() -> tuple[dict[str, Decimal], str, datetime | None]:
    """Returns (rates_from_usd, source_label, provider_updated_at)."""
    url = 'https://open.er-api.com/v6/latest/USD'
    data = _http_get_json(url)
    result = data.get('result')
    if result and str(result).lower() != 'success':
        raise ValueError(f'open.er-api error: {result}')
    rates_raw = data.get('rates') or {}
    rates = {
        code: Decimal(str(val))
        for code, val in rates_raw.items()
        if code in SUPPORTED_CURRENCIES
    }
    rates['USD'] = Decimal('1')
    provider_ts = _parse_provider_timestamp(
        data.get('time_last_update_unix') or data.get('time_last_update_utc')
    )
    return rates, 'open.er-api.com', provider_ts


def fetch_usd_rates_frankfurter() -> tuple[dict[str, Decimal], str, datetime | None]:
    """Returns (rates_from_usd, source_label, provider_updated_at). ECB reference rates."""
    symbols = ','.join(sorted(c for c in SUPPORTED_CURRENCIES if c != 'USD'))
    url = f'https://api.frankfurter.app/latest?from=USD&to={symbols}'
    data = _http_get_json(url)
    rates_raw = data.get('rates') or {}
    rates = {code: Decimal(str(val)) for code, val in rates_raw.items()}
    rates['USD'] = Decimal('1')
    provider_ts = _parse_provider_timestamp(data.get('date'))
    return rates, 'frankfurter.app (ECB)', provider_ts


def fetch_live_usd_rates() -> tuple[dict[str, Decimal], str, datetime | None]:
    errors: list[str] = []
    # Prefer open.er-api for broader coverage (AOA/MZN/ZAR); Frankfurter (ECB) as fallback.
    for fetcher in (fetch_usd_rates_open_er, fetch_usd_rates_frankfurter):
        try:
            return fetcher()
        except (URLError, HTTPError, TimeoutError, ValueError, KeyError, json.JSONDecodeError, OSError) as exc:
            errors.append(f'{fetcher.__name__}: {exc}')
            logger.warning('FX fetch failed via %s: %s', fetcher.__name__, exc)
    raise RuntimeError('All FX providers failed: ' + '; '.join(errors))


def upsert_usd_rates(
    rates: dict[str, Decimal],
    source: str,
    provider_updated_at: datetime | None,
    *,
    retained_codes: set[str] | None = None,
) -> int:
    """
    Upsert USD→X rates. Codes in retained_codes keep their previous source
    (e.g. seed-retained AOA when a provider omitted them).
    """
    retained = retained_codes or set()
    count = 0
    for target, rate in rates.items():
        if target not in SUPPORTED_CURRENCIES:
            continue
        row_source = source
        row_provider_ts = provider_updated_at
        if target in retained:
            existing = ExchangeRate.objects.filter(
                base_currency='USD', target_currency=target
            ).first()
            if existing:
                row_source = existing.source or 'seed'
                row_provider_ts = existing.provider_updated_at
        ExchangeRate.objects.update_or_create(
            base_currency='USD',
            target_currency=target,
            defaults={
                'rate': rate,
                'source': row_source,
                'provider_updated_at': row_provider_ts,
            },
        )
        count += 1

    cache.set(CACHE_SOURCE_KEY, source, timeout=60 * 60 * 24 * 7)
    if provider_updated_at is not None:
        cache.set(
            CACHE_PROVIDER_TS_KEY,
            provider_updated_at.isoformat(),
            timeout=60 * 60 * 24 * 7,
        )
    cache.set(CACHE_REFRESHED_KEY, timezone.now().isoformat(), timeout=60 * 60 * 24 * 7)
    return count


def _latest_row() -> ExchangeRate | None:
    return ExchangeRate.objects.order_by('-updated_at').first()


def _provider_ts_from_row(row: ExchangeRate | None) -> datetime | None:
    if not row:
        return None
    return row.provider_updated_at or row.updated_at


def is_rate_stale(as_of: datetime | None = None) -> bool:
    """True when cache age exceeds TTL or rates are seed-only / missing."""
    latest = _latest_row()
    if not latest:
        return True
    # Seed-only rows are never "live market"
    if (latest.source or '').lower() in ('seed', ''):
        # If any live-sourced row exists, use that for freshness
        live = (
            ExchangeRate.objects.exclude(source='')
            .exclude(source__iexact='seed')
            .order_by('-updated_at')
            .first()
        )
        if not live:
            return True
        latest = live
    ts = _provider_ts_from_row(latest) or latest.updated_at
    if not ts:
        return True
    now = as_of or timezone.now()
    return (now - ts) > FX_CACHE_TTL


def get_fx_meta(*, stale_override: bool | None = None) -> dict[str, Any]:
    """Metadata for clients: source, timestamps, stale flag."""
    latest = _latest_row()
    live = (
        ExchangeRate.objects.exclude(source='')
        .exclude(source__iexact='seed')
        .order_by('-updated_at')
        .first()
    )
    sample = live or latest
    source = (
        (sample.source if sample and sample.source else None)
        or cache.get(CACHE_SOURCE_KEY)
        or ('seed' if latest else 'unavailable')
    )
    provider_ts = _provider_ts_from_row(sample)
    stale = is_rate_stale() if stale_override is None else stale_override
    return {
        'base': 'USD',
        'source': source,
        'updated_at': provider_ts.isoformat() if provider_ts else (
            latest.updated_at.isoformat() if latest and latest.updated_at else None
        ),
        'provider_updated_at': provider_ts.isoformat() if provider_ts else None,
        'cached_at': latest.updated_at.isoformat() if latest and latest.updated_at else None,
        'stale': stale,
        'ttl_hours': int(FX_CACHE_TTL.total_seconds() // 3600),
    }


def refresh_exchange_rates(*, force: bool = False) -> dict[str, Any]:
    """
    Refresh ExchangeRate table from live market providers.
    If not force and rates are fresh, skip network and return cached metadata.
    On failure: keep last valid cache and return stale=True.
    """
    latest = _latest_row()
    if (
        not force
        and latest
        and not is_rate_stale()
    ):
        meta = get_fx_meta(stale_override=False)
        return {
            'refreshed': False,
            'count': ExchangeRate.objects.filter(base_currency='USD').count(),
            **meta,
        }

    try:
        rates, source, provider_ts = fetch_live_usd_rates()
        existing = {
            row.target_currency: row
            for row in ExchangeRate.objects.filter(base_currency='USD')
        }
        retained: set[str] = set()
        for code in SUPPORTED_CURRENCIES:
            if code not in rates and code in existing:
                rates[code] = existing[code].rate
                retained.add(code)
        count = upsert_usd_rates(rates, source, provider_ts, retained_codes=retained)
        meta = get_fx_meta(stale_override=False)
        return {
            'refreshed': True,
            'count': count,
            'missing': sorted(retained),
            **meta,
        }
    except Exception as exc:
        logger.error('FX refresh failed: %s', exc, exc_info=True)
        meta = get_fx_meta(stale_override=True)
        return {
            'refreshed': False,
            'count': ExchangeRate.objects.filter(base_currency='USD').count(),
            'error': str(exc),
            **meta,
        }


def get_cross_rate(from_cur: str, to_cur: str) -> tuple[Decimal, ExchangeRate | None] | None:
    """
    Resolve rate from→to using direct, inverse, or USD pivot.
    Returns (rate, sample_row_for_metadata) or None.
    Never invents a rate.
    """
    from_cur = from_cur.upper()
    to_cur = to_cur.upper()
    if from_cur == to_cur:
        return Decimal('1'), None

    direct = ExchangeRate.objects.filter(base_currency=from_cur, target_currency=to_cur).first()
    if direct:
        return direct.rate, direct

    inverse = ExchangeRate.objects.filter(base_currency=to_cur, target_currency=from_cur).first()
    if inverse and inverse.rate != 0:
        return (Decimal('1') / inverse.rate), inverse

    if from_cur == 'USD':
        to_row = ExchangeRate.objects.filter(base_currency='USD', target_currency=to_cur).first()
        if to_row:
            return to_row.rate, to_row
    if to_cur == 'USD':
        from_row = ExchangeRate.objects.filter(base_currency='USD', target_currency=from_cur).first()
        if from_row and from_row.rate != 0:
            return (Decimal('1') / from_row.rate), from_row

    from_row = ExchangeRate.objects.filter(base_currency='USD', target_currency=from_cur).first()
    to_row = ExchangeRate.objects.filter(base_currency='USD', target_currency=to_cur).first()
    if from_row and to_row and from_row.rate != 0:
        rate = to_row.rate / from_row.rate
        sample = (
            to_row
            if (to_row.updated_at or timezone.now()) >= (from_row.updated_at or timezone.now())
            else from_row
        )
        return rate, sample

    return None


def convert_amount(
    amount: Decimal | float | str | int,
    from_cur: str,
    to_cur: str,
) -> dict[str, Any] | None:
    """
    Convert amount using cached market rates.
    Returns original + converted + rate metadata. Never invents rates.
    """
    try:
        amt = Decimal(str(amount))
    except Exception:
        return None
    from_cur = (from_cur or 'USD').upper()
    to_cur = (to_cur or 'USD').upper()
    meta = get_fx_meta()
    if from_cur == to_cur:
        q = amt.quantize(Decimal('0.01'))
        return {
            'amount': amt,
            'currency': from_cur,
            'converted_amount': q,
            'display_currency': to_cur,
            'exchange_rate': Decimal('1'),
            'updated_at': meta.get('updated_at'),
            'provider_updated_at': meta.get('provider_updated_at'),
            'source': meta.get('source'),
            'stale': meta.get('stale', False),
        }
    resolved = get_cross_rate(from_cur, to_cur)
    if not resolved:
        return None
    rate, sample = resolved
    converted = (amt * rate).quantize(Decimal('0.01'))
    sample_ts = None
    sample_source = meta.get('source')
    if sample is not None:
        sample_ts = sample.provider_updated_at or sample.updated_at
        if sample.source:
            sample_source = sample.source
    return {
        'amount': amt,
        'currency': from_cur,
        'converted_amount': converted,
        'display_currency': to_cur,
        'exchange_rate': rate.quantize(Decimal('0.00000001')),
        'updated_at': sample_ts.isoformat() if sample_ts else meta.get('updated_at'),
        'provider_updated_at': (
            sample.provider_updated_at.isoformat()
            if sample and sample.provider_updated_at
            else meta.get('provider_updated_at')
        ),
        'source': sample_source,
        'stale': meta.get('stale', False),
    }


def sum_in_currency(rows: list[tuple[Decimal | float | str, str]], target_currency: str) -> Decimal:
    """Sum (amount, currency) pairs into target_currency. Skips rows that cannot convert."""
    total = Decimal('0.00')
    target = (target_currency or 'USD').upper()
    for amount, currency in rows:
        result = convert_amount(amount, currency or target, target)
        if result:
            total += result['converted_amount']
        else:
            if (currency or target).upper() == target:
                try:
                    total += Decimal(str(amount)).quantize(Decimal('0.01'))
                except Exception:
                    pass
    return total.quantize(Decimal('0.01'))


def snapshot_usd_rate(currency: str) -> Decimal | None:
    """USD→currency rate snapshot for write-time storage, or None if unavailable."""
    code = (currency or 'USD').upper()
    if code == 'USD':
        return Decimal('1')
    row = ExchangeRate.objects.filter(base_currency='USD', target_currency=code).first()
    if row:
        return row.rate
    return None
