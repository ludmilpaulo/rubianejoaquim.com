'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { coursesApi, mentorshipApi } from '@/lib/api'
import Link from 'next/link'

interface Enrollment {
  id: number
  course: {
    id: number
    title: string
    slug: string
  }
  status: string
  enrolled_at: string
  activated_at: string | null
  payment_proof: {
    id: number
    status: string
    created_at: string
    reviewed_at: string | null
  } | null
}

interface MentorshipRequest {
  id: number
  package: {
    id: number
    title: string
  }
  objective: string
  status: string
  created_at: string
  payment_proof: {
    id: number
    status: string
    created_at: string
    reviewed_at: string | null
  } | null
}

export default function AreaDoAlunoPage() {
  const router = useRouter()
  const { user, isLoading, checkAuth } = useAuthStore()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      checkAuth()
      fetchData()
    }
  }, [user, isLoading, router, checkAuth])

  const fetchData = async () => {
    try {
      const [enrollmentsRes, mentorshipRes] = await Promise.all([
        coursesApi.myEnrollments(),
        mentorshipApi.myRequests(),
      ])
      setEnrollments(enrollmentsRes.data.results || enrollmentsRes.data)
      setMentorshipRequests(mentorshipRes.data.results || mentorshipRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentUpload = async (enrollmentId: number, file: File, notes?: string) => {
    setUploading(enrollmentId)
    try {
      await coursesApi.uploadPaymentProof(enrollmentId, file, notes)
      alert('Comprovativo enviado com sucesso! Aguarde aprovação.')
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao enviar comprovativo')
    } finally {
      setUploading(null)
    }
  }

  const handleMentorshipPaymentUpload = async (requestId: number, file: File, notes?: string) => {
    setUploading(requestId)
    try {
      await mentorshipApi.uploadPaymentProof(requestId, file, notes)
      alert('Comprovativo enviado com sucesso! Aguarde aprovação.')
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao enviar comprovativo')
    } finally {
      setUploading(null)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Área do Aluno</h1>
      <p className="text-lg text-gray-600 mb-12">
        Bem-vindo, {user.first_name || user.email}!
      </p>

      {/* Cursos */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Meus Cursos</h2>
        {enrollments.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">Ainda não está inscrito em nenhum curso.</p>
            <Link href="/cursos" className="text-primary-600 hover:text-primary-700 font-medium">
              Ver Cursos Disponíveis →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {enrollment.course.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                      <span>
                        Status: <span className={`font-medium ${
                          enrollment.status === 'active' ? 'text-green-600' :
                          enrollment.status === 'pending' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {enrollment.status === 'active' ? 'Ativo' :
                           enrollment.status === 'pending' ? 'Pendente' :
                           'Cancelado'}
                        </span>
                      </span>
                      <span>Inscrito em: {new Date(enrollment.enrolled_at).toLocaleDateString('pt-PT')}</span>
                    </div>

                    {enrollment.status === 'active' ? (
                      <Link
                        href={`/cursos/${enrollment.course.id}`}
                        className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
                      >
                        Aceder ao Curso →
                      </Link>
                    ) : enrollment.status === 'pending' && !enrollment.payment_proof ? (
                      <PaymentUploadForm
                        enrollmentId={enrollment.id}
                        onUpload={handlePaymentUpload}
                        uploading={uploading === enrollment.id}
                      />
                    ) : enrollment.status === 'pending' && enrollment.payment_proof?.status === 'pending' ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          Comprovativo enviado. Aguarde aprovação.
                        </p>
                      </div>
                    ) : enrollment.payment_proof?.status === 'rejected' ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-red-800 mb-2">
                          Comprovativo rejeitado. Por favor, envie novamente.
                        </p>
                        <PaymentUploadForm
                          enrollmentId={enrollment.id}
                          onUpload={handlePaymentUpload}
                          uploading={uploading === enrollment.id}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Mentoria */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Meus Pedidos de Mentoria</h2>
        {mentorshipRequests.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">Ainda não fez nenhum pedido de mentoria.</p>
            <Link href="/mentoria" className="text-primary-600 hover:text-primary-700 font-medium">
              Ver Pacotes de Mentoria →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {mentorshipRequests.map((request) => (
              <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {request.package.title}
                </h3>
                <p className="text-gray-600 mb-4">{request.objective}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                  <span>
                    Status: <span className={`font-medium ${
                      request.status === 'approved' || request.status === 'scheduled' ? 'text-green-600' :
                      request.status === 'pending' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {request.status === 'pending' ? 'Pendente' :
                       request.status === 'approved' ? 'Aprovado' :
                       request.status === 'scheduled' ? 'Agendado' :
                       request.status === 'completed' ? 'Concluído' :
                       'Cancelado'}
                    </span>
                  </span>
                  <span>Pedido em: {new Date(request.created_at).toLocaleDateString('pt-PT')}</span>
                </div>

                {request.status === 'pending' && !request.payment_proof && (
                  <MentorshipPaymentUploadForm
                    requestId={request.id}
                    onUpload={handleMentorshipPaymentUpload}
                    uploading={uploading === request.id}
                  />
                )}

                {request.status === 'pending' && request.payment_proof?.status === 'pending' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      Comprovativo enviado. Aguarde aprovação.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function PaymentUploadForm({ enrollmentId, onUpload, uploading }: { enrollmentId: number; onUpload: (id: number, file: File, notes?: string) => void; uploading: boolean }) {
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (file) {
      onUpload(enrollmentId, file, notes)
      setFile(null)
      setNotes('')
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-2">Instruções de Pagamento</h4>
      <p className="text-sm text-gray-600 mb-4">
        Faça a transferência para o IBAN: <strong>PT50 0000 0000 0000 0000 0000 0</strong><br />
        Valor: Consulte o valor do curso na página de detalhes.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload do Comprovativo
          </label>
          <input
            type="file"
            required
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={2}
            placeholder="Informações adicionais sobre o pagamento..."
          />
        </div>
        <button
          type="submit"
          disabled={uploading || !file}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {uploading ? 'A enviar...' : 'Enviar Comprovativo'}
        </button>
      </form>
    </div>
  )
}

function MentorshipPaymentUploadForm({ requestId, onUpload, uploading }: { requestId: number; onUpload: (id: number, file: File, notes?: string) => void; uploading: boolean }) {
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (file) {
      onUpload(requestId, file, notes)
      setFile(null)
      setNotes('')
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-2">Instruções de Pagamento</h4>
      <p className="text-sm text-gray-600 mb-4">
        Faça a transferência para o IBAN: <strong>PT50 0000 0000 0000 0000 0000 0</strong>
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload do Comprovativo
          </label>
          <input
            type="file"
            required
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
        </div>
        <button
          type="submit"
          disabled={uploading || !file}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {uploading ? 'A enviar...' : 'Enviar Comprovativo'}
        </button>
      </form>
    </div>
  )
}
