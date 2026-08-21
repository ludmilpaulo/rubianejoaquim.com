'use client'

import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import EducationShell from '@/components/education/EducationShell'
import { instructorsApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import { unwrapList } from '@/lib/types/education'
import { useTranslations } from '@/contexts/LocaleContext'
import ZendaButton from '@/components/zenda/ZendaButton'
import ZendaAlert from '@/components/zenda/ZendaAlert'
import ZendaLoader from '@/components/zenda/ZendaLoader'

interface Earnings {
  total_sales: string
  platform_fee: string
  refunds: string
  available: string
  pending: string
  paid: string
  currency: string
}

interface Payout {
  id: number
  amount: string
  currency: string
  status: string
  requested_at: string
}

export default function InstructorRevenuePage() {
  return (
    <AuthGuard>
      <Revenue />
    </AuthGuard>
  )
}

function Revenue() {
  const t = useTranslations()
  const [earnings, setEarnings] = useState<Earnings | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    Promise.all([instructorsApi.earnings(), instructorsApi.payouts.list()])
      .then(([e, p]) => {
        setEarnings(e.data as Earnings)
        setPayouts(unwrapList<Payout>(p.data))
      })
      .catch((err) => setError(getApiErrorMessage(err, t('education.genericError'))))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const request = async () => {
    setError('')
    try {
      await instructorsApi.payouts.request(amount, earnings?.currency)
      setMessage(t('education.savedOk'))
      load()
    } catch (err) {
      setError(getApiErrorMessage(err, t('education.genericError')))
    }
  }

  return (
    <EducationShell>
      <h1 className="text-2xl font-bold mb-6">{t('education.revenue')}</h1>
      {loading ? <ZendaLoader message={t('education.loading')} /> : null}
      {error ? <ZendaAlert tone="error">{error}</ZendaAlert> : null}
      {message ? <ZendaAlert tone="success">{message}</ZendaAlert> : null}
      {earnings ? (
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card label={t('education.revenue')} value={`${earnings.currency} ${earnings.total_sales}`} />
          <Card label={t('education.platformFee')} value={`${earnings.currency} ${earnings.platform_fee}`} />
          <Card label={t('education.available')} value={`${earnings.currency} ${earnings.available}`} />
        </div>
      ) : null}
      <div className="flex gap-2 mb-8">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="border rounded-xl px-3 py-2" />
        <ZendaButton onClick={() => void request()}>{t('education.requestPayout')}</ZendaButton>
      </div>
      <h2 className="font-semibold mb-3">{t('education.payouts')}</h2>
      {payouts.map((p) => (
        <div key={p.id} className="bg-white border rounded-xl p-3 mb-2 flex justify-between">
          <span>{p.currency} {p.amount}</span>
          <span>{p.status}</span>
        </div>
      ))}
    </EducationShell>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border p-4">
      <p className="text-sm text-zenda-text-secondary">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}
