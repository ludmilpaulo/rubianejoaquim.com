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

interface ExamQuestion {
  id: number
  question: Question
  points: number
  order: number
}

interface FinalExam {
  id: number
  course: number
  title: string
  description: string
  passing_score: number
  time_limit_minutes: number | null
  max_attempts: number
  is_active: boolean
  questions: ExamQuestion[]
}

export default function FinalExamPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params?.id as string
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [course, setCourse] = useState<any>(null)
  const [exam, setExam] = useState<FinalExam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([])
  const [formData, setFormData] = useState({
    title: 'Exame Final',
    description: '',
    passing_score: 70,
    time_limit_minutes: null as number | null,
    max_attempts: 3,
    is_active: true,
  })

  useEffect(() => {
    if (!user?.is_admin) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      try {
        const [courseRes, questionsRes, examRes] = await Promise.all([
          adminApi.courses.get(parseInt(courseId)),
          adminApi.questions.list(),
          adminApi.finalExams.list(parseInt(courseId)).catch(() => ({ data: { results: [] } })),
        ])

        setCourse(courseRes.data)
        const questionsData = questionsRes.data.results || questionsRes.data
        setQuestions(Array.isArray(questionsData) ? questionsData : [])

        const examData = examRes.data.results || examRes.data
        if (Array.isArray(examData) && examData.length > 0) {
          const existingExam = examData[0]
          setExam(existingExam)
          setFormData({
            title: existingExam.title || 'Exame Final',
            description: existingExam.description || '',
            passing_score: existingExam.passing_score || 70,
            time_limit_minutes: existingExam.time_limit_minutes,
            max_attempts: existingExam.max_attempts || 3,
            is_active: existingExam.is_active,
          })
          setSelectedQuestions(existingExam.questions?.map((q: ExamQuestion) => q.question.id) || [])
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      fetchData()
    }
  }, [user, router, courseId])

  const handleSaveExam = async () => {
    setError('')
    setSaving(true)

    try {
      let examId: number

      if (exam) {
        // Atualizar exame existente
        await adminApi.finalExams.update(exam.id, {
          ...formData,
          course: parseInt(courseId),
        })
        examId = exam.id
      } else {
        // Criar novo exame
        const response = await adminApi.finalExams.create({
          ...formData,
          course: parseInt(courseId),
        })
        examId = response.data.id
      }

      // Adicionar perguntas ao exame
      for (const questionId of selectedQuestions) {
        try {
          await adminApi.finalExams.addQuestion(examId, {
            question_id: questionId,
            points: 1,
            order: selectedQuestions.indexOf(questionId),
          })
        } catch (err) {
          // Pode já existir, ignorar
        }
      }

      // Remover perguntas que não estão mais selecionadas
      if (exam?.questions) {
        for (const examQuestion of exam.questions) {
          if (!selectedQuestions.includes(examQuestion.question.id)) {
            try {
              await adminApi.finalExams.removeQuestion(examId, examQuestion.question.id)
            } catch (err) {
              // Ignorar erros
            }
          }
        }
      }

      router.push(`/admin/courses/${courseId}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao guardar exame')
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
            href={`/admin/courses/${courseId}`}
            className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
          >
            ← Voltar para Curso
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {exam ? 'Editar Exame Final' : 'Criar Exame Final'} - {course?.title}
          </h1>
          <p className="text-gray-600">Gerencie o exame final de múltipla escolha deste curso</p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Exam Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Exame</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tentativas Máximas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_attempts}
                    onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 3 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
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
                  <h3 className="text-lg font-semibold text-gray-900">Perguntas do Exame</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Selecione as perguntas que farão parte deste exame ({selectedQuestions.length} selecionadas)
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
                href={`/admin/courses/${courseId}`}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </Link>
              <button
                onClick={handleSaveExam}
                disabled={saving || selectedQuestions.length === 0}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 font-semibold"
              >
                {saving ? 'A guardar...' : 'Guardar Exame'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
