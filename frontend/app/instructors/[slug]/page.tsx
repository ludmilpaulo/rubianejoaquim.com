'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { instructorsApi } from '@/lib/api'
import { unwrapList, type Course, type InstructorPublic } from '@/lib/types/education'
import { useTranslations } from '@/contexts/LocaleContext'
import CourseCard from '@/components/education/CourseCard'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import ZendaAlert from '@/components/zenda/ZendaAlert'

export default function InstructorProfilePage() {
  const t = useTranslations()
  const params = useParams()
  const slug = String(params?.slug || '')
  const [instructor, setInstructor] = useState<InstructorPublic | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!slug) return
    Promise.all([instructorsApi.publicGet(slug), instructorsApi.publicCourses(slug)])
      .then(([p, c]) => {
        setInstructor(p.data as InstructorPublic)
        setCourses(unwrapList<Course>(c.data))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <ZendaLoader message={t('education.loading')} />
  if (error || !instructor) {
    return (
      <div className="max-w-lg mx-auto py-16">
        <ZendaAlert tone="error">{t('education.genericError')}</ZendaAlert>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <section className="bg-white rounded-3xl border border-zenda-border p-8">
        <h1 className="text-3xl font-display font-bold text-zenda-navy">{instructor.display_name}</h1>
        <p className="text-zenda-text-secondary mt-1">{instructor.headline}</p>
        <p className="mt-4">★ {Number(instructor.rating_avg).toFixed(1)} · {instructor.students_count} {t('education.students')} · {instructor.courses_count} {t('education.courses')}</p>
        {instructor.youtube_channel ? (
          <a href={instructor.youtube_channel} className="text-zenda-primary text-sm mt-2 inline-block" target="_blank" rel="noreferrer">
            YouTube
          </a>
        ) : null}
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">{t('education.about')}</h2>
        <p className="text-zenda-text-secondary whitespace-pre-wrap">{instructor.bio}</p>
      </section>
      <section>
        <h2 className="text-xl font-bold mb-4">{t('education.courseTab')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => <CourseCard key={course.id} course={course} />)}
        </div>
      </section>
      <Link href="/mentoria" className="text-zenda-primary font-semibold">{t('education.bookSession')}</Link>
    </div>
  )
}
