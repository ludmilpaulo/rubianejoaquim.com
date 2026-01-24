'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import Link from 'next/link'

interface Course {
  id: number
  title: string
  slug: string
  description: string
  short_description: string
  price: string
  image: string | null
  is_active: boolean
  lessons?: any[]
  final_exam?: {
    id: number
    title: string
    questions?: Array<{ id: number }>
    passing_score: number
    max_attempts: number
  }
}

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params?.id as string
  const { user, checkAuth, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [course, setCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    short_description: '',
    price: '',
    is_active: true,
  })

  useEffect(() => {
    setMounted(true)
    checkAuth().then(() => {
      const currentUser = useAuthStore.getState().user
      if (!currentUser?.is_admin) {
        router.push('/login')
      }
    })
  }, [checkAuth, router])

  useEffect(() => {
    if (mounted && user?.is_admin && courseId) {
      fetchCourse()
    }
  }, [mounted, user, courseId])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      const [courseRes, examRes] = await Promise.all([
        adminApi.courses.get(parseInt(courseId)),
        adminApi.finalExams.list(parseInt(courseId)).catch(() => ({ data: { results: [] } })),
      ])
      const courseData = courseRes.data
      // Adicionar exame final se existir
      const examData = examRes.data.results || examRes.data
      if (Array.isArray(examData) && examData.length > 0) {
        courseData.final_exam = examData[0]
      }
      setCourse(courseData)
      setFormData({
        title: courseData.title,
        slug: courseData.slug,
        description: courseData.description,
        short_description: courseData.short_description || '',
        price: courseData.price,
        is_active: courseData.is_active,
      })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar curso')
    } finally {
      setLoading(false)
    }
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
      }

      await adminApi.courses.update(parseInt(courseId), data)
      // Success - redirect will happen
      router.push('/admin/courses')
    } catch (err: any) {
      const errorMsg = err.response?.data?.title?.[0] ||
                      err.response?.data?.slug?.[0] ||
                      err.response?.data?.price?.[0] ||
                      err.response?.data?.error ||
                      'Erro ao atualizar curso'
      setError(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  if (!mounted || isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user?.is_admin || !course) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/admin/courses"
            className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
          >
            ← Voltar para Cursos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Editar Curso</h1>
          <p className="text-gray-600">Editar informações do curso</p>
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
                Título do Curso *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={handleTitleChange}
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
              <p className="mt-1 text-sm text-gray-500">URL amigável</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição Curta
              </label>
              <input
                type="text"
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                maxLength={300}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição Completa *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço (KZ) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>

            {course.lessons && course.lessons.length > 0 && (
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aulas do Curso</h3>
                <div className="space-y-2">
                  {course.lessons.map((lesson: any) => (
                    <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{lesson.title}</p>
                        <p className="text-sm text-gray-500">
                          {lesson.is_free ? 'Grátis' : 'Paga'} • {lesson.duration} min
                        </p>
                      </div>
                      <Link
                        href={`/admin/lessons/${lesson.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Editar
                      </Link>
                    </div>
                  ))}
                </div>
                <Link
                  href={`/admin/lessons/new?course=${course.id}`}
                  className="mt-4 inline-block text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Adicionar Aula
                </Link>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Link
                href="/admin/courses"
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

          {/* Final Exam Section */}
          <div className="mt-8 border-t pt-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Exame Final</h3>
                <p className="text-sm text-gray-600 mt-1">Gerencie o exame final de múltipla escolha deste curso</p>
              </div>
              <Link
                href={`/admin/courses/${courseId}/exam`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
              >
                {course?.final_exam ? 'Editar Exame' : 'Criar Exame Final'}
              </Link>
            </div>
            {course?.final_exam ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Exame:</strong> {course.final_exam.title || 'Exame Final'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Perguntas: {course.final_exam.questions?.length || 0} | 
                  Pontuação mínima: {course.final_exam.passing_score}% |
                  Tentativas máximas: {course.final_exam.max_attempts}
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Nenhum exame final criado para este curso. Clique em "Criar Exame Final" para adicionar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
