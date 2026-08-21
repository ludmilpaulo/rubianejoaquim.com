'use client'

import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import EducationShell from '@/components/education/EducationShell'
import { instructorsApi } from '@/lib/api'
import { unwrapList } from '@/lib/types/education'
import { useTranslations } from '@/contexts/LocaleContext'
import ZendaLoader from '@/components/zenda/ZendaLoader'

interface EnrollmentRow {
  id: number
  status: string
  user?: { email?: string; first_name?: string }
  course?: { title?: string }
  progress?: { percent?: number }
}

export default function InstructorStudentsPage() {
  return (
    <AuthGuard>
      <Students />
    </AuthGuard>
  )
}

function Students() {
  const t = useTranslations()
  const [rows, setRows] = useState<EnrollmentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    instructorsApi.students()
      .then((res) => setRows(unwrapList<EnrollmentRow>(res.data)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <EducationShell>
      <h1 className="text-2xl font-bold mb-6">{t('education.students')}</h1>
      {loading ? <ZendaLoader message={t('education.loading')} /> : null}
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="bg-white rounded-2xl border p-4">
            <p className="font-semibold">{row.user?.first_name || row.user?.email}</p>
            <p className="text-sm text-zenda-text-secondary">{row.course?.title} · {row.status}</p>
          </div>
        ))}
        {!loading && rows.length === 0 ? <p>{t('education.noResults')}</p> : null}
      </div>
    </EducationShell>
  )
}
