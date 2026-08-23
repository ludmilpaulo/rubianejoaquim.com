'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import { subscriptionApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'

type PaymentLike = {
  status?: string
  product_type?: string
}

function CallbackInner({ outcome }: { outcome: 'success' | 'failure' | 'cancel' }) {
  const params = useSearchParams()
  const externalId = params.get('payment') || ''
  const [loading, setLoading] = useState(true)
  const [payment, setPayment] = useState<PaymentLike | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await subscriptionApi.sync({
          external_id: externalId || undefined,
          outcome,
        })
        if (!cancelled) setPayment(res.data as PaymentLike)
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not confirm payment status.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [externalId, outcome])

  if (loading) return <ZendaLoader />

  const paid = payment?.status === 'paid'
  const product = payment?.product_type
  const title = paid
    ? 'Payment successful'
    : outcome === 'cancel'
      ? 'Payment cancelled'
      : 'Payment failed'
  const body = paid
    ? product === 'course'
      ? 'Your course access is now active.'
      : product === 'mentorship'
        ? 'Your mentorship request is confirmed.'
        : 'Your Zenda subscription is now active.'
    : "We couldn't confirm your payment. Please try again."

  return (
    <main className="max-w-lg mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold mb-3">{error ? 'Payment status' : title}</h1>
      <p className="text-gray-600 mb-6">{error || body}</p>
      <div className="flex justify-center gap-4 flex-wrap">
        <Link className="text-zenda-primary font-semibold" href="/subscribe">
          Subscription
        </Link>
        <Link className="text-zenda-primary font-semibold" href="/cursos">
          Courses
        </Link>
        <Link className="text-zenda-primary font-semibold" href="/area-do-aluno">
          Área do aluno
        </Link>
      </div>
    </main>
  )
}

export function IkhokhaCallbackPage({ outcome }: { outcome: 'success' | 'failure' | 'cancel' }) {
  return (
    <AuthGuard>
      <Suspense fallback={<ZendaLoader />}>
        <CallbackInner outcome={outcome} />
      </Suspense>
    </AuthGuard>
  )
}
