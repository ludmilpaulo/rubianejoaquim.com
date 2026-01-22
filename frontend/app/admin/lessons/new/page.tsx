'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import Link from 'next/link'

interface Attachment {
  id?: number
  title: string
  file: File | null
  file_type: 'pdf' | 'image' | 'audio' | 'video' | 'other'
  description: string
  order: number
}

export default function NewLessonPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

    const fetchCourses = async () => {
      try {
        const response = await adminApi.courses.list()
        const data = response.data.results || response.data
        setCourses(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching courses:', error)
      }
    }

    fetchCourses()
  }, [user, router])

  const generateSlug = (title: string) => {
    if (!title) return ''
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais, mantém letras, números, espaços e hífens
      .trim()
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/(^-|-$)/g, '') // Remove hífens no início e fim
      .substring(0, 50) // Limita o tamanho
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData({
      ...formData,
      title,
      slug: formData.slug || generateSlug(title),
    })
  }

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

  const removeAttachment = (index: number) => {
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
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!user?.is_admin) {
        router.push('/login')
        return
      }

      // Criar a lesson primeiro
      const lessonData = {
        ...formData,
        course: parseInt(formData.course),
        slug: formData.slug || generateSlug(formData.title),
        duration: parseInt(formData.duration.toString()) || 0,
        order: parseInt(formData.order.toString()) || 0,
      }

      const lessonResponse = await adminApi.lessons.create(lessonData)
      const lessonId = lessonResponse.data.id

      // Upload dos attachments
      for (const attachment of attachments) {
        if (attachment.file) {
          const formData = new FormData()
          formData.append('lesson', lessonId.toString())
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
        'Erro ao criar aula'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nova Aula</h1>
          <p className="text-gray-600">Criar uma nova aula</p>
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
                onChange={handleTitleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                placeholder="Ex: Introdução às Finanças Pessoais"
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
                placeholder="introducao-financas-pessoais"
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
                placeholder="Breve descrição da aula..."
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
              <p className="mt-1 text-sm text-gray-500">
                URL completa do vídeo do YouTube
              </p>
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
                placeholder="Conteúdo da aula em HTML ou texto simples..."
              />
              <p className="mt-1 text-sm text-gray-500">
                Você pode usar HTML para formatar o texto
              </p>
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
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium text-gray-900">Anexo {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remover
                    </button>
                  </div>

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
                        placeholder="Nome do arquivo"
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
                      Arquivo
                    </label>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp3,.wav,.ogg,.m4a,.mp4,.webm,.mov,.avi"
                    />
                    {attachment.file && (
                      <p className="mt-1 text-xs text-gray-500">{attachment.file.name}</p>
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
                      placeholder="Descrição do anexo..."
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
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 font-semibold"
              >
                {loading ? 'A criar...' : 'Criar Aula'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
