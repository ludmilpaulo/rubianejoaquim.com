'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import { logger } from '@/lib/logger'
import { useAdminGate } from '@/hooks/useAdminGate'
import OpsShell from '@/components/admin/subscriptions/OpsShell'
import { ErrorState, Skeleton } from '@/components/admin/subscriptions/OpsUi'
import type { GatewayConfigResponse } from '@/lib/types/subscriptions'

const SECRET_PLACEHOLDER = '••••••••••••••••'

export default function AdminPaymentSettingsPage() {
  const { ready } = useAdminGate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)

  const [environment, setEnvironment] = useState('production')
  const [isActive, setIsActive] = useState(false)
  const [appId, setAppId] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [paymentUrl, setPaymentUrl] = useState('')
  const [callbackUrl, setCallbackUrl] = useState('')
  const [appIdMasked, setAppIdMasked] = useState('')
  const [secretSet, setSecretSet] = useState(false)
  const [webhookSet, setWebhookSet] = useState(false)

  const [priceAoa, setPriceAoa] = useState('10000')
  const [priceZar, setPriceZar] = useState('180')
  const [iban, setIban] = useState('')
  const [payee, setPayee] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    adminApi.subscriptions.gatewayConfig
      .get()
      .then((res) => {
        const data = res.data as GatewayConfigResponse
        setEnvironment(data.ikhokha.environment)
        setIsActive(data.ikhokha.is_active)
        setAppIdMasked(data.ikhokha.app_id_masked)
        setSecretSet(data.ikhokha.app_secret_set)
        setWebhookSet(data.ikhokha.webhook_secret_set)
        setPaymentUrl(data.ikhokha.payment_url)
        setCallbackUrl(data.ikhokha.callback_url)
        setPriceAoa(String(data.billing.monthly_price_aoa))
        setPriceZar(String(data.billing.monthly_price_zar))
        setIban(data.billing.iban)
        setPayee(data.billing.payee_name)
        setAppId('')
        setAppSecret('')
        setWebhookSecret('')
      })
      .catch((err: unknown) => {
        logger.error('Failed to load gateway config', err)
        setError(getApiErrorMessage(err, 'Could not load payment settings.'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (ready) load()
  }, [ready])

  const buildIkhokhaPayload = (includeSecrets: boolean) => {
    const payload: Record<string, unknown> = {
      environment,
      is_active: isActive,
    }
    const trimmedAppId = appId.trim()
    if (trimmedAppId) payload.app_id = trimmedAppId
    if (includeSecrets) {
      const trimmedSecret = appSecret.trim()
      if (trimmedSecret && trimmedSecret !== SECRET_PLACEHOLDER) payload.app_secret = trimmedSecret
    }
    return payload
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const ikhokha = buildIkhokhaPayload(true)
      if (webhookSecret.trim() && webhookSecret !== SECRET_PLACEHOLDER) {
        ikhokha.webhook_secret = webhookSecret.trim()
      }
      await adminApi.subscriptions.gatewayConfig.update({
        ikhokha,
        billing: {
          monthly_price_aoa: priceAoa,
          monthly_price_zar: priceZar,
          iban,
          payee_name: payee,
        },
      })
      setMessage('Configuration saved.')
      load()
    } catch (err: unknown) {
      setMessage(getApiErrorMessage(err, 'Could not save configuration.'))
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    const hasInlineSecret = appSecret.trim() && appSecret !== SECRET_PLACEHOLDER
    const hasInlineAppId = Boolean(appId.trim())
    if (!hasInlineSecret && !secretSet) {
      setTestResult({
        ok: false,
        text: 'Enter your Secret Key in the form, then test again.',
      })
      setTesting(false)
      return
    }
    if (!hasInlineAppId && !appIdMasked) {
      setTestResult({
        ok: false,
        text: 'Enter your Application ID in the form, then test again.',
      })
      setTesting(false)
      return
    }
    try {
      const res = await adminApi.subscriptions.gatewayConfig.testConnection({
        ikhokha: buildIkhokhaPayload(true),
      })
      const data = res.data as {
        ok?: boolean
        message?: string
        environment?: string
        merchant?: string
        api?: string
        webhook?: string
        mode?: string
      }
      if (!data.ok) {
        setTestResult({
          ok: false,
          text: data.message || 'Connection failed. Please verify your iKhokha credentials.',
        })
        return
      }
      setTestResult({
        ok: true,
        text: [
          data.message || 'iKhokha connection successful',
          data.environment ? `Environment: ${data.environment}` : '',
          data.mode ? `Payment mode: ${data.mode}` : '',
          data.merchant ? `Merchant: ${data.merchant}` : '',
          data.api ? `API: ${data.api}` : '',
          data.webhook ? `Webhook: ${data.webhook}` : '',
          hasInlineSecret || hasInlineAppId ? 'Test used the values in this form (save to persist).' : '',
        ]
          .filter(Boolean)
          .join('\n'),
      })
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        text: getApiErrorMessage(err, 'Connection failed. Please verify your iKhokha credentials.'),
      })
    } finally {
      setTesting(false)
    }
  }

  if (!ready) return null

  return (
    <OpsShell>
      <h1 className="text-2xl font-bold mb-1">Payments</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--ops-muted)' }}>
        Configure iKhokha card payments and Angola plan prices. Secrets are stored encrypted and never sent to apps.
      </p>

      {loading ? (
        <Skeleton className="h-80" />
      ) : error ? (
        <ErrorState title="Could not load payment settings." body={error} retryLabel="Try again" onRetry={load} />
      ) : (
        <div className="grid gap-6 max-w-3xl">
          <section className="ops-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">iKhokha Payment Gateway</h2>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>Environment</span>
              <select
                className="ops-input w-full"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              >
                <option value="sandbox">Sandbox (test mode)</option>
                <option value="production">Production (live mode)</option>
              </select>
              <span className="block mt-1 text-xs" style={{ color: 'var(--ops-muted)' }}>
                Credentials from the iKhokha Merchant Dashboard are usually Production. Sandbox sends{' '}
                <code>mode=test</code> to iK Pay and will fail with live keys.
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
            </label>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>
                Merchant / Application ID {appIdMasked ? `(${appIdMasked})` : ''}
              </span>
              <input
                className="ops-input w-full"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder={appIdMasked || 'Application ID'}
                autoComplete="off"
              />
            </label>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>
                Secret Key {secretSet ? '(saved)' : ''}
              </span>
              <input
                className="ops-input w-full"
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder={secretSet ? SECRET_PLACEHOLDER : 'Secret key'}
                autoComplete="new-password"
              />
            </label>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>
                Webhook Secret {webhookSet ? '(saved)' : ''}
              </span>
              <input
                className="ops-input w-full"
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={webhookSet ? SECRET_PLACEHOLDER : 'Optional'}
                autoComplete="new-password"
              />
            </label>
            <div className="rounded-lg p-3 text-sm space-y-2" style={{ background: 'var(--ops-surface)' }}>
              <p className="font-medium">Fixed endpoints (server-managed)</p>
              <p>
                <span style={{ color: 'var(--ops-muted)' }}>Payment URL</span>
                <br />
                <code className="text-xs break-all">{paymentUrl || '—'}</code>
              </p>
              <p>
                <span style={{ color: 'var(--ops-muted)' }}>Callback URL</span>
                <br />
                <code className="text-xs break-all">{callbackUrl || '—'}</code>
              </p>
              <p className="text-xs" style={{ color: 'var(--ops-muted)' }}>
                These URLs are set automatically from production settings. You only need Application ID and Secret.
                If Test Connection says the server cannot reach api.ikhokha.com, PythonAnywhere must allowlist that
                domain (free accounts) or you need a paid plan.
              </p>
            </div>
            {testResult && (
              <pre
                className="text-sm whitespace-pre-wrap rounded-lg p-3"
                style={{
                  background: testResult.ok ? 'rgba(76,175,61,0.12)' : 'rgba(229,57,53,0.12)',
                  color: testResult.ok ? 'var(--ops-success)' : 'var(--ops-danger)',
                }}
              >
                {testResult.text}
              </pre>
            )}
            <div className="flex flex-wrap gap-3">
              <button type="button" className="ops-btn ops-btn-ghost" onClick={testConnection} disabled={testing}>
                {testing ? 'Testing…' : 'Test Connection'}
              </button>
              <button type="button" className="ops-btn ops-btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
            {message && <p className="text-sm">{message}</p>}
          </section>

          <section className="ops-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Plan prices</h2>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>Monthly price (AOA)</span>
              <input className="ops-input w-full" value={priceAoa} onChange={(e) => setPriceAoa(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>Monthly price (ZAR, charged via iKhokha)</span>
              <input className="ops-input w-full" value={priceZar} onChange={(e) => setPriceZar(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>IBAN</span>
              <input className="ops-input w-full" value={iban} onChange={(e) => setIban(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>Payee name</span>
              <input className="ops-input w-full" value={payee} onChange={(e) => setPayee(e.target.value)} />
            </label>
          </section>
        </div>
      )}
    </OpsShell>
  )
}
