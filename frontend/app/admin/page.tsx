'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import { adminApi } from '@/lib/api'

interface Stats {
  totalCourses: number
  totalEnrollments: number
  totalMentorshipRequests: number
  pendingPayments: number
  pending_mobile_subscription_proofs?: number
  recent_enrollments?: any[]
  recent_payments?: any[]
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, checkAuth, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0,
    totalEnrollments: 0,
    totalMentorshipRequests: 0,
    pendingPayments: 0,
    recent_enrollments: [],
    recent_payments: [],
  })
  const [loadingStats, setLoadingStats] = useState(true)

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
      const fetchStats = async () => {
        try {
          const response = await adminApi.stats()
          setStats({
            totalCourses: response.data.total_courses,
            totalEnrollments: response.data.total_enrollments,
            totalMentorshipRequests: response.data.total_mentorship_requests,
            pendingPayments: response.data.pending_payments,
            pending_mobile_subscription_proofs: response.data.pending_mobile_subscription_proofs ?? 0,
            recent_enrollments: response.data.recent_enrollments || [],
            recent_payments: response.data.recent_payments || [],
          })
        } catch (error) {
          console.error('Error fetching stats:', error)
        } finally {
          setLoadingStats(false)
        }
      }
      fetchStats()
    }
  }, [mounted, user])

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Admin</h1>
          <p className="text-gray-600">Bem-vindo, {user.first_name || user.username}!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Cursos</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalCourses}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Matrículas</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalEnrollments}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pedidos de Mentoria</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalMentorshipRequests}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pagamentos Pendentes</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.pendingPayments}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/lessons"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Gerir Aulas</h3>
            </div>
            <p className="text-gray-600 text-sm">Criar, editar e gerir aulas dos cursos</p>
          </Link>
          
          <Link
            href="/admin/courses"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Gerir Cursos</h3>
            <p className="text-gray-600 text-sm">Criar, editar e gerir cursos e aulas</p>
          </Link>

          <Link
            href="/admin/enrollments"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Matrículas</h3>
            <p className="text-gray-600 text-sm">Ver e aprovar matrículas e pagamentos</p>
          </Link>

          <Link
            href="/admin/mentorship"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mentoria</h3>
            <p className="text-gray-600 text-sm">Gerir pedidos de mentoria</p>
          </Link>

          <Link
            href="/admin/users"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Utilizadores</h3>
            <p className="text-gray-600 text-sm">Gerir utilizadores e permissões</p>
          </Link>

          <Link
            href="/admin/payments"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pagamentos</h3>
            <p className="text-gray-600 text-sm">Ver e aprovar comprovantes de pagamento</p>
          </Link>

          <Link
            href="/admin/subscriptions"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-indigo-500"
          >
            <div className="flex items-center mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Subscrições App Zenda</h3>
            </div>
            <p className="text-gray-600 text-sm">Trial, ativar/desativar subscrições e comprovativos de pagamento do app móvel</p>
          </Link>

          <Link
            href="/admin/analytics"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Estatísticas</h3>
            <p className="text-gray-600 text-sm">Ver análises e relatórios</p>
          </Link>

          <Link
            href="/admin/questions"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Perguntas</h3>
            <p className="text-gray-600 text-sm">Criar e gerir perguntas de múltipla escolha</p>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Atividade Recente</h2>
          </div>
          <div className="p-6">
            {stats.recent_enrollments && stats.recent_enrollments.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Matrículas Recentes</h3>
                  <div className="space-y-2">
                    {stats.recent_enrollments.slice(0, 5).map((enrollment: any) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {enrollment.user?.first_name} {enrollment.user?.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{enrollment.course?.title}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          enrollment.status === 'active' ? 'bg-green-100 text-green-800' :
                          enrollment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {enrollment.status === 'active' ? 'Ativa' : enrollment.status === 'pending' ? 'Pendente' : enrollment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {stats.recent_payments && stats.recent_payments.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Pagamentos Recentes</h3>
                    <div className="space-y-2">
                      {stats.recent_payments.slice(0, 5).map((payment: any) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {payment.enrollment?.user?.first_name} {payment.enrollment?.user?.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{payment.enrollment?.course?.title}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                            payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status === 'approved' ? 'Aprovado' : payment.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhuma atividade recente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
