'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, logout, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkAuth()
  }, [checkAuth])

  // Close mobile menu when clicking outside (handled by Link onClick)

  const handleLogout = () => {
    logout()
    setMobileMenuOpen(false)
    router.push('/')
  }

  // During SSR and initial hydration, show default state (not logged in)
  const showLoading = mounted && isLoading
  const showUser = mounted && !isLoading && user
  const showGuest = mounted && !isLoading && !user

  return (
    <nav
      className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8" style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))', paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))' }}>
        <div className="flex justify-between items-center h-14 sm:h-16 md:h-20 gap-2 min-w-0">
          <Link href="/" className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 hover:text-primary-600 transition-colors truncate min-w-0 flex-shrink">
            <span className="gradient-text">Educação Financeira</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/cursos" className="text-gray-700 hover:text-primary-600 font-medium transition-colors relative group">
              Cursos
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

            {showLoading ? (
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            ) : showUser && user ? (
              <>
                {user.is_admin ? (
                  <Link href="/admin" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
                    Admin
                  </Link>
                ) : (
                  <Link href="/area-do-aluno" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
                    Área do Aluno
                  </Link>
                )}
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

          {/* Mobile menu button - touch-target for accessibility */}
          <div className="md:hidden flex items-center gap-1 flex-shrink-0">
            {showLoading ? (
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="touch-target p-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 animate-fade-in">
            <div className="flex flex-col space-y-4">
              <Link
                href="/cursos"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
              >
                Cursos
              </Link>
              <Link
                href="/mentoria"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
              >
                Mentoria
              </Link>
              <Link
                href="/conteudos-gratis"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
              >
                Conteúdo Grátis
              </Link>
              
              {showUser && user ? (
                <>
                  {user.is_admin ? (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-gray-700 hover:text-primary-600 font-medium transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
                    >
                      Admin
                    </Link>
                  ) : (
                    <Link
                      href="/area-do-aluno"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-gray-700 hover:text-primary-600 font-medium transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
                    >
                      Área do Aluno
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-left text-gray-700 hover:text-primary-600 font-medium transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-700 hover:text-primary-600 font-medium transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-center font-semibold mx-4"
                  >
                    Registar
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
