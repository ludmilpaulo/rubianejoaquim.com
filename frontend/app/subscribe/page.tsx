'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import ZendaButton from '@/components/zenda/ZendaButton'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import { subscriptionApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import { logger } from '@/lib/logger'
import type { CheckoutOptions, SubscriptionPaymentRecord } from '@/lib/types/subscriptions'
import { unwrapList } from '@/lib/types/subscriptions'

export default function SubscribePage() {
  return (
    <AuthGuard>
      <SubscribeInner />
    </AuthGuard>
  )
}

function SubscribeInner() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [options, setOptions] = useState<CheckoutOptions | null>(null)
  const [history, setHistory] = useState<SubscriptionPaymentRecord[]>([])
  const [paying, setPaying] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [optRes, histRes] = await Promise.all([
        subscriptionApi.checkoutOptions('web'),
        subscriptionApi.history(),
      ])
      setOptions(optRes.data as CheckoutOptions)
      setHistory(unwrapList<SubscriptionPaymentRecord>(histRes.data).results)
    } catch (err) {
      logger.error('Failed to load checkout', err)
      setError(getApiErrorMessage(err, 'Could not load payment options.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const payCard = async () => {
    setPaying(true)
    setError('')
    try {
      const res = await subscriptionApi.createSession()
      const url = (res.data as { paylink_url?: string }).paylink_url
      if (!url) throw new Error('Could not start card payment.')
      window.location.href = url
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not start card payment.'))
      setPaying(false)
    }
  }

  const uploadProof = async () => {
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    try {
      const me = await subscriptionApi.me()
      let subId = (me.data as { subscription?: { id?: number } }).subscription?.id
      if (!subId) {
        const created = await subscriptionApi.subscribe()
        subId = (created.data as { id?: number }).id
      }
      if (!subId) throw new Error('Subscription not found.')
      await subscriptionApi.uploadProof(subId, file, notes)
      setUploadMsg('Proof submitted. We will verify your payment shortly.')
      setFile(null)
      setNotes('')
      await load()
    } catch (err) {
      setUploadMsg(getApiErrorMessage(err, 'Could not upload proof.'))
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <ZendaLoader />
  if (error && !options) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <ZendaButton onClick={load}>Try again</ZendaButton>
      </main>
    )
  }

  const charge = options?.charge
  const estimate = options?.estimate
  const pop = options?.proof_of_payment
  const usePop = options?.method === 'proof_of_payment'

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <p className="text-sm mb-2">
        <Link href="/area-do-aluno" className="text-zenda-primary">← Área do aluno</Link>
      </p>
      <h1 className="text-3xl font-bold mb-2">Zenda subscription</h1>
      <p className="text-gray-600 mb-8">Premium monthly access. Prices come from the server — never from a client exchange rate.</p>

      <section className="rounded-2xl border border-gray-200 p-6 mb-8 bg-white">
        <h2 className="font-semibold text-lg mb-2">Premium</h2>
        {charge && (
          <p className="text-2xl font-bold">
            {charge.currency} {Number(charge.amount).toFixed(2)}
          </p>
        )}
        {estimate && (
          <p className="text-sm text-gray-500 mt-1">
            ≈ {estimate.currency} {Number(estimate.amount).toFixed(2)} (estimate)
          </p>
        )}
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        {usePop && pop ? (
          <div className="mt-6 space-y-3 text-sm">
            <p>Pay by bank transfer, then upload your proof of payment.</p>
            <p><strong>Amount:</strong> {pop.monthly_price_kz.toLocaleString()} {pop.currency}</p>
            <p><strong>IBAN:</strong> {pop.iban}</p>
            <p><strong>Payee:</strong> {pop.payee_name}</p>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <textarea
              className="w-full border rounded-xl p-3"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <ZendaButton onClick={uploadProof} disabled={!file || uploading}>
              {uploading ? 'Uploading…' : 'Submit proof of payment'}
            </ZendaButton>
            {uploadMsg && <p>{uploadMsg}</p>}
          </div>
        ) : (
          <div className="mt-6">
            <ZendaButton onClick={payCard} disabled={paying || !options?.ikhokha_enabled}>
              {paying ? 'Opening checkout…' : 'Pay by card (iKhokha)'}
            </ZendaButton>
            {!options?.ikhokha_enabled && (
              <p className="text-sm text-gray-500 mt-3">Card payments are not configured yet.</p>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-3">Payment history</h2>
        {history.length === 0 ? (
          <p className="text-gray-500 text-sm">No payments yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((row) => (
              <li key={row.id} className="rounded-xl border border-gray-200 p-4 text-sm">
                <p className="font-semibold">Premium Subscription</p>
                <p>Amount paid: {row.currency} {Number(row.amount).toFixed(2)}</p>
                <p>Payment currency: {row.currency}</p>
                <p>Original plan price: {row.plan_currency} {Number(row.plan_amount).toFixed(2)}</p>
                <p>Payment method: {row.method_label}</p>
                {row.gateway_label ? <p>Gateway: {row.gateway_label}</p> : null}
                <p>Transaction: {row.transaction_id}</p>
                <p>Status: {row.status}</p>
                <p>Date: {new Date(row.created_at).toLocaleDateString()}</p>
                {row.receipt_url ? (
                  <a className="text-zenda-primary" href={row.receipt_url} target="_blank" rel="noreferrer">
                    View receipt
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
