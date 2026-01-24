'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils/currency'

interface MentorshipRequest {
  id: number
  user: {
    id: number
    email: string
    username: string
    first_name: string
    last_name: string
  }
  package: {
    id: number
    title: string
    price: string
  }
  objective: string
  availability: string
  contact: string
  status: 'pending' | 'approved' | 'scheduled' | 'completed' | 'cancelled'
  notes: string
  created_at: string
  payment_proof: {
    id: number
    status: string
    file: string
    file_url?: string | null
  } | null
}

export default function AdminMentorshipPage() {
  const router = useRouter()
  const { user, checkAuth, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [requests, setRequests] = useState<MentorshipRequest[]>([])
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
      fetchRequests()
    }
  }, [mounted, user, statusFilter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await adminApi.mentorship.requests.list(statusFilter || undefined)
      setRequests(response.data.results || response.data)
    } catch (err: any) {
      console.error('Error fetching requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await adminApi.mentorship.requests.approve(id)
      fetchRequests()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao aprovar pedido')
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return

    try {
      await adminApi.mentorship.requests.cancel(id)
      fetchRequests()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao cancelar pedido')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      approved: 'Aprovado',
      scheduled: 'Agendado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    }
    return labels[status] || status
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pedidos de Mentoria</h1>
          <p className="text-gray-600">Gerir pedidos de mentoria dos alunos</p>
        </div>

        <div className="mb-6 flex gap-4 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === '' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Todos
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
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === 'approved' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Aprovados
          </button>
          <button
            onClick={() => setStatusFilter('scheduled')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === 'scheduled' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Agendados
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === 'completed' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Concluídos
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.user.first_name} {request.user.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{request.user.email}</p>
                    <p className="text-sm font-medium text-gray-900 mt-2">
                      Pacote: {request.package.title} - {formatCurrency(request.package.price)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                    {getStatusLabel(request.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Objetivo:</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{request.objective}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Disponibilidade:</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{request.availability}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Contacto:</p>
                  <p className="text-sm text-gray-900">{request.contact}</p>
                </div>

                {request.payment_proof && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">Comprovante de Pagamento:</p>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        request.payment_proof.status === 'approved' ? 'bg-green-100 text-green-800' :
                        request.payment_proof.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.payment_proof.status === 'approved' ? 'Aprovado' :
                         request.payment_proof.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                      </span>
                      <button
                        onClick={() => {
                          if (!request.payment_proof) return
                          const url = request.payment_proof.file_url || (request.payment_proof.file?.startsWith('http') ? request.payment_proof.file : `http://localhost:8000${request.payment_proof.file}`)
                          if (url) {
                            const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
                            if (!newWindow) {
                              window.location.href = url
                            }
                          }
                        }}
                        className="text-primary-600 hover:text-primary-700 font-medium underline cursor-pointer"
                      >
                        Ver Comprovante
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleCancel(request.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  {request.status === 'approved' && (
                    <button
                      onClick={() => handleCancel(request.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium"
                    >
                      Cancelar
                    </button>
                  )}
                  <span className="text-xs text-gray-500">
                    Criado em: {new Date(request.created_at).toLocaleString('pt-PT')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
