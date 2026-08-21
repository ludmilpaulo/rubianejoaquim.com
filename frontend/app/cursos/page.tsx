'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { coursesApi, instructorsApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import { unwrapList, type Category, type Course, type MarketplaceHome, type MentorPublic, type TutorPublic } from '@/lib/types/education'
import { useTranslations } from '@/contexts/LocaleContext'
import CourseCard from '@/components/education/CourseCard'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import ZendaButton from '@/components/zenda/ZendaButton'
import ZendaAlert from '@/components/zenda/ZendaAlert'
import { useAuthStore } from '@/lib/store'

export default function CursosPage() {
  const t = useTranslations()
  const { user } = useAuthStore()
  const [home, setHome] = useState<MarketplaceHome | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tutors, setTutors] = useState<TutorPublic[]>([])
  const [mentors, setMentors] = useState<MentorPublic[]>([])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [language, setLanguage] = useState('')
  const [level, setLevel] = useState('')
  const [paid, setPaid] = useState('')
  const [tab, setTab] = useState<'courses' | 'tutorials' | 'tutors' | 'mentors'>('courses')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string> = {}
      if (q) params.q = q
      if (category) params.category = category
      if (language) params.language = language
      if (level) params.level = level
      if (paid === 'free') params.free = '1'
      if (paid === 'paid') params.paid = '1'
      if (tab === 'tutorials') params.kind = 'tutorial'
      if (tab === 'courses') params.kind = 'course'
      const [listRes, homeRes, catRes, tutorRes, mentorRes] = await Promise.all([
        coursesApi.list(params),
        coursesApi.marketplace(),
        coursesApi.categories(),
        instructorsApi.tutors(),
        instructorsApi.mentors(),
      ])
      setCourses(unwrapList<Course>(listRes.data))
      setHome(homeRes.data as MarketplaceHome)
      setCategories(unwrapList<Category>(catRes.data))
      setTutors(unwrapList<TutorPublic>(tutorRes.data))
      setMentors(unwrapList<MentorPublic>(mentorRes.data))
    } catch (err) {
      setError(getApiErrorMessage(err, t('education.genericError')))
    } finally {
      setLoading(false)
    }
  }, [q, category, language, level, paid, tab, t])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-zenda-navy via-[#11145A] to-zenda-primary text-white p-8 md:p-12 shadow-xl">
        <p className="text-zenda-growth font-semibold uppercase tracking-wide text-sm mb-3">{t('education.label')}</p>
        <h1 className="text-3xl md:text-5xl font-display font-bold max-w-3xl">{t('education.heroTitle')}</h1>
        <p className="mt-4 text-white/80 max-w-2xl text-lg">{t('education.heroSubtitle')}</p>
        <form
          className="mt-8 flex flex-col sm:flex-row gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void load()
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('education.searchPlaceholder')}
            className="flex-1 min-h-[48px] rounded-xl px-4 text-zenda-navy"
          />
          <ZendaButton type="submit">{t('education.exploreCourses')}</ZendaButton>
        </form>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/instructor/apply" className="text-sm underline text-white/90">
            {t('education.applyCta')}
          </Link>
          {user?.is_instructor ? (
            <Link href="/instructor" className="text-sm underline text-white/90">
              {t('education.goDashboard')}
            </Link>
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {(['courses', 'tutorials', 'tutors', 'mentors'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              tab === id ? 'bg-zenda-primary text-white' : 'bg-white border border-zenda-border text-zenda-navy'
            }`}
          >
            {t(
              id === 'courses'
                ? 'education.courseTab'
                : id === 'tutorials'
                  ? 'education.tutorialTab'
                  : id === 'tutors'
                    ? 'education.tutorTab'
                    : 'education.mentorTab',
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-zenda-border px-3 py-2 text-sm">
          <option value="">{t('education.category')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.localized_name || c.name}
            </option>
          ))}
        </select>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl border border-zenda-border px-3 py-2 text-sm">
          <option value="">{t('education.language')}</option>
          <option value="pt">Português</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-xl border border-zenda-border px-3 py-2 text-sm">
          <option value="">{t('education.level')}</option>
          <option value="beginner">{t('education.beginner')}</option>
          <option value="intermediate">{t('education.intermediate')}</option>
          <option value="advanced">{t('education.advanced')}</option>
        </select>
        <select value={paid} onChange={(e) => setPaid(e.target.value)} className="rounded-xl border border-zenda-border px-3 py-2 text-sm">
          <option value="">{t('education.freePaid')}</option>
          <option value="free">{t('education.free')}</option>
          <option value="paid">{t('education.paid')}</option>
        </select>
      </div>

      {loading ? (
        <ZendaLoader message={t('education.loading')} />
      ) : error ? (
        <ZendaAlert tone="error">
          <p className="font-semibold">{t('education.errorTitle')}</p>
          <p>{error}</p>
          <button type="button" className="underline mt-2" onClick={() => void load()}>
            {t('education.tryAgain')}
          </button>
        </ZendaAlert>
      ) : tab === 'tutors' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tutors.length === 0 ? <p>{t('education.noResults')}</p> : tutors.map((tutor) => (
            <div key={tutor.id} className="bg-white rounded-2xl border border-zenda-border p-5">
              <h3 className="font-semibold text-zenda-navy">{tutor.display_name}</h3>
              <p className="text-sm text-zenda-text-secondary mt-1">{tutor.headline}</p>
              <p className="mt-3">★ {Number(tutor.rating_avg).toFixed(1)}</p>
              <p className="font-semibold text-zenda-primary mt-2">
                {tutor.currency} {tutor.hourly_rate} {t('education.hourly')}
              </p>
              <Link href={`/mentoria?tutor=${tutor.id}`} className="inline-block mt-4 text-zenda-primary font-semibold">
                {t('education.bookSession')}
              </Link>
            </div>
          ))}
        </div>
      ) : tab === 'mentors' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mentors.length === 0 ? <p>{t('education.noResults')}</p> : mentors.map((mentor) => (
            <div key={mentor.id} className="bg-white rounded-2xl border border-zenda-border p-5">
              <h3 className="font-semibold text-zenda-navy">{mentor.display_name}</h3>
              <p className="text-sm text-zenda-text-secondary mt-1">{mentor.headline}</p>
              <p className="mt-3">★ {Number(mentor.rating_avg).toFixed(1)}</p>
              <Link href={`/mentoria?mentor=${mentor.id}`} className="inline-block mt-4 text-zenda-primary font-semibold">
                {t('education.bookSession')}
              </Link>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <p className="text-zenda-text-secondary">{t('education.emptyCourses')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {home && tab === 'courses' && !q ? (
        <section>
          <h2 className="text-2xl font-bold text-zenda-navy mb-4">{t('education.topInstructors')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {home.instructors.map((inst) => (
              <Link key={inst.id} href={`/instructors/${inst.slug}`} className="bg-white rounded-2xl border border-zenda-border p-4 hover:shadow-md">
                <p className="font-semibold text-zenda-navy">{inst.display_name}</p>
                <p className="text-sm text-zenda-text-secondary line-clamp-2">{inst.headline}</p>
                <p className="text-sm mt-2">★ {Number(inst.rating_avg).toFixed(1)} · {inst.students_count} {t('education.students')}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
