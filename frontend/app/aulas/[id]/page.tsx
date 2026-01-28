'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { lessonsApi, coursesApi, lessonQuizzesApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils/currency'

interface Lesson {
  id: number
  course: number | {
    id: number
    title: string
    slug: string
    price: string
  }
  title: string
  description: string
  video_url: string
  duration: number
  content: string
  is_free: boolean
  attachments: Array<{
    id: number
    title: string
    file: string
  }>
  progress: {
    completed: boolean
    completed_at: string | null
  } | null
}

interface Course {
  id: number
  title: string
  slug: string
  price: string
  enrollment_status?: {
    status: 'pending' | 'active' | 'cancelled'
  } | null
}

// Função para converter URLs do YouTube para formato embed
function getYouTubeEmbedUrl(url: string): string {
  if (!url) return ''
  
  // Se já é um URL de embed, retorna como está
  if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
    return url
  }
  
  // Extrair ID do vídeo de diferentes formatos do YouTube
  let videoId = ''
  
  // Formato: https://www.youtube.com/watch?v=VIDEO_ID ou https://youtu.be/VIDEO_ID
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      videoId = match[1]
      break
    }
  }
  
  // Se não encontrou o ID, retorna a URL original (pode ser outro tipo de vídeo)
  if (!videoId) {
    return url
  }
  
  // Retornar URL de embed com parâmetros de privacidade
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
}

