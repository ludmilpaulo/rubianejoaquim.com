'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { instructorsApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import { useTranslations } from '@/contexts/LocaleContext'
import { useAuthStore } from '@/lib/store'
import ZendaButton from '@/components/zenda/ZendaButton'
import ZendaAlert from '@/components/zenda/ZendaAlert'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import type { EducatorApplication } from '@/lib/types/education'

export default function ApplyInstructorPage() {
  return (
    <AuthGuard>
      <ApplyForm />
    </AuthGuard>
  )
}

function ApplyForm() {
  const t = useTranslations()
  const router = useRouter()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [existing, setExisting] = useState<EducatorApplication | null>(null)
  const [fullName, setFullName] = useState(`${user?.first_name || ''} ${user?.last_name || ''}`.trim())
  const [biography, setBiography] = useState('')
  const [country, setCountry] = useState('')
  const [languages, setLanguages] = useState('pt')
  const [expertise, setExpertise] = useState('')
  const [qualifications, setQualifications] = useState('')
  const [experience, setExperience] = useState('')
  const [teachingExperience, setTeachingExperience] = useState('')
  const [areasToTeach, setAreasToTeach] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [website, setWebsite] = useState('')
  const [youtube, setYoutube] = useState('')
  const [roles, setRoles] = useState<string[]>(['instructor'])

  useEffect(() => {
    instructorsApi.myApplication()
      .then((res) => {
        const app = res.data.application as EducatorApplication | null
        setExisting(app)
      })
      .catch(() => setExisting(null))
      .finally(() => setLoading(false))
  }, [])

  const toggleRole = (role: string) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await instructorsApi.apply({
        full_name: fullName,
        biography,
        country,
        languages: languages.split(',').map((s) => s.trim()).filter(Boolean),
        areas_of_expertise: expertise.split(',').map((s) => s.trim()).filter(Boolean),
        qualifications,
        experience,
        teaching_experience: teachingExperience,
        areas_to_teach: areasToTeach.split(',').map((s) => s.trim()).filter(Boolean),
        linkedin_url: linkedin,
        website,
        youtube_channel: youtube,
        roles_requested: roles,
      })
      setSuccess(t('education.applicationPending'))
    } catch (err) {
      setError(getApiErrorMessage(err, t('education.genericError')))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <ZendaLoader message={t('education.loading')} />

  if (user?.is_instructor) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <ZendaAlert tone="success">{t('education.applicationApproved')}</ZendaAlert>
        <ZendaButton onClick={() => router.push('/instructor')}>{t('education.goDashboard')}</ZendaButton>
      </div>
    )
  }

  if (existing && existing.status === 'pending') {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <ZendaAlert tone="info">{t('education.applicationPending')}</ZendaAlert>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-display font-bold text-zenda-navy">{t('education.becomeInstructor')}</h1>
      <p className="text-zenda-text-secondary mt-2 mb-8">{t('education.becomeSubtitle')}</p>
      {error ? <ZendaAlert tone="error" className="mb-4">{error}</ZendaAlert> : null}
      {success ? <ZendaAlert tone="success" className="mb-4">{success}</ZendaAlert> : null}
      <form onSubmit={submit} className="space-y-4 bg-white rounded-2xl border border-zenda-border p-6">
        <label className="block text-sm font-medium">{t('education.fullName')}
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">{t('education.biography')}
          <textarea required value={biography} onChange={(e) => setBiography(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[120px]" />
        </label>
        <label className="block text-sm font-medium">{t('education.country')}
          <input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">{t('education.languages')}
          <input value={languages} onChange={(e) => setLanguages(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">{t('education.expertise')}
          <input value={expertise} onChange={(e) => setExpertise(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">{t('education.qualifications')}
          <textarea value={qualifications} onChange={(e) => setQualifications(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">{t('education.experience')}
          <textarea value={experience} onChange={(e) => setExperience(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">{t('education.teachingExperience')}
          <textarea value={teachingExperience} onChange={(e) => setTeachingExperience(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">{t('education.areasToTeach')}
          <input value={areasToTeach} onChange={(e) => setAreasToTeach(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">{t('education.linkedin')}
          <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">{t('education.website')}
          <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">{t('education.youtube')}
          <input type="url" value={youtube} onChange={(e) => setYoutube(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <fieldset className="text-sm">
          <legend className="font-medium mb-2">{t('education.roles')}</legend>
          {(['instructor', 'mentor', 'tutor'] as const).map((role) => (
            <label key={role} className="mr-4 inline-flex items-center gap-2">
              <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
              {t(role === 'instructor' ? 'education.roleInstructor' : role === 'mentor' ? 'education.roleMentor' : 'education.roleTutor')}
            </label>
          ))}
        </fieldset>
        <ZendaButton type="submit" disabled={saving}>{t('education.submitApplication')}</ZendaButton>
      </form>
    </div>
  )
}
