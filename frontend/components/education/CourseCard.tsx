'use client'

import Link from 'next/link'
import { useTranslations } from '@/contexts/LocaleContext'
import type { Course } from '@/lib/types/education'

export default function CourseCard({ course }: { course: Course }) {
  const t = useTranslations()
  const price =
    course.is_free || Number(course.price) === 0
      ? t('education.free')
      : `${course.currency} ${course.price}`

  return (
    <Link
      href={`/cursos/${course.id}`}
      className="group bg-white rounded-2xl border border-zenda-border overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <div className="h-36 bg-zenda-container relative">
        {course.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zenda-primary to-zenda-navy-mid" />
        )}
        {course.is_featured ? (
          <span className="absolute top-3 left-3 text-xs font-semibold bg-white/90 text-zenda-primary px-2 py-1 rounded-full">
            {t('education.featured')}
          </span>
        ) : null}
      </div>
      <div className="p-4 space-y-2">
        <p className="text-xs text-zenda-primary font-medium uppercase tracking-wide">
          {course.category_name || course.level}
        </p>
        <h3 className="font-semibold text-zenda-navy line-clamp-2 group-hover:text-zenda-primary">
          {course.title}
        </h3>
        <p className="text-sm text-zenda-text-secondary line-clamp-2">
          {course.instructor?.display_name}
        </p>
        <div className="flex items-center justify-between text-sm pt-1">
          <span className="text-zenda-navy/80">
            ★ {Number(course.rating_avg || 0).toFixed(1)} · {course.lessons_count} {t('education.hours')}
          </span>
          <span className="font-semibold text-zenda-primary">{price}</span>
        </div>
      </div>
    </Link>
  )
}