export default function AulaPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [showPurchasePopup, setShowPurchasePopup] = useState(false)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [quiz, setQuiz] = useState<any>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizResult, setQuizResult] = useState<any>(null)
  const [submittingQuiz, setSubmittingQuiz] = useState(false)
  const [loadingQuiz, setLoadingQuiz] = useState(false)
  const [showNextLessonNotification, setShowNextLessonNotification] = useState(false)
  const [nextLessonId, setNextLessonId] = useState<number | null>(null)
  const [previousQuizResult, setPreviousQuizResult] = useState<any>(null)
  const [showRetakeConfirmation, setShowRetakeConfirmation] = useState(false)

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await lessonsApi.get(Number(params.id))
        const lessonData = response.data
        setLesson(lessonData)
        
        // Buscar informações do curso
        if (lessonData.course) {
          const courseId = typeof lessonData.course === 'object' ? lessonData.course.id : lessonData.course
          
          // Se já temos informações do curso no lessonData, usar elas
          if (typeof lessonData.course === 'object' && lessonData.course.title) {
            setCourse({
              id: lessonData.course.id,
              title: lessonData.course.title,
              slug: lessonData.course.slug,
              price: lessonData.course.price,
            })
            
            // Verificar enrollment status
            if (user) {
              try {
                const enrollmentsRes = await coursesApi.myEnrollments()
                const enrollments = enrollmentsRes.data.results || enrollmentsRes.data || []
                const hasActiveEnrollment = Array.isArray(enrollments) && 
                  enrollments.some((e: any) => {
                    const eCourseId = typeof e.course === 'object' ? e.course.id : e.course
                    return eCourseId === courseId && e.status === 'active'
                  })
                
                // Mostrar popup se: aula é gratuita, usuário está logado, mas não tem acesso ativo ao curso
                if (lessonData.is_free && !hasActiveEnrollment) {
                  setShowPurchasePopup(true)
                }
              } catch (error) {
                // Se não conseguir verificar enrollments, ainda pode mostrar popup se usuário estiver logado
                if (lessonData.is_free) {
                  setShowPurchasePopup(true)
                }
              }
            }
          } else {
            // Buscar informações completas do curso
            try {
              const courseResponse = await coursesApi.get(courseId)
              setCourse(courseResponse.data)
              
              // Verificar se deve mostrar popup
              if (lessonData.is_free && user && courseResponse.data.enrollment_status?.status !== 'active') {
                setShowPurchasePopup(true)
              }
            } catch (error) {
              console.error('Erro ao carregar curso:', error)
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar aula:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLesson()
  }, [params.id, user])

  const handleEnroll = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!course) return

    setEnrolling(true)
    try {
      await coursesApi.enroll(course.id)
      setShowPurchasePopup(false)
      router.push('/area-do-aluno')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao inscrever-se')
    } finally {
      setEnrolling(false)
    }
  }

  const handleMarkCompleted = async () => {
    if (!user || !lesson) return
    
    // Primeiro, verificar se há um quiz para esta aula
    setLoadingQuiz(true)
    try {
      console.log('Buscando quiz para a aula:', lesson.id)
      const quizResponse = await lessonQuizzesApi.getByLesson(lesson.id)
      console.log('Resposta completa do quiz:', quizResponse)
      console.log('Dados do quiz:', quizResponse.data)
      
      // O endpoint pode retornar:
      // 1. Um objeto quiz diretamente: { id, title, questions, ... }
      // 2. Um objeto com quiz: { quiz: null } ou { quiz: {...} }
      // 3. Um array: [{...}]
      // 4. Um objeto com results: { results: [{...}] }
      
      let quizData = null
      
      if (quizResponse.data) {
        // Se retornar { quiz: null } ou { quiz: {...} }
        if (quizResponse.data.quiz !== undefined) {
          quizData = quizResponse.data.quiz
          // Se quiz for null, verificar informações de debug
          if (!quizData && quizResponse.data.debug) {
            console.warn('⚠️ Quiz não encontrado:', quizResponse.data.debug)
            console.warn('📋 Debug info:', JSON.stringify(quizResponse.data.debug, null, 2))
            // Não mostrar alert, apenas logar para debug
          }
        }
        // Se retornar um array
        else if (Array.isArray(quizResponse.data)) {
          quizData = quizResponse.data.length > 0 ? quizResponse.data[0] : null
        }
        // Se retornar { results: [...] }
        else if (quizResponse.data.results && Array.isArray(quizResponse.data.results)) {
          quizData = quizResponse.data.results.length > 0 ? quizResponse.data.results[0] : null
        }
        // Se retornar o quiz diretamente como objeto (caso normal quando encontrado)
        else if (quizResponse.data.id && quizResponse.data.lesson) {
          quizData = quizResponse.data
        }
        // Se houver informações de debug mas não quiz
        else if (quizResponse.data.debug) {
          console.warn('⚠️ Quiz não encontrado:', quizResponse.data.debug)
          console.warn('📋 Debug info:', JSON.stringify(quizResponse.data.debug, null, 2))
        }
      }
      
      console.log('Quiz data processado:', quizData)
      
      if (quizData && quizData.id) {
        console.log('✅ Quiz encontrado! Abrindo modal...')
        console.log('📊 Quiz completo:', JSON.stringify(quizData, null, 2))
        console.log('❓ Questions do quiz:', quizData.questions)
        console.log('📝 Número de questions:', quizData.questions?.length || 0)
        
        // Verificar estrutura das questions
        if (quizData.questions && quizData.questions.length > 0) {
          console.log('🔍 Primeira question:', JSON.stringify(quizData.questions[0], null, 2))
          if (quizData.questions[0].question) {
            console.log('✅ Question aninhada encontrada:', quizData.questions[0].question)
            console.log('📋 Choices da primeira question:', quizData.questions[0].question.choices)
          }
        }
        
        // Guardar o quiz para usar depois
        setQuiz(quizData)
        
        // Há um quiz - verificar se há resultado anterior
        if (quizData.previous_result) {
          console.log('📊 Resultado anterior encontrado:', quizData.previous_result)
          setPreviousQuizResult(quizData.previous_result)
          // Não abrir o quiz modal ainda, mostrar confirmação primeiro
          setShowRetakeConfirmation(true)
          setLoadingQuiz(false)
          return
        }
        
        // Há um quiz sem resultado anterior - mostrar o quiz diretamente
        setShowQuizModal(true)
        setLoadingQuiz(false)
        return
      } else {
        console.log('❌ Nenhum quiz encontrado para esta aula')
        console.log('📦 Quiz data recebido:', quizData)
        console.log('📋 Resposta completa:', JSON.stringify(quizResponse.data, null, 2))
        
        // Se houver informações de debug, mostrar
        if (quizResponse.data?.debug) {
          console.warn('🔍 Informações de debug:', quizResponse.data.debug)
          const debug = quizResponse.data.debug
          if (debug.has_inactive_quiz) {
            console.warn(`⚠️ Existe um quiz INATIVO (ID: ${debug.inactive_quiz_id}) para esta aula. Ative-o no admin para que apareça.`)
          }
        }
      }
    } catch (error: any) {
      // Se não houver quiz ou erro ao buscar, continuar normalmente
      console.error('Erro ao buscar quiz:', error)
      console.error('Detalhes do erro:', error.response?.data || error.message)
      // Se for erro 404 ou quiz não encontrado, continuar normalmente
      if (error.response?.status === 404 || error.response?.data?.quiz === null) {
        console.log('Quiz não existe para esta aula, continuando...')
      } else {
        // Outros erros podem ser problemas de acesso ou servidor
        console.error('Erro ao verificar quiz:', error)
      }
    } finally {
      setLoadingQuiz(false)
    }
    
    // Se não houver quiz, marcar como concluída diretamente
    await markLessonAsCompleted()
  }

  const markLessonAsCompleted = async () => {
    if (!user || !lesson) {
      console.error('❌ markLessonAsCompleted: user ou lesson não definido')
      return
    }
    
    console.log('✅ Marcando aula como concluída:', lesson.id)
    setMarking(true)
    
    try {
      await lessonsApi.markCompleted(lesson.id)
      if (lesson) {
        setLesson({
          ...lesson,
          progress: { completed: true, completed_at: new Date().toISOString() },
        })
        
        // Buscar a próxima aula do curso
        const courseId = typeof lesson.course === 'object' ? lesson.course.id : lesson.course
        console.log('📚 Course ID:', courseId)
        
        if (courseId) {
          try {
            const lessonsResponse = await lessonsApi.list(courseId)
            const allLessons = lessonsResponse.data.results || lessonsResponse.data || []
            console.log('📖 Todas as aulas do curso:', allLessons.length)
            
            // Ordenar por order para garantir ordem correta
            const sortedLessons = [...allLessons].sort((a: any, b: any) => {
              if (a.order !== b.order) return a.order - b.order
              return a.id - b.id
            })
            
            // Encontrar a aula atual e a próxima
            const currentLessonIndex = sortedLessons.findIndex((l: any) => l.id === lesson.id)
            console.log('📍 Índice da aula atual:', currentLessonIndex)
            
            const nextLesson = sortedLessons[currentLessonIndex + 1]
            console.log('➡️ Próxima aula:', nextLesson ? nextLesson.id : 'Nenhuma')
            
            if (nextLesson) {
              // Há próxima aula - mostrar notificação e redirecionar
              console.log('✅ Definindo próxima aula:', nextLesson.id)
              setNextLessonId(nextLesson.id)
              setShowNextLessonNotification(true)
              
              // Redirecionar após 3 segundos
              setTimeout(() => {
                console.log('🔄 Redirecionando para próxima aula:', nextLesson.id)
                router.push(`/aulas/${nextLesson.id}`)
              }, 3000)
            } else {
              // Última aula do curso - mostrar mensagem e redirecionar para o curso
              console.log('🏁 Última aula do curso')
              setNextLessonId(null) // Garantir que está null
              setShowNextLessonNotification(true)
              setTimeout(() => {
                console.log('🔄 Redirecionando para curso:', courseId)
                router.push(`/cursos/${courseId}`)
              }, 3000)
            }
          } catch (error) {
            console.error('❌ Erro ao buscar próxima aula:', error)
            // Se houver erro, não redireciona mas marca como concluída
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao marcar como concluída:', error)
      alert(error.response?.data?.error || 'Erro ao marcar como concluída')
    } finally {
      setMarking(false)
    }
  }

  const handleQuizAnswer = (questionId: number, choiceId: number) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: choiceId }))
  }

  const handleSubmitQuiz = async () => {
    if (!quiz) return

    const answersArray = Object.entries(quizAnswers).map(([questionId, choiceId]) => ({
      question_id: Number(questionId),
      choice_id: Number(choiceId),
    }))

    if (answersArray.length !== quiz.questions?.length) {
      alert('Por favor, responda a todas as perguntas do quiz.')
      return
    }

    setSubmittingQuiz(true)
    try {
      const result = await lessonQuizzesApi.submit(quiz.id, answersArray)
      setQuizResult(result.data)
      
      // Verificar se passou no quiz (score >= passing_score)
      const passed = result.data.score >= quiz.passing_score
      
      if (passed) {
        // Se passou, marcar a aula como concluída
        await markLessonAsCompleted()
        // Não mostrar alert aqui, o markLessonAsCompleted já vai redirecionar
        // Mostrar mensagem de sucesso no modal
        setShowQuizModal(false)
        setQuiz(null)
        setQuizAnswers({})
        setQuizResult(null)
      } else {
        // Se não passou, mostrar resultado mas não marcar como concluída
        alert(`Você obteve ${result.data.score}%, mas precisa de ${quiz.passing_score}% para passar. Tente novamente!`)
        // Opcional: limpar respostas para tentar novamente
        // setQuizAnswers({})
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao submeter quiz.')
    } finally {
      setSubmittingQuiz(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-gray-500">Aula não encontrada.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Purchase Popup */}
      {showPurchasePopup && course && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Gostou desta aula?
                </h3>
                <p className="text-gray-600">
                  Esta é uma aula gratuita do curso <strong>{course.title}</strong>.
                  Desbloqueie acesso completo ao curso e a todas as aulas!
                </p>
              </div>
              <button
                onClick={() => setShowPurchasePopup(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-600">Preço do Curso</p>
                  <p className="text-2xl font-bold text-primary-600">{formatCurrency(course.price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Acesso Completo</p>
                  <p className="text-sm font-semibold text-gray-900">Todas as Aulas</p>
                </div>
              </div>
              <div className="pt-3 border-t border-primary-200">
                <p className="text-xs text-gray-600">
                  💳 Pagamento por transferência bancária. Verá as informações completas na página do curso.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/cursos/${course.id}`}
                className="flex-1 px-4 py-3 border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition text-center"
                onClick={() => setShowPurchasePopup(false)}
              >
                Ver Curso
              </Link>
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50"
              >
                {enrolling ? 'A processar...' : 'Comprar Agora'}
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-4xl font-bold text-gray-900 mb-4">{lesson.title}</h1>
      {lesson.description && (
        <p className="text-lg text-gray-600 mb-8">{lesson.description}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Video Player */}
          {lesson.video_url && (
            <div className="bg-black rounded-lg overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={getYouTubeEmbedUrl(lesson.video_url)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={lesson.title}
              />
            </div>
          )}

          {/* Content */}
          {lesson.content && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">Conteúdo da Aula</h2>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content }} />
            </div>
          )}

          {/* Attachments */}
          {lesson.attachments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Anexos</h2>
              <div className="space-y-2">
                {lesson.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>{attachment.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-20">
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Duração</div>
              <div className="font-semibold">{lesson.duration} minutos</div>
            </div>

            {user && (
              <div className="mb-4">
                {lesson.progress?.completed ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ Aula concluída
                    </p>
                    {lesson.progress.completed_at && (
                      <p className="text-xs text-green-600 mt-1">
                        {new Date(lesson.progress.completed_at).toLocaleDateString('pt-PT')}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleMarkCompleted}
                    disabled={marking || loadingQuiz}
                    className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    {loadingQuiz ? 'A verificar quiz...' : marking ? 'A processar...' : 'Marcar como Concluída'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Retake Quiz Confirmation Modal */}
      {showRetakeConfirmation && previousQuizResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-slide-up relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full -mr-20 -mt-20 opacity-20"></div>
            <div className="relative z-10">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Você já completou este quiz!
                </h3>
                <p className="text-gray-600">
                  Veja seu resultado anterior abaixo. Você pode refazer o quiz para tentar melhorar sua pontuação.
                </p>
              </div>

              {/* Previous Result Card */}
              <div className={`mb-6 rounded-2xl p-6 border-2 ${
                previousQuizResult.passed 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                  : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      previousQuizResult.passed 
                        ? 'bg-green-500 text-white' 
                        : 'bg-amber-500 text-white'
                    }`}>
                      {previousQuizResult.passed ? (
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Resultado Anterior</p>
                      <p className={`text-2xl font-bold ${
                        previousQuizResult.passed ? 'text-green-700' : 'text-amber-700'
                      }`}>
                        {previousQuizResult.score.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    previousQuizResult.passed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {previousQuizResult.passed ? 'Aprovado' : 'Reprovado'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Respostas Corretas</p>
                    <p className="text-lg font-bold text-gray-900">
                      {previousQuizResult.correct_answers} / {previousQuizResult.total_questions}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Data de Conclusão</p>
                    <p className="text-sm font-medium text-gray-900">
                      {previousQuizResult.completed_at 
                        ? new Date(previousQuizResult.completed_at).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRetakeConfirmation(false)
                    setPreviousQuizResult(null)
                    setQuiz(null)
                    setShowQuizModal(false)
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowRetakeConfirmation(false)
                    // Manter o quiz e abrir o modal do quiz
                    setShowQuizModal(true)
                    setPreviousQuizResult(null)
                    setQuizAnswers({})
                    setQuizResult(null)
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-purple-700 transition shadow-lg hover:shadow-xl"
                >
                  Refazer Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal - Professional and Attractive Design */}
      {showQuizModal && quiz && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-slide-up">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-purple-600 px-8 py-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC00LjQxOC0zLjU4Mi04LTgtOHMtOCAzLjU4Mi04IDggMy41ODIgOCA4IDggOC0zLjU4MiA4LTh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-1">Quiz da Aula</h3>
                      <p className="text-primary-100 text-sm">{lesson.title}</p>
                    </div>
                  </div>
                  {quiz.description && (
                    <p className="text-white/90 text-sm mt-2">{quiz.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{quiz.questions?.length || 0} Perguntas</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Nota mínima: {quiz.passing_score}%</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja cancelar? Você precisará completar o quiz para marcar a aula como concluída.')) {
                      setShowQuizModal(false)
                      setQuiz(null)
                      setQuizAnswers({})
                      setQuizResult(null)
                    }
                  }}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quiz Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 bg-gradient-to-b from-gray-50 to-white">
              {quizResult ? (
                /* Result Screen */
                <div className="space-y-6">
                  <div className={`relative overflow-hidden rounded-2xl p-8 ${
                    quizResult.score >= quiz.passing_score 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200' 
                      : 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200'
                  }`}>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/30 rounded-full -mr-20 -mt-20"></div>
                    <div className="relative z-10 text-center">
                      <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                        quizResult.score >= quiz.passing_score 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {quizResult.score >= quiz.passing_score ? (
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <h4 className={`text-3xl font-bold mb-2 ${
                        quizResult.score >= quiz.passing_score ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {quizResult.score >= quiz.passing_score ? 'Parabéns! Você Passou!' : 'Você Não Atingiu a Nota Mínima'}
                      </h4>
                      <div className={`text-5xl font-extrabold mb-4 ${
                        quizResult.score >= quiz.passing_score ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {quizResult.score}%
                      </div>
                      <p className="text-lg text-gray-700 mb-2">
                        Você acertou <strong>{quizResult.correct_answers}</strong> de <strong>{quizResult.total_questions}</strong> perguntas
                      </p>
                      <p className="text-sm text-gray-600">
                        Nota mínima necessária: <strong>{quiz.passing_score}%</strong>
                      </p>
                    </div>
                  </div>

                  {quizResult.score < quiz.passing_score && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-blue-900 mb-1">Não desista!</h5>
                          <p className="text-sm text-blue-800">
                            Você pode tentar novamente. Revise o conteúdo da aula e tente fazer o quiz mais uma vez.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    {quizResult.score < quiz.passing_score ? (
                      <button
                        onClick={() => {
                          setQuizResult(null)
                          setQuizAnswers({})
                        }}
                        className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Tentar Novamente
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowQuizModal(false)
                          setQuiz(null)
                          setQuizAnswers({})
                          setQuizResult(null)
                        }}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Continuar
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Questions Screen */
                <>
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Progresso: {Object.keys(quizAnswers).length} de {quiz.questions?.length || 0} respondidas
                      </span>
                      <span className="text-sm font-semibold text-primary-600">
                        {Math.round((Object.keys(quizAnswers).length / (quiz.questions?.length || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-primary-600 to-purple-600 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${(Object.keys(quizAnswers).length / (quiz.questions?.length || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="space-y-6">
                    {quiz.questions && quiz.questions.length > 0 ? (
                      quiz.questions.map((qq: any, qIndex: number) => {
                        // A estrutura esperada é: qq.question.id, qq.question.question_text, qq.question.choices
                        // Mas pode ser que venha diretamente como qq se não houver aninhamento
                        const question = qq.question || qq
                        const questionId = question.id || qq.id || qIndex
                        const isAnswered = quizAnswers[questionId] !== undefined
                        
                        // Debug: logar estrutura completa apenas na primeira vez
                        if (qIndex === 0) {
                          console.log('🔍 Primeira question renderizada:', {
                            qq,
                            question,
                            questionId,
                            hasChoices: !!question.choices,
                            choicesCount: question.choices?.length || 0
                          })
                        }
                        
                        // Verificar se há choices
                        const choices = question.choices || []
                        
                        return (
                          <div 
                            key={questionId} 
                            className={`bg-white rounded-xl border-2 p-6 transition-all ${
                              isAnswered 
                                ? 'border-primary-300 shadow-md' 
                                : 'border-gray-200 shadow-sm'
                            }`}
                          >
                            <div className="flex items-start gap-4 mb-4">
                              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                                isAnswered 
                                  ? 'bg-primary-100 text-primary-700' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {qIndex + 1}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-gray-900 mb-1">
                                  {question.question_text || qq.question_text || 'Pergunta sem texto'}
                                </h4>
                                {isAnswered && (
                                  <span className="inline-flex items-center gap-1 text-xs text-primary-600 font-medium mt-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Respondida
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-2 ml-14">
                              {question.choices && question.choices.length > 0 ? (
                                question.choices.map((choice: any) => {
                                  const isSelected = quizAnswers[questionId] === choice.id
                                  return (
                                    <label
                                      key={choice.id}
                                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                        isSelected
                                          ? 'bg-primary-50 border-primary-400 shadow-md'
                                          : 'bg-gray-50 border-gray-200 hover:border-primary-300 hover:bg-primary-50/50'
                                      }`}
                                    >
                                      <div className="relative flex items-center">
                                        <input
                                          type="radio"
                                          name={`question-${questionId}`}
                                          value={choice.id}
                                          checked={isSelected}
                                          onChange={() => handleQuizAnswer(questionId, choice.id)}
                                          className="sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                                          isSelected
                                            ? 'border-primary-600 bg-primary-600'
                                            : 'border-gray-400'
                                        }`}>
                                          {isSelected && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                                          )}
                                        </div>
                                      </div>
                                      <span className={`text-gray-800 flex-1 ${
                                        isSelected ? 'font-medium' : ''
                                      }`}>
                                        {choice.choice_text}
                                      </span>
                                    </label>
                                  )
                                })
                              ) : (
                                <div className="text-sm text-gray-500 italic p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  ⚠️ Nenhuma opção disponível para esta pergunta. Por favor, entre em contato com o suporte.
                                  <div className="mt-2 text-xs">
                                    Debug: questionId={questionId}, hasChoices={!!question.choices}, choicesLength={question.choices?.length || 0}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-600 font-medium mb-2">Nenhuma pergunta encontrada</p>
                        <p className="text-sm text-gray-500">Este quiz ainda não tem perguntas configuradas.</p>
                        <button
                          onClick={() => {
                            console.log('Quiz data:', quiz)
                            console.log('Questions:', quiz.questions)
                          }}
                          className="mt-4 text-xs text-primary-600 hover:text-primary-700"
                        >
                          (Debug: Ver dados no console)
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer with Submit Button */}
            {!quizResult && (
              <div className="border-t border-gray-200 bg-white px-8 py-6">
                <div className="flex justify-between items-center gap-4">
                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja cancelar? Você precisará completar o quiz para marcar a aula como concluída.')) {
                        setShowQuizModal(false)
                        setQuiz(null)
                        setQuizAnswers({})
                      }
                    }}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submittingQuiz || Object.keys(quizAnswers).length !== quiz.questions?.length}
                    className={`flex-1 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                      Object.keys(quizAnswers).length === quiz.questions?.length && !submittingQuiz
                        ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white hover:from-primary-700 hover:to-purple-700 hover:shadow-xl transform hover:scale-105'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {submittingQuiz ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submetendo...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Submeter Quiz
                      </span>
                    )}
                  </button>
                </div>
                {Object.keys(quizAnswers).length < quiz.questions?.length && (
                  <p className="text-center text-sm text-amber-600 mt-3 flex items-center justify-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Responda todas as perguntas para submeter o quiz
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next Lesson Notification */}
      {showNextLessonNotification && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-slide-up relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full -mr-16 -mt-16 opacity-20"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white mb-4 animate-bounce">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Aula Concluída com Sucesso! 🎉
              </h3>
              <p className="text-gray-600 mb-6">
                {nextLessonId 
                  ? 'Redirecionando para a próxima aula...' 
                  : 'Parabéns! Você completou todas as aulas deste curso!'}
              </p>
              {nextLessonId ? (
                <div className="flex items-center justify-center gap-2 text-primary-600">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium">Carregando próxima aula...</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const courseId = typeof lesson?.course === 'object' ? lesson.course.id : lesson?.course
                    if (courseId) {
                      router.push(`/cursos/${courseId}`)
                    }
                  }}
                  className="w-full bg-gradient-to-r from-primary-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-primary-700 hover:to-purple-700 transition shadow-lg"
                >
                  Ver Curso
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
