'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'

interface PaymentProof {
  id: number
  enrollment: {
    id: number
    user: {
      email: string
      username: string
      first_name: string
      last_name: string
    }
    course: {
      title: string
    }
  }
  file: string
  file_url: string | null
  notes: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const { user, checkAuth, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [payments, setPayments] = useState<PaymentProof[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')

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
      fetchPayments()
    }
  }, [mounted, user, statusFilter])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await adminApi.paymentProofs.list(statusFilter || undefined)
      setPayments(response.data.results || response.data)
    } catch (err: any) {
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await adminApi.paymentProofs.approve(id)
      fetchPayments()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao aprovar pagamento')
    }
  }

  const handleReject = async (id: number) => {
    if (!confirm('Tem certeza que deseja rejeitar este comprovante?')) return

    try {
      await adminApi.paymentProofs.reject(id)
      fetchPayments()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao rejeitar pagamento')
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Comprovantes de Pagamento</h1>
          <p className="text-gray-600">Aprovar ou rejeitar comprovantes de pagamento</p>
        </div>

        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === 'pending' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === 'approved' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Aprovados
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === 'rejected' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Rejeitados
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">Nenhum comprovante encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {payment.enrollment.user.first_name} {payment.enrollment.user.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{payment.enrollment.user.email}</p>
                    <p className="text-sm font-medium text-gray-900 mt-2">
                      Curso: {payment.enrollment.course.title}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    payment.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : payment.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {payment.status === 'approved' ? 'Aprovado' : payment.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                  </span>
                </div>

                {payment.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Notas do aluno:</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{payment.notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {payment.file_url || payment.file ? (
                    <button
                      onClick={() => {
                        const url = payment.file_url || (payment.file.startsWith('http') ? payment.file : `http://localhost:8000${payment.file}`)
                        if (url) {
                          // Abrir em nova aba de forma segura
                          const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
                          if (!newWindow) {
                            // Se popup foi bloqueado, tentar abrir na mesma janela
                            window.location.href = url
                          }
                        }
                      }}
                      className="text-primary-600 hover:text-primary-700 font-medium underline cursor-pointer"
                    >
                      Ver Comprovante
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm">Arquivo não disponível</span>
                  )}
                  {payment.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(payment.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleReject(payment.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium"
                      >
                        Rejeitar
                      </button>
                    </>
                  )}
                  {payment.reviewed_at && (
                    <span className="text-xs text-gray-500">
                      Revisado em: {new Date(payment.reviewed_at).toLocaleString('pt-PT')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
