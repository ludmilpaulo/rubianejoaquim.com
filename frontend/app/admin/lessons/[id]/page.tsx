'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import Link from 'next/link'

interface Attachment {
  id?: number
  title: string
  file: File | null
  file_url?: string
  file_type: 'pdf' | 'image' | 'audio' | 'video' | 'other'
  description: string
  order: number
}

interface Lesson {
  id: number
  course: number
  title: string
  slug: string
  description: string
  video_url: string
  duration: number
  content: string
  is_free: boolean
  order: number
  attachments?: Attachment[]
  quiz?: {
    id: number
    title: string
    questions?: Array<{ id: number }>
    passing_score: number
  }
}

export default function EditLessonPage() {
  const router = useRouter()
  const params = useParams()
  const lessonId = params?.id as string
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [formData, setFormData] = useState({
    course: '',
    title: '',
    slug: '',
    description: '',
    video_url: '',
    duration: 0,
    content: '',
    is_free: false,
    order: 0,
  })
  const [attachments, setAttachments] = useState<Attachment[]>([])

  useEffect(() => {
    if (!user?.is_admin) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      try {
        const [lessonRes, coursesRes, attachmentsRes, quizRes] = await Promise.all([
          adminApi.lessons.get(parseInt(lessonId)),
          adminApi.courses.list(),
          adminApi.lessonAttachments.list(parseInt(lessonId)),
          adminApi.lessonQuizzes.list(parseInt(lessonId)).catch(() => ({ data: { results: [] } })),
        ])

        const lessonData = lessonRes.data
        // Adicionar quiz se existir
        const quizData = quizRes.data.results || quizRes.data
        if (Array.isArray(quizData) && quizData.length > 0) {
          lessonData.quiz = quizData[0]
        }
        setLesson(lessonData)
        setFormData({
          course: lessonData.course?.id?.toString() || lessonData.course?.toString() || '',
          title: lessonData.title || '',
          slug: lessonData.slug || '',
          description: lessonData.description || '',
          video_url: lessonData.video_url || '',
          duration: lessonData.duration || 0,
          content: lessonData.content || '',
          is_free: lessonData.is_free || false,
          order: lessonData.order || 0,
        })

        const coursesData = coursesRes.data.results || coursesRes.data
        setCourses(Array.isArray(coursesData) ? coursesData : [])

        const attachmentsData = attachmentsRes.data.results || attachmentsRes.data
        const existingAttachments = Array.isArray(attachmentsData)
          ? attachmentsData.map((att: any) => ({
              id: att.id,
              title: att.title,
              file: null,
              file_url: att.file_url,
              file_type: att.file_type || 'other',
              description: att.description || '',
              order: att.order || 0,
            }))
          : []
        setAttachments(existingAttachments)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao carregar aula')
      } finally {
        setLoading(false)
      }
    }

    if (lessonId) {
      fetchData()
    }
  }, [user, router, lessonId])

  const addAttachment = () => {
    setAttachments([
      ...attachments,
      {
        title: '',
        file: null,
        file_type: 'pdf',
        description: '',
        order: attachments.length,
      },
    ])
  }

  const removeAttachment = async (index: number) => {
    const attachment = attachments[index]
    if (attachment.id) {
      // Delete existing attachment from server
      try {
        await adminApi.lessonAttachments.delete(attachment.id)
      } catch (err) {
        console.error('Error deleting attachment:', err)
      }
    }
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const updateAttachment = (index: number, field: keyof Attachment, value: any) => {
    const updated = [...attachments]
    updated[index] = { ...updated[index], [field]: value }
    setAttachments(updated)
  }

  const handleFileChange = (index: number, file: File | null) => {
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      let fileType: Attachment['file_type'] = 'other'
      
      if (ext === 'pdf') fileType = 'pdf'
      else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) fileType = 'image'
      else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) fileType = 'audio'
      else if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) fileType = 'video'
      
      updateAttachment(index, 'file', file)
      updateAttachment(index, 'file_type', fileType)
      if (!attachments[index].title) {
        updateAttachment(index, 'title', file.name)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (!user?.is_admin) {
        router.push('/login')
        return
      }

      // Atualizar a lesson
      const lessonData = {
        ...formData,
        course: parseInt(formData.course),
        duration: parseInt(formData.duration.toString()) || 0,
        order: parseInt(formData.order.toString()) || 0,
      }

      await adminApi.lessons.update(parseInt(lessonId), lessonData)

      // Processar attachments
      for (const attachment of attachments) {
        if (attachment.id) {
          // Atualizar attachment existente
          if (attachment.file) {
            // Se há novo arquivo, fazer upload
            const formData = new FormData()
            formData.append('title', attachment.title)
            formData.append('file', attachment.file)
            formData.append('file_type', attachment.file_type)
            formData.append('description', attachment.description)
            formData.append('order', attachment.order.toString())

            await adminApi.lessonAttachments.update(attachment.id, formData)
          } else {
            // Apenas atualizar metadados
            await adminApi.lessonAttachments.update(attachment.id, {
              title: attachment.title,
              file_type: attachment.file_type,
              description: attachment.description,
              order: attachment.order,
            })
          }
        } else if (attachment.file) {
          // Criar novo attachment
          const formData = new FormData()
          formData.append('lesson', lessonId)
          formData.append('title', attachment.title || attachment.file.name)
          formData.append('file', attachment.file)
          formData.append('file_type', attachment.file_type)
          formData.append('description', attachment.description)
          formData.append('order', attachment.order.toString())

          await adminApi.lessonAttachments.create(formData)
        }
      }

      router.push('/admin/lessons')
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.title?.[0] ||
        err.response?.data?.slug?.[0] ||
        err.response?.data?.course?.[0] ||
        err.response?.data?.error ||
        'Erro ao atualizar aula'
      setError(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Aula não encontrada</p>
          <Link href="/admin/lessons" className="text-primary-600 hover:text-primary-700">
            Voltar para Aulas
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/admin/lessons"
            className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
          >
            ← Voltar para Aulas
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Editar Aula</h1>
          <p className="text-gray-600">Editar detalhes da aula</p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Curso *
              </label>
              <select
                required
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              >
                <option value="">Selecione um curso</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título da Aula *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug (URL) *
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link do YouTube
              </label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conteúdo em Texto (HTML permitido)
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duração (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordem
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aula Gratuita
                </label>
                <select
                  value={formData.is_free ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_free: e.target.value === 'true' })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </select>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Anexos (PDF, Imagens, Áudio)</h3>
                <button
                  type="button"
                  onClick={addAttachment}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Adicionar Anexo
                </button>
              </div>

              {attachments.map((attachment, index) => (
                <div key={attachment.id || index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium text-gray-900">
                      Anexo {index + 1} {attachment.id && '(Existente)'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remover
                    </button>
                  </div>

                  {attachment.file_url && !attachment.file && (
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600 mb-2">Arquivo atual:</p>
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        {attachment.title} (Abrir)
                      </a>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título
                      </label>
                      <input
                        type="text"
                        value={attachment.title}
                        onChange={(e) => updateAttachment(index, 'title', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo
                      </label>
                      <select
                        value={attachment.file_type}
                        onChange={(e) => updateAttachment(index, 'file_type', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="pdf">PDF</option>
                        <option value="image">Imagem</option>
                        <option value="audio">Áudio</option>
                        <option value="video">Vídeo</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {attachment.file_url ? 'Substituir Arquivo' : 'Arquivo'}
                    </label>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp3,.wav,.ogg,.m4a,.mp4,.webm,.mov,.avi"
                    />
                    {attachment.file && (
                      <p className="mt-1 text-xs text-gray-500">Novo arquivo: {attachment.file.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={attachment.description}
                      onChange={(e) => updateAttachment(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}

              {attachments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum anexo adicionado. Clique em "Adicionar Anexo" para adicionar PDFs, imagens ou áudios.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Link
                href="/admin/lessons"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 font-semibold"
              >
                {saving ? 'A guardar...' : 'Guardar Alterações'}
              </button>
            </div>
          </form>

          {/* Quiz Section */}
          <div className="mt-8 border-t pt-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Quiz da Aula</h3>
                <p className="text-sm text-gray-600 mt-1">Gerencie o quiz de múltipla escolha desta aula</p>
              </div>
              <Link
                href={`/admin/lessons/${lessonId}/quiz`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
              >
                {lesson?.quiz ? 'Editar Quiz' : 'Criar Quiz'}
              </Link>
            </div>
            {lesson?.quiz ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Quiz:</strong> {lesson.quiz.title || 'Quiz da Aula'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Perguntas: {lesson.quiz.questions?.length || 0} | 
                  Pontuação mínima: {lesson.quiz.passing_score}%
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Nenhum quiz criado para esta aula. Clique em "Criar Quiz" para adicionar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
