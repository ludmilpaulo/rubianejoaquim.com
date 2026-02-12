'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'

const TRANSACTION_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'earned', label: 'Ganho' },
  { value: 'spent', label: 'Gasto' },
  { value: 'expired', label: 'Expirado' },
  { value: 'admin_adjustment', label: 'Ajuste Admin' },
]

interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
}

interface PointTransaction {
  id: number
  user_id: number
  user_email: string
  transaction_type: string
  points: string
  balance_after: string
  description: string
  course_title: string | null
  created_at: string
}

export default function AdminUserPointsPage() {
  const router = useRouter()
  const { user, checkAuth, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)

  const [filterUserId, setFilterUserId] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')

  const [balanceUserId, setBalanceUserId] = useState<string>('')
  const [balanceResult, setBalanceResult] = useState<{
    user_id: number
    user_email: string
    balance: number
    balance_kz: number
  } | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  const [adjustUserId, setAdjustUserId] = useState<string>('')
  const [adjustPoints, setAdjustPoints] = useState<string>('')
  const [adjustDescription, setAdjustDescription] = useState<string>('')
  const [adjustLoading, setAdjustLoading] = useState(false)
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null)
  const [adjustError, setAdjustError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    checkAuth().then(() => {
      const currentUser = useAuthStore.getState().user
      if (!currentUser?.is_admin) {
        router.push('/login')
      }
    })
  }, [checkAuth, router])

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true)
      const res = await adminApi.users.list()
      setUsers(res.data.results || res.data || [])
    } catch {
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const params: { user_id?: number; transaction_type?: string } = {}
      if (filterUserId.trim()) params.user_id = parseInt(filterUserId.trim(), 10)
      if (filterType.trim()) params.transaction_type = filterType
      const res = await adminApi.userPoints.list(params)
      const data = res.data
      setTransactions(Array.isArray(data) ? data : data?.results || [])
    } catch (err: any) {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [filterUserId, filterType])

  useEffect(() => {
    if (mounted && user?.is_admin) {
      fetchUsers()
    }
  }, [mounted, user?.is_admin, fetchUsers])

  useEffect(() => {
    if (mounted && user?.is_admin) {
      fetchTransactions()
    }
  }, [mounted, user?.is_admin, fetchTransactions])

  const handleGetBalance = async () => {
    const id = balanceUserId.trim()
    if (!id) {
      setBalanceError('Indique o ID do utilizador.')
      setBalanceResult(null)
      return
    }
    const numId = parseInt(id, 10)
    if (Number.isNaN(numId)) {
      setBalanceError('ID do utilizador inválido.')
      setBalanceResult(null)
      return
    }
    setBalanceError(null)
    setBalanceResult(null)
    setBalanceLoading(true)
    try {
      const res = await adminApi.userPoints.userBalance(numId)
      setBalanceResult(res.data)
    } catch (err: any) {
      setBalanceError(err.response?.data?.error || 'Erro ao obter saldo.')
      setBalanceResult(null)
    } finally {
      setBalanceLoading(false)
    }
  }

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdjustSuccess(null)
    setAdjustError(null)
    const id = adjustUserId.trim()
    if (!id) {
      setAdjustError('Indique o ID do utilizador.')
      return
    }
    const numId = parseInt(id, 10)
    if (Number.isNaN(numId)) {
      setAdjustError('ID do utilizador inválido.')
      return
    }
    const pointsNum = parseFloat(adjustPoints.replace(',', '.'))
    if (Number.isNaN(pointsNum)) {
      setAdjustError('Indique um valor de pontos válido.')
      return
    }
    setAdjustLoading(true)
    try {
      await adminApi.userPoints.adjustBalance({
        user_id: numId,
        points: pointsNum,
        description: adjustDescription.trim() || undefined,
      })
      setAdjustSuccess('Saldo ajustado com sucesso.')
      setAdjustPoints('')
      setAdjustDescription('')
      fetchTransactions()
      if (balanceUserId === id) {
        setBalanceResult(null)
        handleGetBalance()
      }
    } catch (err: any) {
      setAdjustError(err.response?.data?.error || 'Erro ao ajustar saldo.')
    } finally {
      setAdjustLoading(false)
    }
  }

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString('pt-PT', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    } catch {
      return s
    }
  }

  const transactionTypeLabel = (type: string) => {
    const t = TRANSACTION_TYPES.find((x) => x.value === type)
    return t?.label || type
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user?.is_admin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 min-w-0">
      <div
        className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Pontos de Utilizadores</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Consultar transações, saldos e ajustar pontos manualmente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Consultar saldo */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/80">
              <h2 className="text-base font-semibold text-gray-900">Consultar saldo</h2>
              <p className="text-xs text-gray-500 mt-0.5">Saldo atual por utilizador</p>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">ID do utilizador</label>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={balanceUserId}
                  onChange={(e) => {
                    setBalanceUserId(e.target.value)
                    setBalanceError(null)
                    setBalanceResult(null)
                  }}
                  className="flex-1 min-w-[120px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Selecionar...</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.email} ({u.id})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleGetBalance}
                  disabled={balanceLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60"
                >
                  {balanceLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Ver saldo'
                  )}
                </button>
              </div>
              {balanceError && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {balanceError}
                </p>
              )}
              {balanceResult && (
                <div className="mt-4 p-4 rounded-lg bg-primary-50 border border-primary-100">
                  <p className="text-xs font-medium text-primary-800 mb-1">{balanceResult.user_email}</p>
                  <p className="text-2xl font-bold text-primary-900">{Number(balanceResult.balance).toFixed(2)} pts</p>
                  <p className="text-sm text-primary-700 mt-1">
                    ≈ {Number(balanceResult.balance_kz).toLocaleString('pt-PT')} KZ
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ajustar saldo */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/80">
              <h2 className="text-base font-semibold text-gray-900">Ajustar saldo</h2>
              <p className="text-xs text-gray-500 mt-0.5">Adicionar ou remover pontos (valor negativo para deduzir)</p>
            </div>
            <form onSubmit={handleAdjustBalance} className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="adjust-user" className="block text-sm font-medium text-gray-700 mb-1">
                    Utilizador
                  </label>
                  <select
                    id="adjust-user"
                    value={adjustUserId}
                    onChange={(e) => {
                      setAdjustUserId(e.target.value)
                      setAdjustError(null)
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Selecionar...</option>
                    {users.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.email} (ID {u.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="adjust-points" className="block text-sm font-medium text-gray-700 mb-1">
                    Pontos (positivo ou negativo)
                  </label>
                  <input
                    id="adjust-points"
                    type="text"
                    inputMode="decimal"
                    value={adjustPoints}
                    onChange={(e) => {
                      setAdjustPoints(e.target.value)
                      setAdjustError(null)
                    }}
                    placeholder="ex: 5 ou -2"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="adjust-desc" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <input
                  id="adjust-desc"
                  type="text"
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  placeholder="ex: Bónus campanha"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              {adjustSuccess && (
                <p className="mb-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg" role="status">
                  {adjustSuccess}
                </p>
              )}
              {adjustError && (
                <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg" role="alert">
                  {adjustError}
                </p>
              )}
              <button
                type="submit"
                disabled={adjustLoading}
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60"
              >
                {adjustLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Aplicar ajuste'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Filtros e tabela */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-end gap-4">
            <h2 className="text-base font-semibold text-gray-900 w-full sm:w-auto">Histórico de transações</h2>
            <div className="flex flex-wrap gap-3 flex-1">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Utilizador</label>
                <select
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm min-w-[160px] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Todos</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Tipo</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm min-w-[140px] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {TRANSACTION_TYPES.map((t) => (
                    <option key={t.value || 'all'} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => fetchTransactions()}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Atualizar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-5 py-12 text-center text-gray-500 text-sm">
              Nenhuma transação encontrada com os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Utilizador
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Pontos
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Saldo após
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Descrição
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium text-gray-900">{tx.user_email}</span>
                        <span className="text-gray-400 ml-1">#{tx.user_id}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {transactionTypeLabel(tx.transaction_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                        <span className={Number(tx.points) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {Number(tx.points) >= 0 ? '+' : ''}{Number(tx.points).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                        {Number(tx.balance_after).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={tx.description || tx.course_title || ''}>
                        {tx.description || tx.course_title || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
