'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { coursesApi } from '@/lib/api'

interface Lesson {
  id: number
  title: string
  slug: string
  description: string
  video_url: string
  duration: number
  course: {
    id: number
    title: string
  }
}

export default function ConteudosGratisPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await coursesApi.freeLessons()
        setLessons(response.data)
      } catch (error) {
        console.error('Erro ao carregar aulas grátis:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLessons()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Conteúdos Grátis</h1>
      <p className="text-lg text-gray-600 mb-12">
        Acesse aulas gratuitas para conhecer o nosso método e começar a sua jornada de educação financeira.
      </p>

      {lessons.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma aula gratuita disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
              <div className="mb-2">
                <span className="text-xs text-gray-500">{lesson.course.title}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{lesson.title}</h3>
              {lesson.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{lesson.description}</p>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{lesson.duration} min</span>
                <Link
                  href={`/aulas/${lesson.id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Ver Aula →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
