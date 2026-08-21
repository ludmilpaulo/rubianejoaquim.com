'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { coursesApi } from '@/lib/api'
import type { CertificateRecord } from '@/lib/types/education'
import { useTranslations } from '@/contexts/LocaleContext'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import ZendaAlert from '@/components/zenda/ZendaAlert'

export default function VerifyCertificatePage() {
  const t = useTranslations()
  const params = useParams()
  const code = String(params?.code || '')
  const [cert, setCert] = useState<CertificateRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    if (!code) return
    coursesApi.verifyCertificate(code)
      .then((res) => setCert(res.data as CertificateRecord))
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false))
  }, [code])

  if (loading) return <ZendaLoader message={t('education.loading')} />

  return (
    <div className="max-w-lg mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-4">{t('education.verifyCert')}</h1>
      {invalid || !cert ? (
        <ZendaAlert tone="error">{t('education.invalidCert')}</ZendaAlert>
      ) : (
        <div className="bg-white rounded-2xl border p-6 space-y-2">
          <ZendaAlert tone="success">{t('education.validCert')}</ZendaAlert>
          <p className="font-semibold">{cert.student_name}</p>
          <p>{cert.course_title}</p>
          <p className="text-sm text-zenda-text-secondary">{cert.instructor_name}</p>
          <p className="text-xs">{cert.code}</p>
        </div>
      )}
    </div>
  )
}
