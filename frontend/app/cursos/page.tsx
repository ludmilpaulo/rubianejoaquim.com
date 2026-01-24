'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { coursesApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils/currency'

interface Course {
  id: number
  title: string
  slug: string
  short_description: string
  price: string
  image: string | null
  lessons_count: number
  free_lessons_count: number
}

export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await coursesApi.list()
        setCourses(response.data.results || response.data)
      } catch (error) {
        console.error('Erro ao carregar cursos:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCourses()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="text-center mb-16 animate-fade-in">
        <span className="text-primary-600 font-semibold text-sm uppercase tracking-wide">Cursos Disponíveis</span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mt-4 mb-6">
          Transforme o seu futuro{' '}
          <span className="gradient-text">financeiro</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Escolha o curso ideal para começar a sua jornada de educação financeira e alcançar a liberdade que sempre desejou.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 border-4 border-transparent border-r-primary-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
          </div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Nenhum curso disponível</h3>
          <p className="text-gray-500">Novos cursos serão adicionados em breve.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, index) => (
            <div 
              key={course.id} 
              className="group bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {course.image ? (
                <div className="relative h-56 bg-gray-200 overflow-hidden">
                  <img 
                    src={course.image} 
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              ) : (
                <div className="h-56 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <svg className="w-20 h-20 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">{course.title}</h3>
                <p className="text-gray-600 mb-6 line-clamp-3 leading-relaxed">{course.short_description}</p>
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                  <div>
                    <span className="text-3xl font-bold text-primary-600">
                      {formatCurrency(course.price)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total de aulas</div>
                    <div className="text-lg font-semibold text-gray-900">{course.lessons_count}</div>
                  </div>
                </div>
                <Link
                  href={`/cursos/${course.id}`}
                  className="group/btn block w-full bg-primary-600 text-white text-center py-3.5 rounded-xl hover:bg-primary-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Ver Detalhes
                    <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <span className="absolute inset-0 bg-primary-700 opacity-0 group-hover/btn:opacity-100 transition-opacity"></span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
