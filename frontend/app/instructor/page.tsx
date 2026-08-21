'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import EducationShell from '@/components/education/EducationShell'
import { instructorsApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import type { InstructorDashboard } from '@/lib/types/education'
import { useTranslations } from '@/contexts/LocaleContext'
import { useAuthStore } from '@/lib/store'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import ZendaAlert from '@/components/zenda/ZendaAlert'
import ZendaButton from '@/components/zenda/ZendaButton'

export default function InstructorHomePage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  )
}

function Dashboard() {
  const t = useTranslations()
  const { user } = useAuthStore()
  const [data, setData] = useState<InstructorDashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    instructorsApi.dashboard()
      .then((res) => setData(res.data as InstructorDashboard))
      .catch((err) => setError(getApiErrorMessage(err, t('education.genericError'))))
      .finally(() => setLoading(false))
  }, [t])

  if (!user?.is_instructor && !user?.is_admin) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <p>{t('education.becomeSubtitle')}</p>
        <Link href="/instructor/apply"><ZendaButton>{t('education.applyCta')}</ZendaButton></Link>
      </div>
    )
  }

  return (
    <EducationShell>
      {loading ? <ZendaLoader message={t('education.loading')} /> : null}
      {error ? (
        <ZendaAlert tone="error">
          <p className="font-semibold">{t('education.errorTitle')}</p>
          <p>{error}</p>
        </ZendaAlert>
      ) : null}
      {data ? (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-zenda-navy">
              {t('education.goodMorning')}, {user?.first_name || data.instructor.display_name}
            </h1>
            <p className="text-zenda-text-secondary mt-1">{t('education.teachingGrowing')}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              [t('education.students'), data.students],
              [t('education.courses'), data.courses],
              [t('education.rating'), `★ ${data.rating}`],
              [t('education.revenue'), `${data.earnings.currency} ${data.earnings.total_sales}`],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-white rounded-2xl border border-zenda-border p-5">
                <p className="text-sm text-zenda-text-secondary">{label}</p>
                <p className="text-2xl font-bold text-zenda-navy mt-1">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/instructor/courses/new"><ZendaButton>{t('education.createCourse')}</ZendaButton></Link>
            <Link href="/instructor/revenue"><ZendaButton variant="outline">{t('education.revenue')}</ZendaButton></Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Stat label={t('education.drafts')} value={data.drafts} />
            <Stat label={t('education.pendingReview')} value={data.pending_review} />
            <Stat label={t('education.published')} value={data.published} />
          </div>
        </div>
      ) : null}
    </EducationShell>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-zenda-border p-4">
      <p className="text-sm text-zenda-text-secondary">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}
