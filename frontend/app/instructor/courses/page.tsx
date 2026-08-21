'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import EducationShell from '@/components/education/EducationShell'
import { instructorsApi } from '@/lib/api'
import { unwrapList, type Course } from '@/lib/types/education'
import { useTranslations } from '@/contexts/LocaleContext'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import ZendaButton from '@/components/zenda/ZendaButton'

export default function InstructorCoursesPage() {
  return (
    <AuthGuard>
      <List />
    </AuthGuard>
  )
}

function List() {
  const t = useTranslations()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    instructorsApi.courses.list()
      .then((res) => setCourses(unwrapList<Course>(res.data)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <EducationShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zenda-navy">{t('education.myContent')}</h1>
        <Link href="/instructor/courses/new"><ZendaButton>{t('education.createCourse')}</ZendaButton></Link>
      </div>
      {loading ? <ZendaLoader message={t('education.loading')} /> : null}
      {!loading && courses.length === 0 ? <p>{t('education.noResults')}</p> : null}
      <div className="space-y-3">
        {courses.map((course) => (
          <Link key={course.id} href={`/instructor/courses/${course.id}`} className="block bg-white rounded-2xl border border-zenda-border p-4 hover:shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <p className="font-semibold text-zenda-navy">{course.title}</p>
                <p className="text-sm text-zenda-text-secondary">{course.kind} · {course.status}</p>
              </div>
              <span className="text-sm font-medium text-zenda-primary">{course.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </EducationShell>
  )
}
