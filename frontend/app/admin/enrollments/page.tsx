'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'

interface Enrollment {
  id: number
  user: {
    id: number
    email: string
    username: string
    first_name: string
    last_name: string
  }
  course: {
    id: number
    title: string
  }
  status: 'pending' | 'active' | 'cancelled'
  enrolled_at: string
  activated_at: string | null
}

export default function AdminEnrollmentsPage() {
  const router = useRouter()
  const { user, checkAuth, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')

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
    if (mounted && user?.is_admin) {
      fetchEnrollments()
    }
  }, [mounted, user, statusFilter])

  const fetchEnrollments = async () => {
    try {
      setLoading(true)
      const response = await adminApi.enrollments.list(statusFilter || undefined)
      setEnrollments(response.data.results || response.data)
    } catch (err: any) {
      console.error('Error fetching enrollments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await adminApi.enrollments.approve(id)
      fetchEnrollments()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao aprovar matrícula')
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm('Tem certeza que deseja cancelar esta matrícula?')) return

    try {
      await adminApi.enrollments.cancel(id)
      fetchEnrollments()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao cancelar matrícula')
    }
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user?.is_admin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Matrículas</h1>
          <p className="text-gray-600">Ver e gerir matrículas dos alunos</p>
        </div>

        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === '' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === 'pending' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === 'active' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Ativas
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === 'cancelled' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Canceladas
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">Nenhuma matrícula encontrada</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aluno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {enrollment.user.first_name} {enrollment.user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{enrollment.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {enrollment.course.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        enrollment.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : enrollment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {enrollment.status === 'active' ? 'Ativa' : enrollment.status === 'pending' ? 'Pendente' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(enrollment.enrolled_at).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {enrollment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(enrollment.id)}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleCancel(enrollment.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      {enrollment.status === 'active' && (
                        <button
                          onClick={() => handleCancel(enrollment.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
