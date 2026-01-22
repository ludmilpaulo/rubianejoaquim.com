'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import Link from 'next/link'

interface Stats {
  total_courses: number
  active_courses: number
  total_lessons: number
  free_lessons: number
  total_enrollments: number
  active_enrollments: number
  pending_enrollments: number
  total_users: number
  total_mentorship_requests: number
  pending_payments: number
  approved_payments: number
  rejected_payments: number
  total_progress: number
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const { user, checkAuth, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

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
      fetchStats()
    }
  }, [mounted, user])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await adminApi.stats()
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
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

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Estatísticas e Relatórios</h1>
          <p className="text-gray-600">Análise completa da plataforma</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Cursos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_courses}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.active_courses} ativos</p>
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
                <p className="text-sm font-medium text-gray-600">Total de Utilizadores</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_users}</p>
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
                <p className="text-sm font-medium text-gray-600">Matrículas Ativas</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.active_enrollments}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.pending_enrollments} pendentes</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aulas Concluídas</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_progress}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cursos e Aulas</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total de Cursos</span>
                <span className="font-semibold text-gray-900">{stats.total_courses}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cursos Ativos</span>
                <span className="font-semibold text-green-600">{stats.active_courses}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total de Aulas</span>
                <span className="font-semibold text-gray-900">{stats.total_lessons}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Aulas Grátis</span>
                <span className="font-semibold text-blue-600">{stats.free_lessons}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Matrículas</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total de Matrículas</span>
                <span className="font-semibold text-gray-900">{stats.total_enrollments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Matrículas Ativas</span>
                <span className="font-semibold text-green-600">{stats.active_enrollments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Matrículas Pendentes</span>
                <span className="font-semibold text-yellow-600">{stats.pending_enrollments}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pagamentos</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pendentes</span>
                <span className="font-semibold text-yellow-600">{stats.pending_payments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Aprovados</span>
                <span className="font-semibold text-green-600">{stats.approved_payments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rejeitados</span>
                <span className="font-semibold text-red-600">{stats.rejected_payments}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mentoria</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total de Pedidos</span>
                <span className="font-semibold text-gray-900">{stats.total_mentorship_requests}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link
              href="/admin/courses"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition text-center"
            >
              <p className="font-medium text-gray-900">Gerir Cursos</p>
            </Link>
            <Link
              href="/admin/enrollments"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition text-center"
            >
              <p className="font-medium text-gray-900">Ver Matrículas</p>
            </Link>
            <Link
              href="/admin/payments"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition text-center"
            >
              <p className="font-medium text-gray-900">Ver Pagamentos</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
