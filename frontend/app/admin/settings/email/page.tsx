'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import { logger } from '@/lib/logger'
import { useAdminGate } from '@/hooks/useAdminGate'
import OpsShell from '@/components/admin/subscriptions/OpsShell'
import { ErrorState, Skeleton } from '@/components/admin/subscriptions/OpsUi'

const SECRET_PLACEHOLDER = '••••••••••••••••'

interface EmailConfigResponse {
  is_active: boolean
  email_host: string
  email_host_user: string
  default_from_email: string
  email_port: number
  use_tls: boolean
  use_ssl: boolean
  password_set: boolean
  transport_auto: boolean
  updated_at: string | null
}

export default function AdminEmailSettingsPage() {
  const { ready } = useAdminGate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)

  const [isActive, setIsActive] = useState(false)
  const [emailHost, setEmailHost] = useState('smtpout.secureserver.net')
  const [emailUser, setEmailUser] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [passwordSet, setPasswordSet] = useState(false)
  const [port, setPort] = useState('587')
  const [useTls, setUseTls] = useState(true)
  const [useSsl, setUseSsl] = useState(false)
  const [transportAuto, setTransportAuto] = useState(true)

  const load = () => {
    setLoading(true)
    setError('')
    adminApi.emailConfig
      .get()
      .then((res) => {
        const data = res.data as EmailConfigResponse
        setIsActive(data.is_active)
        setEmailHost(data.email_host)
        setEmailUser(data.email_host_user)
        setFromEmail(data.default_from_email)
        setPasswordSet(data.password_set)
        setPort(String(data.email_port))
        setUseTls(data.use_tls)
        setUseSsl(data.use_ssl)
        setTransportAuto(data.transport_auto)
        setEmailPassword('')
      })
      .catch((err: unknown) => {
        logger.error('Failed to load email config', err)
        setError(getApiErrorMessage(err, 'Could not load email settings.'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (ready) load()
  }, [ready])

  const buildPayload = (includePassword: boolean) => {
    const payload: Record<string, unknown> = {
      is_active: isActive,
      email_host: emailHost,
      email_host_user: emailUser.trim(),
      default_from_email: fromEmail.trim(),
    }
    if (!transportAuto) {
      payload.email_port = Number(port)
      payload.use_tls = useTls
      payload.use_ssl = useSsl
    } else {
      payload.reset_transport = true
    }
    if (includePassword) {
      const trimmed = emailPassword.trim()
      if (trimmed && trimmed !== SECRET_PLACEHOLDER) payload.email_host_password = trimmed
    }
    return payload
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      await adminApi.emailConfig.update(buildPayload(true))
      setMessage('Email configuration saved.')
      load()
    } catch (err: unknown) {
      setMessage(getApiErrorMessage(err, 'Could not save email configuration.'))
    } finally {
      setSaving(false)
    }
  }

  const testEmail = async () => {
    setTesting(true)
    setTestResult(null)
    if (!emailPassword.trim() && !passwordSet) {
      setTestResult({ ok: false, text: 'Enter the SMTP password, then test again.' })
      setTesting(false)
      return
    }
    try {
      const res = await adminApi.emailConfig.test(buildPayload(true))
      const data = res.data as { ok?: boolean; message?: string }
      setTestResult({ ok: true, text: data.message || 'Test email sent.' })
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        text: getApiErrorMessage(err, 'Could not send test email.'),
      })
    } finally {
      setTesting(false)
    }
  }

  if (!ready) return null

  return (
    <OpsShell>
      <h1 className="text-2xl font-bold mb-1">Email (SMTP)</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--ops-muted)' }}>
        GoDaddy / Professional Email via smtpout.secureserver.net. Password is stored encrypted on the server.
      </p>

      {loading ? (
        <Skeleton className="h-80" />
      ) : error ? (
        <ErrorState title="Could not load email settings." body={error} retryLabel="Try again" onRetry={load} />
      ) : (
        <div className="grid gap-6 max-w-3xl">
          <section className="ops-card p-6 space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (use these SMTP settings for outgoing mail)
            </label>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>SMTP host</span>
              <input className="ops-input w-full" value={emailHost} onChange={(e) => setEmailHost(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>SMTP username (email)</span>
              <input
                className="ops-input w-full"
                value={emailUser}
                onChange={(e) => setEmailUser(e.target.value)}
                placeholder="noreply@rubianejoaquim.com"
                autoComplete="off"
              />
            </label>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>
                SMTP password {passwordSet ? '(saved)' : ''}
              </span>
              <input
                className="ops-input w-full"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder={passwordSet ? SECRET_PLACEHOLDER : 'Email account password'}
                autoComplete="new-password"
              />
            </label>
            <label className="block text-sm">
              <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>From address</span>
              <input
                className="ops-input w-full"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="Rubiane Joaquim <noreply@rubianejoaquim.com>"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={transportAuto}
                onChange={(e) => setTransportAuto(e.target.checked)}
              />
              Auto transport (587 + TLS on PythonAnywhere; recommended)
            </label>
            {!transportAuto && (
              <div className="grid grid-cols-3 gap-3">
                <label className="block text-sm col-span-1">
                  <span className="block mb-1" style={{ color: 'var(--ops-muted)' }}>Port</span>
                  <input className="ops-input w-full" value={port} onChange={(e) => setPort(e.target.value)} />
                </label>
                <label className="flex items-center gap-2 text-sm pt-6">
                  <input type="checkbox" checked={useTls} onChange={(e) => setUseTls(e.target.checked)} />
                  TLS
                </label>
                <label className="flex items-center gap-2 text-sm pt-6">
                  <input type="checkbox" checked={useSsl} onChange={(e) => setUseSsl(e.target.checked)} />
                  SSL
                </label>
              </div>
            )}
            <p className="text-xs" style={{ color: 'var(--ops-muted)' }}>
              Production default: port 587 with STARTTLS (not 465 SSL). Test sends to your admin account email.
            </p>
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
              <button type="button" className="ops-btn ops-btn-ghost" onClick={testEmail} disabled={testing}>
                {testing ? 'Sending…' : 'Send test email'}
              </button>
              <button type="button" className="ops-btn ops-btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save configuration'}
              </button>
            </div>
            {message && <p className="text-sm">{message}</p>}
          </section>
        </div>
      )}
    </OpsShell>
  )
}
