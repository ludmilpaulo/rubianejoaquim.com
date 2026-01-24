'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi, coursesApi } from '@/lib/api'
import Link from 'next/link'

interface Choice {
  id?: number
  choice_text: string
  is_correct: boolean
  order: number
}

interface Course {
  id: number
  title: string
}

interface Lesson {
  id: number
  title: string
  course: number
}

interface Question {
  id: number
  question_text: string
  explanation: string
  choices: Choice[]
  order: number
  course?: number
  course_id?: number
  course_title?: string
  lesson?: number
  lesson_id?: number
  lesson_title?: string
}

export default function AdminQuestionsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [questions, setQuestions] = useState<Question[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    question_text: '',
    explanation: '',
    order: 0,
    course: '' as string | number,
    lesson: '' as string | number,
  })
  const [choices, setChoices] = useState<Choice[]>([
    { choice_text: '', is_correct: false, order: 0 },
    { choice_text: '', is_correct: false, order: 1 },
    { choice_text: '', is_correct: false, order: 2 },
    { choice_text: '', is_correct: false, order: 3 },
  ])

  useEffect(() => {
    if (!user?.is_admin) {
      router.push('/login')
      return
    }

    fetchQuestions()
    fetchCourses()
  }, [user, router])

  useEffect(() => {
    // Quando curso mudar, buscar lições desse curso
    if (formData.course) {
      fetchLessons(Number(formData.course))
    } else {
      setLessons([])
      setFormData(prev => ({ ...prev, lesson: '' }))
    }
  }, [formData.course])

  const fetchQuestions = async () => {
    try {
      const response = await adminApi.questions.list()
      const data = response.data.results || response.data
      setQuestions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const response = await adminApi.courses.list()
      const data = response.data.results || response.data
      setCourses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchLessons = async (courseId: number) => {
    try {
      const response = await adminApi.lessons.list(courseId)
      const data = response.data.results || response.data
      setLessons(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching lessons:', error)
      setLessons([])
    }
  }

  const handleAddChoice = () => {
    setChoices([...choices, { choice_text: '', is_correct: false, order: choices.length }])
  }

  const handleRemoveChoice = (index: number) => {
    setChoices(choices.filter((_, i) => i !== index).map((c, i) => ({ ...c, order: i })))
  }

  const handleChoiceChange = (index: number, field: keyof Choice, value: any) => {
    const updated = [...choices]
    updated[index] = { ...updated[index], [field]: value }
    // Se marcar como correta, desmarcar outras
    if (field === 'is_correct' && value) {
      updated.forEach((c, i) => {
        if (i !== index) c.is_correct = false
      })
    }
    setChoices(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.question_text.trim()) {
      alert('Texto da pergunta é obrigatório')
      return
    }

    if (!formData.course) {
      alert('Selecione um curso')
      return
    }

    if (!formData.lesson) {
      alert('Selecione uma lição')
      return
    }

    const correctChoices = choices.filter(c => c.is_correct)
    if (correctChoices.length === 0) {
      alert('Selecione pelo menos uma resposta correta')
      return
    }

    if (choices.filter(c => c.choice_text.trim()).length < 2) {
      alert('Adicione pelo menos 2 opções de resposta')
      return
    }

    try {
      // Criar pergunta
      const questionData: any = {
        question_text: formData.question_text,
        explanation: formData.explanation,
        order: formData.order,
        course: Number(formData.course),
        lesson: Number(formData.lesson),
      }

      let questionId: number
      if (editingQuestion) {
        const response = await adminApi.questions.update(editingQuestion.id, questionData)
        questionId = editingQuestion.id
        // Deletar choices antigas e criar novas
        if (editingQuestion.choices) {
          for (const choice of editingQuestion.choices) {
            if (choice.id) {
              try {
                await adminApi.choices.delete(choice.id)
              } catch (err) {
                // Ignorar
              }
            }
          }
        }
      } else {
        const response = await adminApi.questions.create(questionData)
        questionId = response.data.id
      }

      // Criar choices
      for (const choice of choices.filter(c => c.choice_text.trim())) {
        try {
          await adminApi.choices.create({
            question: questionId,
            choice_text: choice.choice_text,
            is_correct: choice.is_correct,
            order: choice.order,
          })
        } catch (choiceError: any) {
          console.error('Erro ao criar choice:', choiceError)
          console.error('Dados da choice:', {
            question: questionId,
            choice_text: choice.choice_text,
            is_correct: choice.is_correct,
            order: choice.order,
          })
          throw choiceError // Re-throw para ser capturado pelo catch externo
        }
      }

      setShowForm(false)
      setEditingQuestion(null)
      setFormData({ question_text: '', explanation: '', order: 0, course: '', lesson: '' })
      setChoices([
        { choice_text: '', is_correct: false, order: 0 },
        { choice_text: '', is_correct: false, order: 1 },
        { choice_text: '', is_correct: false, order: 2 },
        { choice_text: '', is_correct: false, order: 3 },
      ])
      fetchQuestions()
    } catch (error: any) {
      console.error('Error saving question:', error)
      console.error('Error response:', error.response?.data)
      const errorMsg = error.response?.data?.error || 
                      error.response?.data?.question_text?.[0] ||
                      error.response?.data?.course?.[0] ||
                      error.response?.data?.lesson?.[0] ||
                      error.response?.data?.non_field_errors?.[0] ||
                      error.message ||
                      'Erro ao salvar pergunta'
      alert(`Erro: ${errorMsg}\n\nDetalhes completos no console.`)
    }
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setFormData({
      question_text: question.question_text,
      explanation: question.explanation || '',
      order: question.order,
      course: question.course || question.course_id || '',
      lesson: question.lesson || question.lesson_id || '',
    })
    setChoices(question.choices.length > 0 ? question.choices : [
      { choice_text: '', is_correct: false, order: 0 },
      { choice_text: '', is_correct: false, order: 1 },
      { choice_text: '', is_correct: false, order: 2 },
      { choice_text: '', is_correct: false, order: 3 },
    ])
    // Buscar lições do curso selecionado
    if (question.course || question.course_id) {
      fetchLessons(Number(question.course || question.course_id))
    }
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return

    try {
      await adminApi.questions.delete(id)
      fetchQuestions()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao excluir pergunta')
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Perguntas</h1>
            <p className="mt-2 text-gray-600">Gerencie perguntas de múltipla escolha</p>
          </div>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingQuestion(null)
              setFormData({ question_text: '', explanation: '', order: 0, course: '', lesson: '' })
              setLessons([])
              setChoices([
                { choice_text: '', is_correct: false, order: 0 },
                { choice_text: '', is_correct: false, order: 1 },
                { choice_text: '', is_correct: false, order: 2 },
                { choice_text: '', is_correct: false, order: 3 },
              ])
            }}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition font-semibold"
          >
            + Nova Pergunta
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Curso *
                  </label>
                  <select
                    required
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value, lesson: '' })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  >
                    <option value="">Selecione um curso</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lição *
                  </label>
                  <select
                    required
                    value={formData.lesson}
                    onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                    disabled={!formData.course}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">{formData.course ? 'Selecione uma lição' : 'Selecione um curso primeiro'}</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texto da Pergunta *
                </label>
                <textarea
                  required
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="Digite a pergunta..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Explicação (opcional)
                </label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="Explicação da resposta correta..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opções de Resposta *
                </label>
                <div className="space-y-3">
                  {choices.map((choice, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correct"
                        checked={choice.is_correct}
                        onChange={() => handleChoiceChange(index, 'is_correct', true)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <input
                        type="text"
                        value={choice.choice_text}
                        onChange={(e) => handleChoiceChange(index, 'choice_text', e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                        placeholder={`Opção ${index + 1}`}
                      />
                      {choices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChoice(index)}
                          className="text-red-600 hover:text-red-700 px-3"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddChoice}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                  >
                    + Adicionar Opção
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  * Selecione a opção correta marcando o botão de rádio
                </p>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingQuestion(null)
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
                >
                  {editingQuestion ? 'Atualizar' : 'Criar'} Pergunta
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {questions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-4">Nenhuma pergunta criada</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Criar primeira pergunta
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {questions.map((question) => (
                <div key={question.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {question.course_title && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {question.course_title}
                          </span>
                        )}
                        {question.lesson_title && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {question.lesson_title}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {question.question_text}
                      </h3>
                      {question.explanation && (
                        <p className="text-sm text-gray-600 mb-3">{question.explanation}</p>
                      )}
                      <div className="space-y-2">
                        {question.choices?.map((choice, idx) => (
                          <div
                            key={choice.id || idx}
                            className={`text-sm p-2 rounded ${
                              choice.is_correct
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {choice.is_correct && '✓ '}
                            {choice.choice_text}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(question)}
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
