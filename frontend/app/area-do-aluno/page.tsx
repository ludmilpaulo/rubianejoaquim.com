'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { coursesApi, mentorshipApi, authApi } from '@/lib/api'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/currency'

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
  progress?: {
    completed_lessons: number
    total_lessons: number
    percentage: number
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

interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  phone: string
  address: string
  referral_code: string
}

export default function AreaDoAlunoPage() {
  const router = useRouter()
  const { user: authUser, isLoading, checkAuth } = useAuthStore()
  const [user, setUser] = useState<User | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<number | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'courses' | 'mentorship' | 'profile'>('courses')
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const initializeData = async () => {
      // Se não está carregando e não há usuário, redirecionar
      if (!isLoading && !authUser) {
        router.push('/login')
        return
      }
      
      // Se há usuário, verificar autenticação e carregar dados
      if (authUser && !isLoading) {
        try {
          // Verificar autenticação primeiro
          await checkAuth()
          // Aguardar um pouco para o estado atualizar
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Carregar dados apenas se ainda houver usuário autenticado
          const { user: currentUser } = useAuthStore.getState()
          if (currentUser) {
            await Promise.all([
              fetchData(),
              fetchUserProfile()
            ])
          } else {
            router.push('/login')
          }
        } catch (error) {
          console.error('Erro ao inicializar:', error)
          router.push('/login')
        }
      }
    }
    initializeData()
  }, [authUser, isLoading, router, checkAuth])

  const fetchData = async () => {
    // Only fetch if user is authenticated
    if (!authUser) {
      console.log('Usuário não autenticado, pulando fetchData')
      setLoading(false)
      return
    }

    try {
      console.log('Buscando dados do aluno...')
      const [enrollmentsRes, mentorshipRes] = await Promise.all([
        coursesApi.myEnrollments(),
        mentorshipApi.myRequests(),
      ])
      console.log('Dados recebidos:', { enrollmentsRes, mentorshipRes })
      setEnrollments(enrollmentsRes.data.results || enrollmentsRes.data || [])
      setMentorshipRequests(mentorshipRes.data.results || mentorshipRes.data || [])
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      console.error('Detalhes do erro:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        }
      })
      
      // Se for erro 401, o interceptor já vai redirecionar
      if (error.response?.status === 401) {
        // Token inválido - já será redirecionado pelo interceptor
        return
      }
      
      // Network Error - backend might not be reachable
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error' || !error.response) {
        console.error('Erro de conexão: Backend não está acessível')
        // Don't redirect, just show empty state
        setEnrollments([])
        setMentorshipRequests([])
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const response = await authApi.me()
      setUser(response.data)
      setProfileForm({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        address: response.data.address || '',
      })
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await authApi.updateProfile(profileForm)
      await fetchUserProfile()
      setShowProfileModal(false)
      alert('Perfil atualizado com sucesso!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao atualizar perfil')
    } finally {
      setSavingProfile(false)
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

  const shareToSocialMedia = (platform: string, courseId: number, courseTitle: string) => {
    const url = `${window.location.origin}/cursos/${courseId}`
    const text = `Confira este curso incrível: ${courseTitle}`
    const encodedUrl = encodeURIComponent(url)
    const encodedText = encodeURIComponent(text)

    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    }

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400')
    }
  }

  const copyReferralLink = () => {
    if (user?.referral_code) {
      const referralUrl = `${window.location.origin}/cursos?ref=${user.referral_code}`
      navigator.clipboard.writeText(referralUrl)
      alert('Link de referência copiado!')
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!authUser || !user) {
    return null
  }

  const activeEnrollments = enrollments.filter(e => e.status === 'active')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 min-w-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
            paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))',
          }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 truncate">
                Olá, {user.first_name || user.email.split('@')[0]}! 👋
              </h1>
              <p className="text-primary-100 text-sm sm:text-base md:text-lg">
                Bem-vindo à sua área de aprendizado
              </p>
            </div>
            <button
              onClick={() => {
                setShowProfileModal(true)
                fetchUserProfile()
              }}
              className="touch-target w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition backdrop-blur-sm border border-white/20 flex-shrink-0"
            >
              ✏️ Editar Perfil
            </button>
          </div>
        </div>
      </div>

      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))',
        }}
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Cursos Ativos</p>
                <p className="text-3xl font-bold text-gray-900">{activeEnrollments.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Mentorias</p>
                <p className="text-3xl font-bold text-gray-900">{mentorshipRequests.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Código de Referência</p>
                <p className="text-xl font-bold text-gray-900 font-mono">{user.referral_code || 'N/A'}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 sm:mb-8 border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto scroll-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
            <nav className="flex -mb-px min-w-0 w-full sm:justify-start">
              <button
                onClick={() => setActiveTab('courses')}
                className={`flex-1 sm:flex-none touch-target px-4 sm:px-6 py-3 sm:py-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${
                  activeTab === 'courses'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📚 Meus Cursos
              </button>
              <button
                onClick={() => setActiveTab('mentorship')}
                className={`flex-1 sm:flex-none touch-target px-4 sm:px-6 py-3 sm:py-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${
                  activeTab === 'mentorship'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎯 Mentorias
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 sm:flex-none touch-target px-4 sm:px-6 py-3 sm:py-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👤 Perfil
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* Courses Tab */}
            {activeTab === 'courses' && (
              <div>
                {enrollments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum curso encontrado</h3>
                    <p className="text-gray-600 mb-6">Comece sua jornada de aprendizado hoje!</p>
                    <Link href="/cursos" className="inline-block bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition">
                      Explorar Cursos →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition">
                        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                              <div className="min-w-0">
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 break-words">
                                  {enrollment.course.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                                  <span className={`inline-flex px-3 py-1 rounded-full font-medium ${
                                    enrollment.status === 'active' ? 'bg-green-100 text-green-700' :
                                    enrollment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {enrollment.status === 'active' ? '✓ Ativo' :
                                     enrollment.status === 'pending' ? '⏳ Pendente' :
                                     '✗ Cancelado'}
                                  </span>
                                  <span className="whitespace-nowrap">Inscrito em {new Date(enrollment.enrolled_at).toLocaleDateString('pt-PT')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            {enrollment.status === 'active' && enrollment.progress && (
                              <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-medium text-gray-700">Progresso do Curso</span>
                                  <span className="text-sm font-bold text-primary-600">
                                    {enrollment.progress.percentage}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${enrollment.progress.percentage}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {enrollment.progress.completed_lessons} de {enrollment.progress.total_lessons} aulas concluídas
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mt-4">
                              {enrollment.status === 'active' ? (
                                <>
                                  <Link
                                    href={`/cursos/${enrollment.course.id}`}
                                    className="bg-primary-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition shadow-md hover:shadow-lg text-sm sm:text-base text-center"
                                  >
                                    Continuar Aprendendo →
                                  </Link>
                                  <Link
                                    href={`/cursos/${enrollment.course.id}/progresso`}
                                    className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
                                  >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Ver Progresso
                                  </Link>
                                  <div className="flex gap-2 flex-wrap">
                                    <button
                                      onClick={() => shareToSocialMedia('facebook', enrollment.course.id, enrollment.course.title)}
                                      className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center"
                                      title="Compartilhar no Facebook"
                                    >
                                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => shareToSocialMedia('twitter', enrollment.course.id, enrollment.course.title)}
                                      className="w-9 h-9 sm:w-10 sm:h-10 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition flex items-center justify-center"
                                      title="Compartilhar no Twitter/X"
                                    >
                                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => shareToSocialMedia('linkedin', enrollment.course.id, enrollment.course.title)}
                                      className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition flex items-center justify-center"
                                      title="Compartilhar no LinkedIn"
                                    >
                                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => shareToSocialMedia('whatsapp', enrollment.course.id, enrollment.course.title)}
                                      className="w-9 h-9 sm:w-10 sm:h-10 bg-green-500 text-white rounded-xl hover:bg-green-600 transition flex items-center justify-center"
                                      title="Compartilhar no WhatsApp"
                                    >
                                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => shareToSocialMedia('instagram', enrollment.course.id, enrollment.course.title)}
                                      className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-xl hover:opacity-90 transition flex items-center justify-center"
                                      title="Compartilhar no Instagram"
                                    >
                                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => shareToSocialMedia('tiktok', enrollment.course.id, enrollment.course.title)}
                                      className="w-9 h-9 sm:w-10 sm:h-10 bg-black text-white rounded-xl hover:bg-gray-800 transition flex items-center justify-center"
                                      title="Compartilhar no TikTok"
                                    >
                                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19.59 6.69a4.83 4.83 0 01-1.4-3.38V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.77 6.77 0 00-1-.05A6.75 6.75 0 005 20.1a6.75 6.75 0 0010.92-5.33v-7a8.16 8.16 0 004.67 1.45v-3.4a4.85 4.85 0 01-1-.1z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => shareToSocialMedia('pinterest', enrollment.course.id, enrollment.course.title)}
                                      className="w-9 h-9 sm:w-10 sm:h-10 bg-red-600 text-white rounded-xl hover:bg-red-700 transition flex items-center justify-center"
                                      title="Compartilhar no Pinterest"
                                    >
                                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0C5.373 0 0 5.372 0 12s5.373 12 12 12c5.084 0 9.45-3.163 11.19-7.596-.15-.004-.34-.023-.49-.05-.21-.034-.44-.06-.66-.09-.25-.04-.5-.08-.73-.13-.06-.01-.12-.02-.18-.03-.5-.08-1-.17-1.45-.28-.18-.04-.35-.09-.52-.14-.1-.03-.2-.06-.29-.09-.25-.08-.49-.17-.72-.26-.05-.02-.1-.04-.15-.06-.4-.15-.78-.31-1.15-.48-.05-.02-.1-.05-.15-.07-.35-.16-.69-.33-1.01-.51-.01-.01-.02-.01-.03-.02-.65-.37-1.24-.76-1.79-1.18-.01 0-.02-.01-.03-.02-.05-.04-.1-.08-.15-.12-.01-.01-.02-.02-.03-.03-.38-.33-.73-.68-1.05-1.05 0 0-.01-.01-.01-.02-.09-.1-.18-.21-.26-.32-.02-.02-.04-.05-.06-.07-.07-.09-.14-.19-.2-.29-.01-.02-.03-.04-.04-.06-.06-.1-.11-.2-.16-.31-.01-.02-.02-.04-.03-.06-.05-.11-.09-.22-.13-.34-.01-.02-.02-.05-.03-.07-.04-.13-.07-.26-.1-.39-.01-.05-.02-.1-.02-.15-.02-.12-.03-.24-.04-.36 0-.02 0-.05-.01-.07-.01-.13-.01-.26 0-.39 0-.01 0-.02.01-.04.02-.27.06-.53.11-.79.02-.1.04-.2.07-.3.03-.1.06-.2.1-.29.01-.03.03-.06.04-.09.08-.2.17-.39.27-.58.01-.02.02-.04.03-.06.1-.18.21-.35.33-.52.01-.01.02-.03.03-.04.24-.32.5-.62.79-.9.01-.01.02-.02.04-.03.29-.28.6-.54.93-.78.01-.01.03-.02.04-.03.33-.24.68-.46 1.05-.65.02-.01.05-.03.07-.04.37-.19.76-.36 1.16-.5.02-.01.05-.02.07-.03.4-.14.82-.26 1.25-.35.04-.01.08-.02.12-.03.43-.09.88-.15 1.33-.19.05 0 .1-.01.15-.01.5-.04 1.01-.05 1.52-.02.02 0 .05.01.07.01.51.03 1.02.09 1.52.18.05.01.1.02.15.03.5.09.99.21 1.47.36.04.01.08.03.12.05.48.15.95.33 1.4.53.05.02.1.04.15.06.45.2.88.43 1.29.68.01.01.03.02.04.03.41.25.8.52 1.17.82.01 0 .02.01.03.02.37.3.72.62 1.05.96.01.01.02.02.03.03.33.34.64.7.92 1.08 0 .01.01.02.01.03.28.38.54.78.77 1.19.02.04.04.08.06.12.23.41.44.84.62 1.28.02.05.03.1.05.15.18.44.33.9.45 1.36.01.05.03.1.04.15.12.46.22.93.29 1.4.01.06.02.12.03.18.07.47.11.95.13 1.43.01.24.02.48.02.72C24 18.628 18.627 24 12 24S0 18.628 0 12 5.373 0 12 0zm0 5.54c-3.584 0-6.46 2.876-6.46 6.46 0 3.584 2.876 6.46 6.46 6.46 3.584 0 6.46-2.876 6.46-6.46 0-3.584-2.876-6.46-6.46-6.46zm0 10.63c-2.3 0-4.17-1.87-4.17-4.17s1.87-4.17 4.17-4.17 4.17 1.87 4.17 4.17-1.87 4.17-4.17 4.17z"/>
                                      </svg>
                                    </button>
                                  </div>
                                </>
                              ) : enrollment.status === 'pending' && !enrollment.payment_proof ? (
                                <PaymentUploadForm
                                  enrollmentId={enrollment.id}
                                  onUpload={handlePaymentUpload}
                                  uploading={uploading === enrollment.id}
                                />
                              ) : enrollment.status === 'pending' && enrollment.payment_proof?.status === 'pending' ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                  <p className="text-sm text-yellow-800">
                                    ⏳ Comprovativo enviado. Aguarde aprovação.
                                  </p>
                                </div>
                              ) : enrollment.payment_proof?.status === 'rejected' ? (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                  <p className="text-sm text-red-800 mb-2">
                                    ❌ Comprovativo rejeitado. Por favor, envie novamente.
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mentorship Tab */}
            {activeTab === 'mentorship' && (
              <div>
                {mentorshipRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma mentoria solicitada</h3>
                    <p className="text-gray-600 mb-6">Descubra nossos pacotes de mentoria personalizados!</p>
                    <Link href="/mentoria" className="inline-block bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition">
                      Ver Pacotes →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {mentorshipRequests.map((request) => (
                      <div key={request.id} className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{request.package.title}</h3>
                        <p className="text-gray-600 mb-4">{request.objective}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          <span className={`px-3 py-1 rounded-full font-medium ${
                            request.status === 'approved' || request.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {request.status === 'pending' ? '⏳ Pendente' :
                             request.status === 'approved' ? '✓ Aprovado' :
                             request.status === 'scheduled' ? '📅 Agendado' :
                             request.status === 'completed' ? '✓ Concluído' :
                             '✗ Cancelado'}
                          </span>
                          <span>Pedido em {new Date(request.created_at).toLocaleDateString('pt-PT')}</span>
                        </div>

                        {request.status === 'pending' && !request.payment_proof && (
                          <MentorshipPaymentUploadForm
                            requestId={request.id}
                            onUpload={handleMentorshipPaymentUpload}
                            uploading={uploading === request.id}
                          />
                        )}

                        {request.status === 'pending' && request.payment_proof?.status === 'pending' && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                            <p className="text-sm text-yellow-800">
                              ⏳ Comprovativo enviado. Aguarde aprovação.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="max-w-2xl space-y-6">
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Informações Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Nome</p>
                      <p className="font-semibold text-gray-900">{user.first_name || 'Não definido'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sobrenome</p>
                      <p className="font-semibold text-gray-900">{user.last_name || 'Não definido'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Telefone</p>
                      <p className="font-semibold text-gray-900">{user.phone || 'Não definido'}</p>
                    </div>
                    {user.address && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600">Endereço</p>
                        <p className="font-semibold text-gray-900">{user.address}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileModal(true)
                      fetchUserProfile()
                    }}
                    className="mt-4 bg-primary-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition"
                  >
                    Editar Perfil
                  </button>
                </div>

                {/* Referral Section */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Compartilhe e Ganhe! 🎁</h3>
                  <p className="text-gray-700 mb-4">
                    Compartilhe seus cursos favoritos e ganhe benefícios quando seus amigos se inscreverem!
                  </p>
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-2">Seu código de referência:</p>
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3">
                      <code className="text-xl sm:text-2xl font-bold text-primary-600 font-mono bg-gray-50 px-4 py-2 rounded-lg break-all text-center xs:text-left">
                        {user.referral_code}
                      </code>
                      <button
                        onClick={copyReferralLink}
                        className="touch-target bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 transition font-semibold shrink-0"
                      >
                        Copiar Link
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Quando alguém usar seu código ao se registrar, você receberá benefícios especiais!
                  </p>
                </div>

                {/* Account Deletion Section */}
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-red-900 mb-2">
                        Exclusão de Conta
                      </h3>
                      <p className="text-red-800 mb-4">
                        Você pode solicitar a exclusão da sua conta e de todos os dados associados no <strong>Zenda</strong>. 
                        Esta ação é permanente e irreversível.
                      </p>
                      <Link
                        href="/delete-account"
                        className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                      >
                        Solicitar Exclusão de Conta
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
            paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))',
            paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 md:p-8 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Editar Perfil</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sobrenome *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="+244 900 000 000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <textarea
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="Rua, número, cidade, país..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-semibold disabled:opacity-50"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <h4 className="font-semibold text-gray-900 mb-2">Instruções de Pagamento</h4>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-700">IBAN:</span>
            <p className="text-gray-900 font-mono mt-1">0040 0000 4047.9796.1015.9</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Destinatário:</span>
            <p className="text-gray-900 mt-1">Rubiane Patricia Fernando Joaquim</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Valor:</span>
            <p className="text-gray-600 mt-1">Consulte o valor do curso na página de detalhes.</p>
          </div>
        </div>
      </div>
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
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <h4 className="font-semibold text-gray-900 mb-2">Instruções de Pagamento</h4>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-700">IBAN:</span>
            <p className="text-gray-900 font-mono mt-1">0040 0000 4047.9796.1015.9</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Destinatário:</span>
            <p className="text-gray-900 mt-1">Rubiane Patricia Fernando Joaquim</p>
          </div>
        </div>
      </div>
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
