'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { coursesApi, subscriptionApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils/currency'
import { getApiErrorMessage } from '@/lib/types/api'
import BankPayeeDetails from '@/components/education/BankPayeeDetails'

interface Lesson {
  id: number
  title: string
  slug: string
  description: string
  video_url: string
  duration: number
  is_free: boolean
  order: number
}

interface Course {
  id: number
  title: string
  description: string
  price: string
  lessons: Lesson[]
  instructor?: { slug: string; display_name: string; headline: string; rating_avg: string } | null
  rating_avg?: string
  rating_count?: number
  enrollment_status: {
    status: string
    enrolled_at: string
    activated_at: string | null
  } | null
}

interface CommerceCheckout {
  method: string
  methods: string[]
  ikhokha_enabled: boolean
  charge: { amount: string; currency: string }
  estimate: { amount: string; currency: string; is_estimate: boolean } | null
}

export default function CursoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [checkout, setCheckout] = useState<CommerceCheckout | null>(null)

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await coursesApi.get(Number(params.id))
        setCourse(response.data)
      } catch (error) {
        console.error('Erro ao carregar curso:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [params.id])

  useEffect(() => {
    if (!user || !params.id) return
    subscriptionApi
      .commerceCheckoutOptions('course', Number(params.id), 'web')
      .then((res) => setCheckout(res.data as CommerceCheckout))
      .catch(() => setCheckout(null))
  }, [user, params.id])

  const useCard = Boolean(checkout?.methods?.includes('card'))
  const useProof = Boolean(checkout?.methods?.includes('proof_of_payment'))

  const handleEnroll = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    setEnrolling(true)
    try {
      if (useCard) {
        const res = await subscriptionApi.commerceCreateSession({
          product_type: 'course',
          product_id: course!.id,
        })
        const url = (res.data as { paylink_url?: string }).paylink_url
        if (!url) throw new Error('Could not start card payment.')
        window.location.href = url
        return
      }
      await coursesApi.enroll(course!.id)
      router.push('/area-do-aluno')
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, 'Erro ao inscrever-se'))
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block w-12 h-12 zenda-spinner zenda-spinner-lg"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-gray-500">Curso não encontrado.</p>
      </div>
    )
  }

  const hasAccess = course.enrollment_status?.status === 'active'
  const isPending = course.enrollment_status?.status === 'pending'
  const chargeLabel = checkout?.charge
    ? `${checkout.charge.currency} ${Number(checkout.charge.amount).toFixed(2)}`
    : formatCurrency(course.price)

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20 min-w-0"
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))',
      }}
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-gray-600 whitespace-pre-wrap">{course.description}</p>
          <div>
            <h2 className="text-xl font-semibold mb-3">Aulas ({course.lessons.length})</h2>
            <ul className="space-y-2">
              {course.lessons.map((lesson) => (
                <li key={lesson.id} className="border border-gray-200 rounded-lg px-4 py-3 text-sm">
                  {lesson.title}
                  {lesson.is_free ? <span className="ml-2 text-green-600">Grátis</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 lg:sticky lg:top-20">
          <div className="mb-4 sm:mb-6">
            <div className="text-2xl sm:text-3xl font-bold text-zenda-primary mb-1 sm:mb-2">
              {chargeLabel}
            </div>
            {checkout?.estimate ? (
              <p className="text-sm text-gray-500">
                ≈ {checkout.estimate.currency} {Number(checkout.estimate.amount).toFixed(2)} (estimate)
              </p>
            ) : null}
            <p className="text-sm sm:text-base text-gray-600">{course.lessons.length} aulas</p>
          </div>

          {isPending ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-yellow-800">
                  {useCard
                    ? 'Pagamento pendente. Se já pagou, aguarde a confirmação ou volte a tentar.'
                    : 'Inscrição pendente. Aguarde aprovação do pagamento.'}
                </p>
              </div>
              {useCard ? (
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrolling || checkout?.ikhokha_enabled === false}
                  className="w-full bg-zenda-primary text-white py-2.5 rounded-lg font-semibold disabled:opacity-50"
                >
                  {enrolling ? 'A abrir pagamento…' : 'Pagar com cartão (iKhokha)'}
                </button>
              ) : null}
              <a
                href="/area-do-aluno"
                className="block w-full border-2 border-primary-600 text-zenda-primary text-center py-2 sm:py-2.5 rounded-lg hover:bg-primary-50 transition text-sm sm:text-base font-semibold"
              >
                Ver Minha Inscrição
              </a>
            </div>
          ) : hasAccess ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-green-800">✓ Você tem acesso a este curso</p>
              </div>
              <a
                href={`/cursos/${params.id}/progresso`}
                className="block w-full bg-zenda-primary text-white text-center py-2.5 sm:py-3 rounded-lg hover:bg-zenda-dark transition text-sm sm:text-base font-semibold min-h-[44px] flex items-center justify-center"
              >
                Ver progresso e quizzes
              </a>
              <a
                href="/area-do-aluno"
                className="block w-full border-2 border-primary-600 text-zenda-primary text-center py-2 sm:py-2.5 rounded-lg hover:bg-primary-50 transition text-sm sm:text-base font-semibold"
              >
                Área do Aluno
              </a>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {useProof ? (
                <div className="bg-zenda-container border border-zenda-border rounded-lg p-3 sm:p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">
                    Informações de Pagamento
                  </h3>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <BankPayeeDetails />
                    <div>
                      <span className="font-medium text-gray-700">Valor:</span>
                      <p className="text-gray-900 font-semibold mt-1">{chargeLabel}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 sm:mt-3">
                    Após a transferência, faça o upload do comprovativo na sua área do aluno.
                  </p>
                </div>
              ) : (
                <div className="bg-zenda-container border border-zenda-border rounded-lg p-3 sm:p-4 text-sm text-gray-700">
                  International checkout is charged in <strong>ZAR</strong> via iKhokha.
                </div>
              )}
              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrolling || (useCard && checkout?.ikhokha_enabled === false)}
                className="w-full bg-zenda-primary text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-zenda-dark transition disabled:opacity-50 text-sm sm:text-base"
              >
                {enrolling
                  ? useCard
                    ? 'A abrir pagamento…'
                    : 'A processar...'
                  : useCard
                    ? 'Pagar com cartão (iKhokha)'
                    : 'Comprar Curso'}
              </button>
              {useCard && checkout && !checkout.ikhokha_enabled ? (
                <p className="text-xs text-gray-500">Card payments are not configured yet.</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
