'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import Link from 'next/link'

export default function NewCoursePage() {
  const router = useRouter()
  const { user, checkAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    short_description: '',
    price: '',
    is_active: true,
  })

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
    setLoading(true)

    try {
      if (!user?.is_admin) {
        router.push('/login')
        return
      }

      const data = {
        ...formData,
        price: parseFloat(formData.price),
        slug: formData.slug || generateSlug(formData.title),
      }

      await adminApi.courses.create(data)
      router.push('/admin/courses')
    } catch (err: any) {
      const errorMsg = err.response?.data?.title?.[0] ||
                      err.response?.data?.slug?.[0] ||
                      err.response?.data?.price?.[0] ||
                      err.response?.data?.error ||
                      'Erro ao criar curso'
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
            href="/admin/courses"
            className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
          >
            ← Voltar para Cursos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Novo Curso</h1>
          <p className="text-gray-600">Criar um novo curso</p>
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
                placeholder="Ex: Curso Básico de Finanças Pessoais"
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
                placeholder="curso-basico-financas"
              />
              <p className="mt-1 text-sm text-gray-500">URL amigável (gerado automaticamente se deixar vazio)</p>
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
                placeholder="Breve descrição do curso"
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
                placeholder="Descrição detalhada do curso..."
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
                  placeholder="99.00"
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

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Link
                href="/admin/courses"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 font-semibold"
              >
                {loading ? 'A criar...' : 'Criar Curso'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
