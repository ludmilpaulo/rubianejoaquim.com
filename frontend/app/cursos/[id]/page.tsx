'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { coursesApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils/currency'

interface Lesson {
  id: number
  title: string
  slug: string
  description: string
  video_url: string
  duration: number
  is_free: boolean
  order: number
}

interface Course {
  id: number
  title: string
  description: string
  price: string
  lessons: Lesson[]
  enrollment_status: {
    status: string
    enrolled_at: string
    activated_at: string | null
  } | null
}

export default function CursoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await coursesApi.get(Number(params.id))
        setCourse(response.data)
      } catch (error) {
        console.error('Erro ao carregar curso:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [params.id])

  const handleEnroll = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    setEnrolling(true)
    try {
      await coursesApi.enroll(course!.id)
      router.push('/area-do-aluno')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao inscrever-se')
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-gray-500">Curso não encontrado.</p>
      </div>
    )
  }

  const hasAccess = course.enrollment_status?.status === 'active'
  const isPending = course.enrollment_status?.status === 'pending'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{course.title}</h1>
      <p className="text-lg text-gray-600 mb-8">{course.description}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-6">Conteúdo do Curso</h2>
          <div className="space-y-4">
            {course.lessons.map((lesson) => (
              <div key={lesson.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                    {lesson.description && (
                      <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{lesson.duration} min</span>
                      {lesson.is_free && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Grátis</span>
                      )}
                    </div>
                  </div>
                  {hasAccess || lesson.is_free ? (
                    <a
                      href={`/aulas/${lesson.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Ver Aula →
                    </a>
                  ) : (
                    <span className="text-gray-400">Bloqueado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-20">
            <div className="mb-6">
              <div className="text-3xl font-bold text-primary-600 mb-2">
                {formatCurrency(course.price)}
              </div>
              <p className="text-gray-600">{course.lessons.length} aulas</p>
            </div>

            {isPending ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Inscrição pendente. Aguarde aprovação do pagamento.
                  </p>
                </div>
                <a
                  href="/area-do-aluno"
                  className="block w-full bg-primary-600 text-white text-center py-2 rounded-lg hover:bg-primary-700 transition"
                >
                  Ver Minha Inscrição
                </a>
              </div>
            ) : hasAccess ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✓ Você tem acesso a este curso
                  </p>
                </div>
                <a
                  href="/area-do-aluno"
                  className="block w-full bg-primary-600 text-white text-center py-2 rounded-lg hover:bg-primary-700 transition"
                >
                  Ir para Área do Aluno
                </a>
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50"
              >
                {enrolling ? 'A processar...' : 'Comprar Curso'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
