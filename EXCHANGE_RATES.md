# Zenda Exchange Rates

Official / market-based FX for multi-currency finance.

**Architecture:** FX provider → Django backend cache → Android / iOS / Web.

Converted amounts are **display-only**. Original `amount` + `currency` on every ledger row are never overwritten.

---

## Chosen providers

| Priority | Provider | Endpoint | Auth | Rate type |
|----------|----------|----------|------|-----------|
| **Primary** | [open.er-api.com](https://www.exchangerate-api.com/docs/free) (ExchangeRate-API open access) | `GET https://open.er-api.com/v6/latest/USD` | **None** (no API key) | Latest available market mid rates, USD base |
| **Secondary** | [exchangerate-api.com v4](https://www.exchangerate-api.com/docs/free) | `GET https://api.exchangerate-api.com/v4/latest/USD` | **None** | Same publisher, alternate host |
| **Fallback** | [Frankfurter](https://www.frankfurter.app/) (ECB reference) | `GET https://api.frankfurter.app/latest?from=USD&to=…` | **None** | ECB euro foreign exchange reference rates |

### Why these

1. **No secrets on mobile or web** — rates are fetched only by the Django backend. Do not put FX API keys in React Native, Expo, or `NEXT_PUBLIC_*`.
2. **AOA / ZAR / USD / EUR / GBP** — open.er-api covers Angola (AOA), South Africa (ZAR), and the other supported codes. Frankfurter (ECB) is a strong fallback for major pairs but often **omits AOA / MZN**.
3. **Honest timestamps** — we store `provider_updated_at` from the provider (`time_last_update_*` or ECB `date`). Weekends / holidays show the **last available** quote with that real timestamp — never labeled as a live quote if the calendar date is in the past.
4. **Failure mode** — if all providers fail, the last valid `ExchangeRate` rows are served with `freshness: stale` and the last known `source`.

### Supported currencies (USD pivot)

`AOA`, `USD`, `EUR`, `GBP`, `BRL`, `ZAR`, `MZN`, `CAD`  
(see `accounts.currency_defaults.SUPPORTED_CURRENCIES`)

Cross rates (e.g. ZAR→AOA) use a **USD pivot** from cached rows: `amount × (USD→to / USD→from)`.

---

## Freshness

Clients must distinguish:

| `freshness` | Meaning | Typical UI |
|-------------|---------|------------|
| `live` | Last successful backend fetch &lt; 15 minutes | Last updated: 2 minutes ago |
| `cached` | Last successful fetch within 24 hours | Latest available rate — updated 15 minutes ago |
| `stale` | Seed-only, fetch failed, or last live write &gt; 24 hours | Warn: not a current market quote |
| `unavailable` | No rows at all | Rates unavailable |

`stale: true` is true for `stale` and `unavailable` only. **Do not** treat a daily provider quote timestamp as stale just because it is several hours old — daily APIs often publish once per UTC day. Stale is based on **our last successful write** (`updated_at` / `fetched_at`).

`market_closed: true` when the provider quote calendar date is before today (weekends / holidays).

---

## Cache behaviour

| Setting | Default | Meaning |
|---------|---------|---------|
| `FX_CACHE_TTL_HOURS` | `1` | Soft-refresh: skip outbound provider calls while last live write is this young |
| `FX_STALE_AFTER_HOURS` | `24` | After this, cached live quotes are marked `stale` |

- Soft refresh: any list/convert/supported call may call `refresh_exchange_rates(force=False)`.
- Force refresh: `?refresh=1` on the API, the in-app **Refresh rates** button, or `python manage.py refresh_exchange_rates --force`.
- Each row stores: `rate`, `source` (provider), `provider_updated_at`, `updated_at` (last successful DB write).
- API meta includes: `source`, `updated_at`, `provider_updated_at`, `fetched_at`, `last_successful_update`, `freshness`, `stale`, `market_closed`, `base`.

If a live refresh omits a code (e.g. ECB without AOA), the previous cached value is **retained** and keeps its previous `source`.

---

## API (clients)

| Endpoint | Notes |
|----------|--------|
| `GET /api/finance/exchange-rates/` | List USD-base rates + meta. `?refresh=1` forces live fetch. |
| `GET /api/finance/exchange-rates/convert/?amount=&from=&to=` | Returns original + converted, rate, source, timestamps, freshness. |
| `GET /api/finance/exchange-rates/supported/` | Supported codes + meta. |

Example convert payload:

```json
{
  "original_amount": "100.00",
  "original_currency": "ZAR",
  "converted_amount": "5.50",
  "converted_currency": "USD",
  "amount": "5.50",
  "converted": "5.50",
  "from": "ZAR",
  "to": "USD",
  "rate": "0.05500000",
  "exchange_rate": "0.05500000",
  "rate_line": "1 ZAR = 0.05500000 USD",
  "rate_timestamp": "2026-08-13T00:02:31+00:00",
  "fetched_at": "2026-08-13T19:50:00+00:00",
  "source": "open.er-api.com",
  "freshness": "live",
  "stale": false,
  "market_closed": false
}
```

UI should show, e.g.:

`100 ZAR ≈ $5.50 USD` · `1 ZAR = 0.055 USD` · `Last updated: 2 minutes ago` · `Source: open.er-api.com`

and a clear warning when `freshness` is `stale` / `unavailable`, or when offline.

Web converter: `/zenda/cambio`  
Mobile: Global FX (`MarketScreen`)

---

## Operations

### Bootstrap (empty DB only)

```bash
cd backend && source venv/bin/activate
python manage.py refresh_exchange_rates --force
```

Use `seed_exchange_rates` only if every live provider is down and you need emergency approximate rows (`source=seed`). Those must be shown as stale.

### Production (PythonAnywhere)

After deploy:

```bash
cd ~/rubianejoaquim.com/backend   # or the actual clone path
source venv/bin/activate
git pull
python manage.py migrate finance
python manage.py refresh_exchange_rates --force
# then reload the web app
```

Scheduled task — every hour (align with `FX_CACHE_TTL_HOURS=1`):

```bash
cd /path/to/backend && source venv/bin/activate
python manage.py refresh_exchange_rates --force
```

Until production has `ExchangeRate` rows **and** this backend code, the mobile app will fall back to a local cache and must not claim the quote is live.

---

## What we do **not** do

- Hard-code rates as live truth in the mobile or web app
- Store FX API keys in React Native, Expo, or `NEXT_PUBLIC_*`
- Use manually entered rates as the market source
- Present yesterday’s rate as a real-time quote
- Overwrite original ledger amounts with converted display values
- Invent rates on-device when the API fails (show stale / offline / unavailable instead)

---

## Reliability & limits

| Provider | Limits (practical) | Notes |
|----------|-------------------|--------|
| open.er-api.com | Free open endpoint; fair-use / rate limits apply | Prefer server-side caching; do not hammer from every client |
| exchangerate-api.com v4 | Same publisher, alternate host | Used if open.er-api is blocked |
| Frankfurter | Public, no key; ECB calendar (no weekend updates) | Major currencies; weak AOA coverage |

Backend TTL + cron keep client traffic low. Mobile may cache list responses for ~5 minutes for offline display but **must not invent** missing pairs.
