'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { adminApi, getFullUrl } from '@/lib/api'

interface Subscription {
  id: number
  user: number
  user_email: string
  user_name: string
  status: 'trial' | 'active' | 'expired' | 'cancelled'
  trial_ends_at: string | null
  subscription_ends_at: string | null
  has_access: boolean
  days_until_expiry: number | null
  created_at: string
  updated_at: string
}

interface PaymentProof {
  id: number
  subscription: number
  user_email: string
  user_name: string
  file: string
  notes: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  reviewed_by: number | null
  reviewed_by_email: string | null
}

const STATUS_LABELS: Record<string, string> = {
  trial: 'Semana grátis',
  active: 'Ativo',
  expired: 'Expirado',
  cancelled: 'Cancelado',
}

const STATUS_STYLES: Record<string, string> = {
  trial: 'bg-indigo-100 text-indigo-800',
  active: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-gray-100 text-gray-700',
}

const PROOF_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function AdminSubscriptionsPage() {
  const router = useRouter()
  const { user, checkAuth, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [proofs, setProofs] = useState<PaymentProof[]>([])
  const [subStatusFilter, setSubStatusFilter] = useState<string>('')
  const [proofStatusFilter, setProofStatusFilter] = useState<string>('pending')
  const [loadingSubs, setLoadingSubs] = useState(true)
  const [loadingProofs, setLoadingProofs] = useState(true)
  const [actingId, setActingId] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    checkAuth().then(() => {
      const currentUser = useAuthStore.getState().user
      if (!currentUser?.is_admin) {
        router.push('/login')
      }
    })
  }, [checkAuth, router])

  const fetchSubscriptions = async () => {
    try {
      setLoadingSubs(true)
      const res = await adminApi.subscriptions.list(subStatusFilter || undefined)
      setSubscriptions(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Error fetching subscriptions:', err)
      setSubscriptions([])
    } finally {
      setLoadingSubs(false)
    }
  }

  const fetchProofs = async () => {
    try {
      setLoadingProofs(true)
      const res = await adminApi.subscriptions.paymentProofs.list(proofStatusFilter || undefined)
      setProofs(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Error fetching payment proofs:', err)
      setProofs([])
    } finally {
      setLoadingProofs(false)
    }
  }

  useEffect(() => {
    if (mounted && user?.is_admin) {
      fetchSubscriptions()
    }
  }, [mounted, user, subStatusFilter])

  useEffect(() => {
    if (mounted && user?.is_admin) {
      fetchProofs()
    }
  }, [mounted, user, proofStatusFilter])

  const handleDeactivate = async (id: number) => {
    if (!confirm('Desativar esta subscrição? O utilizador perderá o acesso ao app.')) return
    try {
      setActingId(id)
      await adminApi.subscriptions.deactivate(id)
      fetchSubscriptions()
      fetchProofs()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao desativar')
    } finally {
      setActingId(null)
    }
  }

  const handleExtend30 = async (id: number) => {
    try {
      setActingId(id)
      await adminApi.subscriptions.extend30Days(id)
      fetchSubscriptions()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao estender')
    } finally {
      setActingId(null)
    }
  }

  const handleApproveProof = async (id: number) => {
    try {
      setActingId(id)
      await adminApi.subscriptions.paymentProofs.approve(id)
      fetchProofs()
      fetchSubscriptions()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao aprovar')
    } finally {
      setActingId(null)
    }
  }

  const handleRejectProof = async (id: number) => {
    if (!confirm('Rejeitar este comprovativo?')) return
    try {
      setActingId(id)
      await adminApi.subscriptions.paymentProofs.reject(id)
      fetchProofs()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao rejeitar')
    } finally {
      setActingId(null)
    }
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar ao Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Subscrições App Zenda
            </h1>
            <p className="text-gray-600 mt-1">
              Gerir utilizadores em trial, ativar e desativar subscrições conforme comprovativos de pagamento
            </p>
          </div>
        </div>

        {/* Payment proofs first (pending) — most actionable */}
        <section className="mb-10">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  Comprovativos de pagamento
                </h2>
                <div className="flex gap-2">
                  {['pending', 'approved', 'rejected'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setProofStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        proofStatusFilter === s
                          ? s === 'pending'
                            ? 'bg-amber-600 text-white'
                            : s === 'approved'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s === 'pending' ? 'Pendentes' : s === 'approved' ? 'Aprovados' : 'Rejeitados'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              {loadingProofs ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : proofs.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-gray-500">Nenhum comprovativo {proofStatusFilter === 'pending' ? 'pendente' : proofStatusFilter === 'approved' ? 'aprovado' : 'rejeitado'}.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Utilizador</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Notas</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {proofs.map((proof) => (
                      <tr key={proof.id} className="hover:bg-gray-50/80">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{proof.user_name || proof.user_email}</div>
                          <div className="text-sm text-gray-500">{proof.user_email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(proof.created_at).toLocaleString('pt-PT')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {proof.notes || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${PROOF_STATUS_STYLES[proof.status] || 'bg-gray-100'}`}>
                            {proof.status === 'pending' ? 'Pendente' : proof.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                          </span>
                          {proof.reviewed_by_email && (
                            <div className="text-xs text-gray-400 mt-1">Por {proof.reviewed_by_email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <a
                            href={getFullUrl(proof.file)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm mr-4"
                          >
                            Ver ficheiro
                          </a>
                          {proof.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveProof(proof.id)}
                                disabled={actingId === proof.id}
                                className="text-emerald-600 hover:text-emerald-800 font-medium text-sm mr-3 disabled:opacity-50"
                              >
                                {actingId === proof.id ? '...' : 'Aprovar'}
                              </button>
                              <button
                                onClick={() => handleRejectProof(proof.id)}
                                disabled={actingId === proof.id}
                                className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        {/* Subscriptions list */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </span>
                  Subscrições App Móvel
                </h2>
                <div className="flex gap-2">
                  {['', 'trial', 'active', 'expired', 'cancelled'].map((s) => (
                    <button
                      key={s || 'all'}
                      onClick={() => setSubStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        subStatusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s === '' ? 'Todas' : s === 'trial' ? 'Trial' : s === 'active' ? 'Ativas' : s === 'expired' ? 'Expiradas' : 'Canceladas'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              {loadingSubs ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-gray-500">Nenhuma subscrição encontrada.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Utilizador</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trial até</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subscrição até</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acesso</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50/80">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{sub.user_name || sub.user_email}</div>
                          <div className="text-sm text-gray-500">{sub.user_email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[sub.status] || 'bg-gray-100'}`}>
                            {STATUS_LABELS[sub.status] ?? sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString('pt-PT') : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sub.subscription_ends_at ? new Date(sub.subscription_ends_at).toLocaleDateString('pt-PT') : '—'}
                        </td>
                        <td className="px-6 py-4">
                          {sub.has_access ? (
                            <span className="text-emerald-600 font-medium text-sm">Sim</span>
                          ) : (
                            <span className="text-gray-400 text-sm">Não</span>
                          )}
                          {sub.days_until_expiry != null && sub.has_access && (
                            <div className="text-xs text-gray-400">{sub.days_until_expiry} dias restantes</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {sub.status !== 'cancelled' && (
                            <button
                              onClick={() => handleDeactivate(sub.id)}
                              disabled={actingId === sub.id}
                              className="text-red-600 hover:text-red-800 font-medium text-sm mr-3 disabled:opacity-50"
                            >
                              Desativar
                            </button>
                          )}
                          {(sub.status === 'expired' || sub.status === 'cancelled' || sub.status === 'trial') && (
                            <button
                              onClick={() => handleExtend30(sub.id)}
                              disabled={actingId === sub.id}
                              className="text-indigo-600 hover:text-indigo-800 font-medium text-sm disabled:opacity-50"
                            >
                              +30 dias
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
