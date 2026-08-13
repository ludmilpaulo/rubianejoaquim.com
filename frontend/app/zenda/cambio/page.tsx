'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { financeApi, type FxFreshness, type FxRateRow } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import {
  WEB_FX_CURRENCIES,
  currencyDisplayName,
  formatFxAmount,
  minutesSince,
  parseFxAmount,
  type WebFxCurrency,
} from '@/lib/fx'
import ZendaButton from '@/components/zenda/ZendaButton'
import ZendaCard from '@/components/zenda/ZendaCard'
import ZendaInput from '@/components/zenda/ZendaInput'
import ZendaAlert from '@/components/zenda/ZendaAlert'
import ZendaLoader from '@/components/zenda/ZendaLoader'

const QUICK_PAIRS: { from: WebFxCurrency; to: WebFxCurrency }[] = [
  { from: 'USD', to: 'AOA' },
  { from: 'AOA', to: 'USD' },
  { from: 'USD', to: 'ZAR' },
  { from: 'ZAR', to: 'USD' },
  { from: 'EUR', to: 'AOA' },
  { from: 'AOA', to: 'EUR' },
  { from: 'EUR', to: 'USD' },
  { from: 'USD', to: 'EUR' },
  { from: 'EUR', to: 'ZAR' },
  { from: 'ZAR', to: 'EUR' },
  { from: 'GBP', to: 'USD' },
  { from: 'USD', to: 'GBP' },
  { from: 'AOA', to: 'ZAR' },
  { from: 'ZAR', to: 'AOA' },
]

function relativeLabel(iso: string | null): string {
  const mins = minutesSince(iso)
  if (mins == null) return 'hora desconhecida'
  if (mins < 2) return 'agora mesmo'
  if (mins < 60) return `há ${mins} minutos`
  if (mins < 24 * 60) return `há ${Math.floor(mins / 60)} horas`
  const date = new Date(iso as string)
  return date.toLocaleString('pt-PT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function bannerFor(opts: {
  freshness: FxFreshness
  offline: boolean
  marketClosed: boolean
  updatedAt: string | null
}): { tone: 'success' | 'warning' | 'error' | 'info'; text: string } {
  const rel = relativeLabel(opts.updatedAt)
  if (opts.offline) {
    return {
      tone: 'warning',
      text: `Offline — a usar a última taxa disponível de ${rel}.`,
    }
  }
  if (opts.freshness === 'unavailable') {
    return { tone: 'error', text: 'As taxas de câmbio estão indisponíveis neste momento.' }
  }
  if (opts.freshness === 'stale') {
    return {
      tone: 'warning',
      text: `Esta taxa está desactualizada (${rel}). Os valores convertidos são estimativas.`,
    }
  }
  if (opts.marketClosed) {
    return { tone: 'warning', text: `Última taxa de mercado disponível — ${rel}.` }
  }
  if (opts.freshness === 'cached') {
    return { tone: 'info', text: `Última taxa disponível — ${rel}.` }
  }
  return { tone: 'success', text: `Última actualização: ${rel}` }
}

