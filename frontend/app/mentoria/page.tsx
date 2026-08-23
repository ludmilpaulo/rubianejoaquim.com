'use client'

import { useEffect, useState } from 'react'
import { mentorshipApi, subscriptionApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils/currency'
import { getApiErrorMessage } from '@/lib/types/api'
import { useRouter } from 'next/navigation'
import BankPayeeDetails from '@/components/education/BankPayeeDetails'

interface MentorshipPackage {
  id: number
  title: string
  description: string
  duration_minutes: number
  sessions: number
  price: string
}

interface CommerceCheckout {
  methods: string[]
  ikhokha_enabled: boolean
  charge: { amount: string; currency: string }
  estimate: { amount: string; currency: string; is_estimate: boolean } | null
}

export default function MentoriaPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [packages, setPackages] = useState<MentorshipPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null)
  const [checkout, setCheckout] = useState<CommerceCheckout | null>(null)
  const [formData, setFormData] = useState({
    objective: '',
    availability: '',
    contact: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await mentorshipApi.packages()
        setPackages(response.data.results || response.data)
      } catch (error) {
        console.error('Erro ao carregar pacotes:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPackages()
  }, [])

  useEffect(() => {
    if (!user || !selectedPackage) {
      setCheckout(null)
      return
    }
    subscriptionApi
      .commerceCheckoutOptions('mentorship', selectedPackage, 'web')
      .then((res) => setCheckout(res.data as CommerceCheckout))
      .catch(() => setCheckout(null))
  }, [user, selectedPackage])

  const useCard = Boolean(checkout?.methods?.includes('card'))
  const useProof = Boolean(checkout?.methods?.includes('proof_of_payment'))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }
    if (!selectedPackage) return

    setSubmitting(true)
    try {
      if (useCard) {
        const res = await subscriptionApi.commerceCreateSession({
          product_type: 'mentorship',
          product_id: selectedPackage,
          ...formData,
        })
        const url = (res.data as { paylink_url?: string }).paylink_url
        if (!url) throw new Error('Could not start card payment.')
        window.location.href = url
        return
      }
      await mentorshipApi.createRequest({
        package_id: selectedPackage,
        ...formData,
      })
      alert('Pedido enviado com sucesso! Entraremos em contacto em breve.')
      setShowForm(false)
      setFormData({ objective: '', availability: '', contact: '' })
      router.push('/area-do-aluno')
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, 'Erro ao enviar pedido'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block w-12 h-12 zenda-spinner zenda-spinner-lg"></div>
      </div>
    )
  }

  const selected = packages.find((p) => p.id === selectedPackage)
  const chargeLabel = checkout?.charge
    ? `${checkout.charge.currency} ${Number(checkout.charge.amount).toFixed(2)}`
    : formatCurrency(selected?.price || '0')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Mentoria Personalizada</h1>
      <p className="text-lg text-gray-600 mb-12">
        Acompanhamento individual para alcançar os seus objetivos financeiros específicos.
      </p>

      {showForm ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">Pedir Vaga</h2>

            {selectedPackage && (
              <div className="bg-zenda-container border border-zenda-border rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Informações de Pagamento</h3>
                {useProof ? (
                  <div className="space-y-2 text-sm">
                    <BankPayeeDetails />
                    <div>
                      <span className="font-medium text-gray-700">Valor:</span>
                      <p className="text-gray-900 font-semibold mt-1">{chargeLabel}</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Após a transferência, faça o upload do comprovativo na sua área do aluno.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      Valor: <strong>{chargeLabel}</strong>
                      {checkout?.estimate
                        ? ` · ≈ ${checkout.estimate.currency} ${Number(checkout.estimate.amount).toFixed(2)}`
                        : ''}
                    </p>
                    <p>International checkout is charged in ZAR via iKhokha.</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objetivo da Mentoria
                </label>
                <textarea
                  required
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
                  rows={4}
                  placeholder="Descreva o que pretende alcançar com a mentoria..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Disponibilidade</label>
                <textarea
                  required
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
                  rows={3}
                  placeholder="Ex: Segundas e quartas, 18h-20h..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contacto (WhatsApp, Email, etc.)
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
                  placeholder="+351 912 345 678"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || (useCard && checkout?.ikhokha_enabled === false)}
                  className="flex-1 bg-zenda-primary text-white py-2 rounded-lg hover:bg-zenda-dark disabled:opacity-50"
                >
                  {submitting
                    ? useCard
                      ? 'A abrir pagamento…'
                      : 'A enviar...'
                    : useCard
                      ? 'Pagar com cartão (iKhokha)'
                      : 'Enviar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{pkg.title}</h3>
                <p className="text-gray-600 mb-4">{pkg.description}</p>
                <div className="mb-4 space-y-2 text-sm text-gray-600">
                  <div>Duração: {pkg.duration_minutes} minutos</div>
                  <div>Sessões: {pkg.sessions}</div>
                </div>
                <div className="text-2xl font-bold text-zenda-primary mb-4">
                  {formatCurrency(pkg.price)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      router.push('/login')
                      return
                    }
                    setSelectedPackage(pkg.id)
                    setShowForm(true)
                  }}
                  className="w-full bg-zenda-primary text-white py-2 rounded-lg hover:bg-zenda-dark transition"
                >
                  Pedir Vaga
                </button>
              </div>
            ))}
          </div>

          {packages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum pacote disponível no momento.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
