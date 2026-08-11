# Zenda Exchange Rates

Official / market-based daily FX for multi-currency finance.

**Architecture:** reliable market source → Zenda backend cache → Android / iOS.

Converted amounts are **display-only**. Original `amount` + `currency` on every ledger row are never overwritten.

---

## Chosen providers

| Priority | Provider | Endpoint | Auth | Rate type |
|----------|----------|----------|------|-----------|
| **Primary** | [open.er-api.com](https://www.exchangerate-api.com/docs/free) (ExchangeRate-API open access) | `GET https://open.er-api.com/v6/latest/USD` | **None** (no API key) | Latest available market mid rates, USD base |
| **Fallback** | [Frankfurter](https://www.frankfurter.app/) (ECB reference) | `GET https://api.frankfurter.app/latest?from=USD&to=…` | **None** | ECB euro foreign exchange reference rates |

### Why these

1. **No secrets on mobile** — rates are fetched only by the Django backend.
2. **AOA / ZAR / USD / EUR / GBP** — open.er-api covers Angola (AOA), South Africa (ZAR), and the other supported codes. Frankfurter (ECB) is a strong fallback for major pairs but often **omits AOA / MZN**.
3. **Honest timestamps** — we store `provider_updated_at` from the provider (`time_last_update_*` or ECB `date`). Weekends / holidays show the **last available** quote with that real timestamp — never labeled as “today” if it isn’t.
4. **Failure mode** — if both providers fail, the last valid `ExchangeRate` rows are served with `stale: true` and the last known `source`.

### Supported currencies (USD pivot)

`AOA`, `USD`, `EUR`, `GBP`, `BRL`, `ZAR`, `MZN`, `CAD`  
(see `accounts.currency_defaults.SUPPORTED_CURRENCIES`)

Cross rates (e.g. ZAR→AOA) use a **USD pivot** from cached rows.

---

## Cache behaviour

| Setting | Default | Meaning |
|---------|---------|---------|
| `FX_CACHE_TTL_HOURS` | `6` | Soft-refresh when cache age exceeds this |

- Soft refresh: any list/convert/supported call may call `refresh_exchange_rates(force=False)`.
- Force refresh: `?refresh=1` on the API, or `python manage.py refresh_exchange_rates --force`.
- Each row stores: `rate`, `source`, `provider_updated_at`, `updated_at` (DB write time).
- API meta always includes: `source`, `updated_at` (provider time preferred), `provider_updated_at`, `stale`, `base`.

If a live refresh omits a code (e.g. ECB without AOA), the previous cached value is **retained** and keeps its previous `source` (may still be `seed` until open.er-api fills it).

---

## API (clients)

| Endpoint | Notes |
|----------|--------|
| `GET /api/finance/exchange-rates/` | List USD-base rates + meta. `?refresh=1` forces live fetch. |
| `GET /api/finance/exchange-rates/convert/?amount=&from=&to=` | Returns `amount`/`converted`, `rate`, `rate_line`, `source`, `updated_at`, `stale`. |
| `GET /api/finance/exchange-rates/supported/` | Supported codes + meta. |

Example convert payload fields:

```json
{
  "original_amount": "100.00",
  "amount": "5.50",
  "converted": "5.50",
  "from": "ZAR",
  "to": "USD",
  "rate": "0.05500000",
  "rate_line": "1 ZAR = 0.05500000 USD",
  "updated_at": "2026-08-11T00:00:00+00:00",
  "source": "open.er-api.com",
  "stale": false
}
```

UI should show, e.g.:

`100 ZAR ≈ X USD` · `1 ZAR = Y USD` · `Rate updated: …` · `Source: open.er-api.com`  
and a clear warning when `stale: true`.

---

## Operations

### Bootstrap (empty DB only)

```bash
cd backend && source venv/bin/activate
python manage.py seed_exchange_rates          # emergency approximate rows, source=seed
python manage.py refresh_exchange_rates --force   # replace with market data
```

**`seed_exchange_rates` is emergency bootstrap only.** Do not present seed rates as live market truth.

### Production cron (PythonAnywhere / host)

Recommended every 6 hours (align with `FX_CACHE_TTL_HOURS`):

```bash
cd /path/to/backend && source venv/bin/activate
python manage.py refresh_exchange_rates --force
```

### Migrations

```bash
python manage.py migrate finance
```

---

## What we do **not** do

- Hard-code rates as live truth in the mobile app
- Use manually entered rates as the market source
- Use one fixed rate for an entire month as “live”
- Present yesterday’s rate as today’s without the real provider timestamp
- Assume USD→AOA / USD→ZAR stay constant
- Invent rates on-device when the API fails (show stale / unavailable instead)

---

## Reliability & limits

| Provider | Limits (practical) | Notes |
|----------|-------------------|--------|
| open.er-api.com | Free open endpoint; fair-use / rate limits apply | Prefer server-side caching; do not hammer from every client |
| Frankfurter | Public, no key; ECB calendar (no weekend updates) | Major currencies; weak AOA coverage |

Backend TTL + cron keep client traffic low. Mobile may cache list responses briefly for offline display but **must not invent** missing pairs.
