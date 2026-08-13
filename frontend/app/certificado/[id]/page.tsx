'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { coursesApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface CertificateInfo {
  eligible: boolean
  course_id: number
  course_title: string
  user_name: string
  completed_at: string | null
  message: string | null
}

export default function CertificadoPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const enrollmentId = Number(params.id)
  const [info, setInfo] = useState<CertificateInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    const fetchInfo = async () => {
      try {
        const res = await coursesApi.getCertificateInfo(enrollmentId)
        setInfo(res.data)
      } catch {
        setInfo(null)
      } finally {
        setLoading(false)
      }
    }
    fetchInfo()
  }, [enrollmentId, user, router])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block w-12 h-12 zenda-spinner zenda-spinner-lg mb-4" />
          <p className="text-gray-600">A carregar...</p>
        </div>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-gray-600 mb-4">Não foi possível carregar o certificado.</p>
          <Link href="/area-do-aluno" className="text-zenda-primary hover:text-zenda-dark font-medium">
            Voltar à Área do Aluno
          </Link>
        </div>
      </div>
    )
  }

  if (!info.eligible) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Certificado ainda não disponível</h1>
          <p className="text-gray-600 mb-6">{info.message || 'Conclua todas as aulas e quizzes com aprovação para obter o certificado.'}</p>
          <Link
            href="/area-do-aluno"
            className="inline-block w-full py-3 px-4 bg-zenda-primary text-white rounded-xl font-semibold hover:bg-zenda-dark transition"
          >
            Voltar à Área do Aluno
          </Link>
        </div>
      </div>
    )
  }

  const completedDate = info.completed_at ? new Date(info.completed_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-10 px-4 print:py-0 print:px-0 print:bg-white">
      <div className="max-w-2xl mx-auto">
        {/* Non-print header */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none py-3 px-6 bg-zenda-primary text-white rounded-xl font-semibold hover:bg-zenda-dark transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5M9 17H3m10 0v-2a2 2 0 00-2-2H9M9 17v-4a2 2 0 012-2h2" />
            </svg>
            Imprimir / Guardar PDF
          </button>
          <Link
            href="/area-do-aluno"
            className="flex-1 sm:flex-none py-3 px-6 border-2 border-primary-600 text-zenda-primary rounded-xl font-semibold hover:bg-primary-50 transition text-center"
          >
            Voltar à Área do Aluno
          </Link>
        </div>

        {/* Certificate */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-primary-200 overflow-hidden print:rounded-none print:shadow-none print:border-0">
          <div className="p-8 sm:p-12 print:p-12">
            <div className="text-center border-b-2 border-primary-200 pb-8 mb-8">
              <p className="text-sm uppercase tracking-widest text-zenda-primary font-semibold mb-2">Certificado de Conclusão</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Rubiane Joaquim</h1>
              <p className="text-gray-600">Educação Financeira</p>
            </div>
            <p className="text-center text-gray-600 mb-4">Certificamos que</p>
            <p className="text-center text-2xl sm:text-3xl font-bold text-gray-900 mb-6">{info.user_name}</p>
            <p className="text-center text-gray-600 mb-2">concluiu com sucesso o curso</p>
            <p className="text-center text-xl sm:text-2xl font-semibold text-zenda-dark mb-8">{info.course_title}</p>
            {completedDate && (
              <p className="text-center text-sm text-gray-500">Concluído em {completedDate}</p>
            )}
            <div className="mt-10 pt-8 border-t border-gray-200 flex justify-center gap-12 print:mt-12">
              <div className="text-center">
                <div className="w-24 h-0.5 bg-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Rubiane Patricia Fernando Joaquim</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
