'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import Link from 'next/link'

interface Question {
  id: number
  question_text: string
  explanation: string
  choices: Array<{
    id: number
    choice_text: string
    is_correct: boolean
    order: number
  }>
  order: number
}

interface QuizQuestion {
  id: number
  question: Question
  points: number
  order: number
}

interface Quiz {
  id: number
  lesson: number
  title: string
  description: string
  passing_score: number
  time_limit_minutes: number | null
  is_active: boolean
  questions: QuizQuestion[]
}

export default function LessonQuizPage() {
  const router = useRouter()
  const params = useParams()
  const lessonId = params?.id as string
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lesson, setLesson] = useState<any>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([])
  const [formData, setFormData] = useState({
    title: 'Quiz da Aula',
    description: '',
    passing_score: 70,
    time_limit_minutes: null as number | null,
    is_active: true,
  })

  useEffect(() => {
    if (!user?.is_admin) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      try {
        const [lessonRes, questionsRes, quizRes] = await Promise.all([
          adminApi.lessons.get(parseInt(lessonId)),
          adminApi.questions.list(),
          adminApi.lessonQuizzes.list(parseInt(lessonId)).catch(() => ({ data: { results: [] } })),
        ])

        setLesson(lessonRes.data)
        const questionsData = questionsRes.data.results || questionsRes.data
        setQuestions(Array.isArray(questionsData) ? questionsData : [])

        const quizData = quizRes.data.results || quizRes.data
        if (Array.isArray(quizData) && quizData.length > 0) {
          const existingQuiz = quizData[0]
          setQuiz(existingQuiz)
          setFormData({
            title: existingQuiz.title || 'Quiz da Aula',
            description: existingQuiz.description || '',
            passing_score: existingQuiz.passing_score || 70,
            time_limit_minutes: existingQuiz.time_limit_minutes,
            is_active: existingQuiz.is_active,
          })
          setSelectedQuestions(existingQuiz.questions?.map((q: QuizQuestion) => q.question.id) || [])
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    if (lessonId) {
      fetchData()
    }
  }, [user, router, lessonId])

  const handleSaveQuiz = async () => {
    setError('')
    setSaving(true)

    try {
      let quizId: number

      if (quiz) {
        // Atualizar quiz existente
        await adminApi.lessonQuizzes.update(quiz.id, {
          ...formData,
          lesson: parseInt(lessonId),
        })
        quizId = quiz.id
      } else {
        // Criar novo quiz
        const response = await adminApi.lessonQuizzes.create({
          ...formData,
          lesson: parseInt(lessonId),
        })
        quizId = response.data.id
      }

      // Adicionar perguntas ao quiz
      for (const questionId of selectedQuestions) {
        try {
          await adminApi.lessonQuizzes.addQuestion(quizId, {
            question_id: questionId,
            points: 1,
            order: selectedQuestions.indexOf(questionId),
          })
        } catch (err) {
          // Pode já existir, ignorar
        }
      }

      // Remover perguntas que não estão mais selecionadas
      if (quiz?.questions) {
        for (const quizQuestion of quiz.questions) {
          if (!selectedQuestions.includes(quizQuestion.question.id)) {
            try {
              await adminApi.lessonQuizzes.removeQuestion(quizId, quizQuestion.question.id)
            } catch (err) {
              // Ignorar erros
            }
          }
        }
      }

      router.push(`/admin/lessons/${lessonId}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao guardar quiz')
    } finally {
      setSaving(false)
    }
  }

  const toggleQuestion = (questionId: number) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions(selectedQuestions.filter((id) => id !== questionId))
    } else {
      setSelectedQuestions([...selectedQuestions, questionId])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/admin/lessons/${lessonId}`}
            className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
          >
            ← Voltar para Aula
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {quiz ? 'Editar Quiz' : 'Criar Quiz'} - {lesson?.title}
          </h1>
          <p className="text-gray-600">Gerencie o quiz de múltipla escolha desta aula</p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Quiz Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Quiz</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pontuação Mínima (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.passing_score}
                    onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) || 70 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tempo Limite (minutos, opcional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.time_limit_minutes || ''}
                    onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    placeholder="Sem limite"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                />
              </div>
            </div>

            {/* Questions Selection */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Perguntas do Quiz</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Selecione as perguntas que farão parte deste quiz ({selectedQuestions.length} selecionadas)
                  </p>
                </div>
                <Link
                  href="/admin/questions"
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  + Criar Nova Pergunta
                </Link>
              </div>

              {questions.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">Nenhuma pergunta disponível</p>
                  <Link
                    href="/admin/questions"
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Criar primeira pergunta
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {questions.map((question) => (
                    <div
                      key={question.id}
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        selectedQuestions.includes(question.id)
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleQuestion(question.id)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedQuestions.includes(question.id)}
                          onChange={() => toggleQuestion(question.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{question.question_text}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {question.choices?.length || 0} opções de resposta
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Link
                href={`/admin/lessons/${lessonId}`}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </Link>
              <button
                onClick={handleSaveQuiz}
                disabled={saving || selectedQuestions.length === 0}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 font-semibold"
              >
                {saving ? 'A guardar...' : 'Guardar Quiz'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