export default function ZendaCambioPage() {
  const [rates, setRates] = useState<FxRateRow[]>([])
  const [source, setSource] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [freshness, setFreshness] = useState<FxFreshness>('unavailable')
  const [marketClosed, setMarketClosed] = useState(false)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('100')
  const [fromCur, setFromCur] = useState<WebFxCurrency>('AOA')
  const [toCur, setToCur] = useState<WebFxCurrency>('USD')
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [converted, setConverted] = useState<string | null>(null)
  const [rateLine, setRateLine] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)

  const loadRates = useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true)
      const data = await financeApi.getExchangeRates(force)
      setRates(data.results || [])
      setSource(data.source ?? null)
      setUpdatedAt(data.fetched_at || data.last_successful_update || data.provider_updated_at || data.updated_at || null)
      setFreshness(data.freshness || (data.stale ? 'stale' : 'cached'))
      setMarketClosed(data.market_closed === true)
      setOffline(false)
      setError(data.refresh_error ? `Não foi possível actualizar. A mostrar as últimas taxas de ${relativeLabel(data.fetched_at || data.updated_at || null)}.` : null)
    } catch (err) {
      setOffline(true)
      setFreshness('stale')
      setError(getApiErrorMessage(err, 'Não foi possível obter as taxas de câmbio.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadRates(false).catch(() => {})
  }, [loadRates])

  useEffect(() => {
    const onOnline = () => {
      loadRates(true).catch(() => {})
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [loadRates])

  const performConvert = useCallback(async () => {
    const num = parseFxAmount(amount)
    if (num == null || num === 0) {
      setConverted(null)
      setRateLine(null)
      return
    }
    setConverting(true)
    try {
      const res = await financeApi.convertCurrency(num, fromCur, toCur)
      const value = Number(res.converted_amount ?? res.converted ?? res.amount)
      if (!Number.isFinite(value)) {
        setConverted(null)
        return
      }
      setConverted(formatFxAmount(value, res.converted_currency || toCur))
      setRateLine(res.rate_line || `1 ${fromCur} = ${res.rate} ${toCur}`)
      if (res.fetched_at || res.updated_at) {
        setUpdatedAt(res.fetched_at || res.last_successful_update || res.provider_updated_at || res.updated_at || null)
      }
      if (res.source) setSource(res.source)
      if (res.freshness) setFreshness(res.freshness)
      setMarketClosed(res.market_closed === true)
      setOffline(false)
    } catch (err) {
      setConverted(null)
      setError(getApiErrorMessage(err, 'Não foi possível converter com as taxas actuais.'))
    } finally {
      setConverting(false)
    }
  }, [amount, fromCur, toCur])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      performConvert().catch(() => {})
    }, 280)
    return () => window.clearTimeout(handle)
  }, [performConvert])

  const filterCurrencies = (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return WEB_FX_CURRENCIES
    return WEB_FX_CURRENCIES.filter((code) => {
      const name = currencyDisplayName(code).toLowerCase()
      return code.toLowerCase().includes(q) || name.includes(q)
    })
  }

  const fromOptions = useMemo(() => {
    const list = filterCurrencies(fromQuery)
    return list.includes(fromCur) ? list : [fromCur, ...list]
  }, [fromQuery, fromCur])
  const toOptions = useMemo(() => {
    const list = filterCurrencies(toQuery)
    return list.includes(toCur) ? list : [toCur, ...list]
  }, [toQuery, toCur])
  const banner = bannerFor({ freshness, offline, marketClosed, updatedAt })
  const amountNum = parseFxAmount(amount)
  const usdRates = rates.filter((r) => r.base_currency === 'USD')

  const swap = () => {
    setFromCur(toCur)
    setToCur(fromCur)
  }

  if (loading && rates.length === 0 && !offline) {
    return (
      <div className="min-h-screen bg-zenda-bg flex items-center justify-center">
        <ZendaLoader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zenda-bg text-zenda-navy">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-1">Câmbio global</h1>
        <p className="text-zenda-textSecondary mb-4">Câmbio actual com taxas via Zenda</p>
        <ZendaAlert tone={banner.tone} className="mb-3">
          {banner.text}
        </ZendaAlert>
        {source ? <p className="text-sm text-zenda-textSecondary mb-2">Fonte: {source}</p> : null}
        {error ? (
          <ZendaAlert tone="warning" className="mb-4">
            {error}
          </ZendaAlert>
        ) : null}

        <ZendaButton
          variant="secondary"
          className="mb-6"
          disabled={refreshing}
          onClick={() => loadRates(true)}
        >
          {refreshing ? 'A actualizar taxas de mercado…' : 'Actualizar taxas ↻'}
        </ZendaButton>

        <ZendaCard className="mb-8">
          <ZendaInput
            id="fx-amount"
            label="Montante"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end mt-4">
            <label className="block text-sm font-medium">
              De
              <input
                className="zenda-input mt-2 mb-2"
                placeholder="Pesquisar moeda"
                value={fromQuery}
                onChange={(e) => setFromQuery(e.target.value)}
              />
              <select
                className="zenda-input"
                value={fromCur}
                onChange={(e) => setFromCur(e.target.value as WebFxCurrency)}
              >
                {fromOptions.map((code) => (
                  <option key={code} value={code}>
                    {code} — {currencyDisplayName(code)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="h-11 w-11 rounded-full bg-zenda-container text-zenda-primary font-bold"
              onClick={swap}
              aria-label="Trocar"
            >
              ↔
            </button>
            <label className="block text-sm font-medium">
              Para
              <input
                className="zenda-input mt-2 mb-2"
                placeholder="Pesquisar moeda"
                value={toQuery}
                onChange={(e) => setToQuery(e.target.value)}
              />
              <select
                className="zenda-input"
                value={toCur}
                onChange={(e) => setToCur(e.target.value as WebFxCurrency)}
              >
                {toOptions.map((code) => (
                  <option key={code} value={code}>
                    {code} — {currencyDisplayName(code)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ZendaButton className="mt-6 w-full" disabled={converting} onClick={() => performConvert()}>
            {converting ? 'A converter…' : 'Converter'}
          </ZendaButton>
          {converted && amountNum != null ? (
            <div className="mt-6 text-center">
              <p className="text-xl font-semibold text-zenda-growth">
                {formatFxAmount(amountNum, fromCur)} ≈ {converted}
              </p>
              {rateLine ? <p className="text-sm text-zenda-textSecondary mt-2">{rateLine}</p> : null}
              {source ? <p className="text-sm text-zenda-textSecondary mt-1">Fonte: {source}</p> : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 mt-6">
            {QUICK_PAIRS.map((p) => (
              <button
                key={`${p.from}-${p.to}`}
                type="button"
                className="px-3 py-1 rounded-full bg-zenda-container text-zenda-primary text-sm"
                onClick={() => {
                  setFromCur(p.from)
                  setToCur(p.to)
                }}
              >
                {p.from}→{p.to}
              </button>
            ))}
          </div>
        </ZendaCard>

        <h2 className="text-lg font-semibold mb-3">Taxas (base USD)</h2>
        {usdRates.length === 0 ? (
          <ZendaAlert tone="warning">Sem taxas disponíveis. Actualize ou verifique o servidor.</ZendaAlert>
        ) : (
          <div className="space-y-2">
            {usdRates.map((row) => (
              <ZendaCard key={`${row.base_currency}-${row.target_currency}`} className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">
                    {row.base_currency} / {row.target_currency}
                  </p>
                  {row.source ? <p className="text-xs text-zenda-textSecondary">{row.source}</p> : null}
                </div>
                <p className="text-lg font-semibold text-zenda-primary">{Number(row.rate).toFixed(4)}</p>
              </ZendaCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
