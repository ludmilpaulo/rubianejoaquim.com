'use client'

import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import { educationAdminApi, adminApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import { unwrapList, type EducationOverview, type EducatorApplication, type Course } from '@/lib/types/education'
import { useTranslations } from '@/contexts/LocaleContext'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import ZendaButton from '@/components/zenda/ZendaButton'
import ZendaAlert from '@/components/zenda/ZendaAlert'

export default function AdminEducationPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminEducation />
    </AuthGuard>
  )
}

function AdminEducation() {
  const t = useTranslations()
  const [overview, setOverview] = useState<EducationOverview | null>(null)
  const [apps, setApps] = useState<EducatorApplication[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [commission, setCommission] = useState('20')
  const [coverage, setCoverage] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    Promise.all([
      educationAdminApi.overview(),
      educationAdminApi.applications(),
      adminApi.courses.list(),
      educationAdminApi.billing(),
      educationAdminApi.translations(),
    ])
      .then(([o, a, c, b, tr]) => {
        setOverview(o.data as EducationOverview)
        setApps(unwrapList<EducatorApplication>(a.data))
        setCourses(unwrapList<Course>(c.data).filter((course) => course.status === 'pending_review'))
        setCommission(String((b.data as { platform_commission_percent?: string }).platform_commission_percent || '20'))
        setCoverage((tr.data as { coverage?: Record<string, number> }).coverage || null)
      })
      .catch((err) => setError(getApiErrorMessage(err, t('education.genericError'))))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-3xl font-display font-bold text-zenda-navy">{t('education.adminEducation')}</h1>
      {loading ? <ZendaLoader message={t('education.loading')} /> : null}
      {error ? <ZendaAlert tone="error">{error}</ZendaAlert> : null}
      {message ? <ZendaAlert tone="success">{message}</ZendaAlert> : null}
      {overview ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Kpi label={t('education.students')} value={overview.students} />
          <Kpi label={t('education.roleInstructor')} value={overview.instructors} />
          <Kpi label={t('education.courses')} value={overview.courses} />
          <Kpi label={t('education.roleMentor')} value={overview.mentors} />
          <Kpi label={t('education.revenue')} value={overview.revenue} />
          <Kpi label={t('education.pendingApprovals')} value={overview.pending_approvals} />
        </div>
      ) : null}

      <section>
        <h2 className="text-xl font-bold mb-3">{t('education.moderation')}</h2>
        {apps.filter((a) => a.status === 'pending').map((app) => (
          <div key={app.id} className="bg-white border rounded-2xl p-4 mb-3 flex flex-wrap justify-between gap-3">
            <div>
              <p className="font-semibold">{app.full_name}</p>
              <p className="text-sm text-zenda-text-secondary">{app.roles_requested.join(', ')}</p>
            </div>
            <div className="flex gap-2">
              <ZendaButton onClick={() => educationAdminApi.approveApplication(app.id).then(() => { setMessage(t('education.savedOk')); load() })}>{t('education.approve')}</ZendaButton>
              <ZendaButton variant="outline" onClick={() => educationAdminApi.rejectApplication(app.id).then(load)}>{t('education.reject')}</ZendaButton>
            </div>
          </div>
        ))}
        {courses.map((course) => (
          <div key={course.id} className="bg-white border rounded-2xl p-4 mb-3 flex flex-wrap justify-between gap-3">
            <div>
              <p className="font-semibold">{course.title}</p>
              <p className="text-sm">{course.instructor?.display_name}</p>
            </div>
            <div className="flex gap-2">
              <ZendaButton onClick={() => educationAdminApi.approveCourse(course.id).then(() => { setMessage(t('education.savedOk')); load() })}>{t('education.approve')}</ZendaButton>
              <ZendaButton variant="outline" onClick={() => educationAdminApi.rejectCourse(course.id, 'Please update the course before resubmitting.').then(load)}>{t('education.reject')}</ZendaButton>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-white border rounded-2xl p-4">
        <h2 className="font-bold mb-3">{t('education.commission')}</h2>
        <div className="flex gap-2">
          <input value={commission} onChange={(e) => setCommission(e.target.value)} className="border rounded-xl px-3 py-2 w-28" />
          <ZendaButton onClick={() => educationAdminApi.updateBilling({ platform_commission_percent: commission }).then(() => setMessage(t('education.updatedOk')))}>
            {t('education.savedOk')}
          </ZendaButton>
        </div>
      </section>

      {coverage ? (
        <section>
          <h2 className="font-bold mb-2">Translation coverage</h2>
          <ul className="text-sm">
            {Object.entries(coverage).map(([locale, pct]) => (
              <li key={locale}>{locale}: {pct}%</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border p-4">
      <p className="text-sm text-zenda-text-secondary">{label}</p>
      <p className="text-2xl font-bold text-zenda-navy">{value}</p>
    </div>
  )
}
