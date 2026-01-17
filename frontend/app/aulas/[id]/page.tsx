'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { lessonsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface Lesson {
  id: number
  title: string
  description: string
  video_url: string
  duration: number
  content: string
  is_free: boolean
  attachments: Array<{
    id: number
    title: string
    file: string
  }>
  progress: {
    completed: boolean
    completed_at: string | null
  } | null
}

export default function AulaPage() {
  const params = useParams()
  const { user } = useAuthStore()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await lessonsApi.get(Number(params.id))
        setLesson(response.data)
      } catch (error) {
        console.error('Erro ao carregar aula:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLesson()
  }, [params.id])

  const handleMarkCompleted = async () => {
    if (!user) return
    setMarking(true)
    try {
      await lessonsApi.markCompleted(lesson!.id)
      if (lesson) {
        setLesson({
          ...lesson,
          progress: { completed: true, completed_at: new Date().toISOString() },
        })
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao marcar como concluída')
    } finally {
      setMarking(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-gray-500">Aula não encontrada.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{lesson.title}</h1>
      {lesson.description && (
        <p className="text-lg text-gray-600 mb-8">{lesson.description}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Video Player */}
          <div className="bg-black rounded-lg overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
            <iframe
              src={lesson.video_url}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Content */}
          {lesson.content && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">Conteúdo da Aula</h2>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content }} />
            </div>
          )}

          {/* Attachments */}
          {lesson.attachments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Anexos</h2>
              <div className="space-y-2">
                {lesson.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>{attachment.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-20">
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Duração</div>
              <div className="font-semibold">{lesson.duration} minutos</div>
            </div>

            {user && (
              <div className="mb-4">
                {lesson.progress?.completed ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ Aula concluída
                    </p>
                    {lesson.progress.completed_at && (
                      <p className="text-xs text-green-600 mt-1">
                        {new Date(lesson.progress.completed_at).toLocaleDateString('pt-PT')}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleMarkCompleted}
                    disabled={marking}
                    className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    {marking ? 'A processar...' : 'Marcar como Concluída'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
