'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, logout, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-primary-600 transition-colors">
            <span className="gradient-text">Erica</span> Educação Financeira
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/cursos" className="text-gray-700 hover:text-primary-600 font-medium transition-colors relative group">
              Curso
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link href="/mentoria" className="text-gray-700 hover:text-primary-600 font-medium transition-colors relative group">
              Mentoria
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link href="/conteudos-gratis" className="text-gray-700 hover:text-primary-600 font-medium transition-colors relative group">
              Conteúdo Grátis
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-600 group-hover:w-full transition-all duration-300"></span>
            </Link>

            {isLoading ? (
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            ) : user ? (
              <>
                <Link href="/area-do-aluno" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
                  Área do Aluno
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
                  Entrar
                </Link>
                <Link
                  href="/login"
                  className="bg-primary-600 text-white px-6 py-2.5 rounded-xl hover:bg-primary-700 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-semibold"
                >
                  Registar
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            ) : user ? (
              <Link href="/area-do-aluno" className="text-primary-600 font-semibold">
                Área do Aluno
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-semibold"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
