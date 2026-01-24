'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { coursesApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { FaTrophy, FaRedo, FaCheckCircle, FaTimesCircle, FaChartLine, FaBookOpen } from 'react-icons/fa'
import { MdQuiz, MdScore } from 'react-icons/md'

interface QuizResult {
  lesson_id: number
  lesson_title: string
  quiz_id: number
  quiz_title: string
  score: number | null
  passed: boolean
  total_questions: number
  correct_answers: number
  passing_score: number
  completed_at: string | null
}

interface CourseProgress {
  course_id: number
  course_title: string
  quiz_results: QuizResult[]
  total_quizzes: number
  completed_quizzes: number
  average_score: number
  passing_average: number
  course_passed: boolean
  enrollment_status: string
}

export default function CourseProgressPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [retaking, setRetaking] = useState(false)
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const fetchProgress = async () => {
      try {
        // Primeiro, buscar o enrollment do curso
        const enrollmentsRes = await coursesApi.myEnrollments()
        const enrollments = enrollmentsRes.data.results || enrollmentsRes.data || []
        const enrollment = enrollments.find((e: any) => {
          const courseId = typeof e.course === 'object' ? e.course.id : e.course
          return courseId === Number(params.id)
        })

        if (!enrollment) {
          router.push('/area-do-aluno')
          return
        }

        setEnrollmentId(enrollment.id)

        // Buscar resultados dos quizzes
        const progressRes = await coursesApi.getQuizResults(enrollment.id)
        setProgress(progressRes.data)
      } catch (error) {
        console.error('Erro ao carregar progresso:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [params.id, user, router])

  const handleRetakeCourse = async () => {
    if (!enrollmentId || !confirm('Tem certeza que deseja refazer o curso? Todo o progresso e resultados de quiz serão resetados.')) {
      return
    }

    setRetaking(true)
    try {
      await coursesApi.retakeCourse(enrollmentId)
      alert('Curso resetado com sucesso! Você pode começar novamente.')
      router.push(`/cursos/${params.id}`)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao refazer curso')
    } finally {
      setRetaking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Carregando progresso...</p>
        </div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Progresso não encontrado.</p>
          <Link href="/area-do-aluno" className="text-primary-600 hover:text-primary-700 font-medium">
            Voltar para Área do Aluno
          </Link>
        </div>
      </div>
    )
  }

  const completionPercentage = progress.total_quizzes > 0 
    ? (progress.completed_quizzes / progress.total_quizzes) * 100 
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/area-do-aluno" 
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4 transition"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para Área do Aluno
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{progress.course_title}</h1>
          <p className="text-lg text-gray-600">Acompanhe seu progresso e desempenho no curso</p>
        </div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Average Score Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-100 rounded-xl">
                  <MdScore className="w-8 h-8 text-primary-600" />
                </div>
                <span className={`text-2xl font-bold ${progress.average_score >= progress.passing_average ? 'text-green-600' : 'text-red-600'}`}>
                  {progress.average_score.toFixed(1)}%
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">Média Geral</h3>
              <p className="text-xs text-gray-500">Nota mínima: {progress.passing_average}%</p>
            </div>
          </div>

          {/* Completion Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FaBookOpen className="w-8 h-8 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {progress.completed_quizzes}/{progress.total_quizzes}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">Quizzes Completos</h3>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{completionPercentage.toFixed(0)}% completo</p>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className={`rounded-2xl shadow-xl p-6 border relative overflow-hidden ${
            progress.course_passed 
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' 
              : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                  progress.course_passed ? 'bg-green-200' : 'bg-red-200'
                }`}>
                  {progress.course_passed ? (
                    <FaTrophy className={`w-8 h-8 ${progress.course_passed ? 'text-green-700' : 'text-red-700'}`} />
                  ) : (
                    <FaTimesCircle className="w-8 h-8 text-red-700" />
                  )}
                </div>
                <span className={`text-xl font-bold ${
                  progress.course_passed ? 'text-green-800' : 'text-red-800'
                }`}>
                  {progress.course_passed ? 'APROVADO' : 'REPROVADO'}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Status do Curso</h3>
              {!progress.course_passed && (
                <button
                  onClick={handleRetakeCourse}
                  disabled={retaking}
                  className="mt-3 w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FaRedo className={retaking ? 'animate-spin' : ''} />
                  {retaking ? 'Resetando...' : 'Refazer Curso'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quiz Results List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <MdQuiz className="w-6 h-6" />
              Resultados dos Quizzes
            </h2>
          </div>
          
          <div className="p-6">
            {progress.quiz_results.length === 0 ? (
              <div className="text-center py-12">
                <FaBookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Nenhum quiz encontrado neste curso.</p>
                <Link href={`/cursos/${params.id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                  Ver Curso
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {progress.quiz_results.map((result, index) => (
                  <div
                    key={result.quiz_id}
                    className={`border-2 rounded-xl p-5 transition-all hover:shadow-lg ${
                      result.score === null
                        ? 'border-gray-200 bg-gray-50'
                        : result.passed
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm">
                            {index + 1}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">{result.lesson_title}</h3>
                          {result.score !== null && (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              result.passed
                                ? 'bg-green-200 text-green-800'
                                : 'bg-red-200 text-red-800'
                            }`}>
                              {result.passed ? (
                                <span className="flex items-center gap-1">
                                  <FaCheckCircle /> Aprovado
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <FaTimesCircle /> Reprovado
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 ml-11">{result.quiz_title}</p>
                        
                        {result.score !== null ? (
                          <div className="ml-11 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Nota</p>
                              <p className={`text-xl font-bold ${
                                result.passed ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {result.score.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Acertos</p>
                              <p className="text-lg font-semibold text-gray-700">
                                {result.correct_answers}/{result.total_questions}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Nota Mínima</p>
                              <p className="text-lg font-semibold text-gray-700">{result.passing_score}%</p>
                            </div>
                            {result.completed_at && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Data</p>
                                <p className="text-sm font-semibold text-gray-700">
                                  {new Date(result.completed_at).toLocaleDateString('pt-PT')}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="ml-11">
                            <p className="text-sm text-gray-500 italic">Quiz ainda não realizado</p>
                            <Link
                              href={`/aulas/${result.lesson_id}`}
                              className="inline-block mt-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
                            >
                              Ir para aula →
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <Link
            href={`/cursos/${params.id}`}
            className="flex-1 px-6 py-3 bg-white border-2 border-primary-600 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition text-center"
          >
            Ver Curso
          </Link>
          {!progress.course_passed && (
            <button
              onClick={handleRetakeCourse}
              disabled={retaking}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaRedo className={retaking ? 'animate-spin' : ''} />
              {retaking ? 'Resetando...' : 'Refazer Curso'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
