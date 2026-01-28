'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function LoginPage() {
  const router = useRouter()
  const { login, register, user } = useAuthStore()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        if (!formData.email || !formData.password) {
          setError('Por favor, preencha todos os campos obrigatórios.')
          setLoading(false)
          return
        }
        await login(formData.email, formData.password)
        // Get updated user after login
        const updatedUser = useAuthStore.getState().user
        if (updatedUser?.is_admin) {
          router.push('/admin')
        } else {
          router.push('/area-do-aluno')
        }
      } else {
        // Validation for registration
        if (!formData.email || !formData.username || !formData.password || !formData.password_confirm) {
          setError('Por favor, preencha todos os campos obrigatórios (Email, Username, Palavra-passe e Confirmação).')
          setLoading(false)
          return
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
          setError('Por favor, introduza um email válido.')
          setLoading(false)
          return
        }
        
        // Username validation (alphanumeric, underscore, dot, hyphen, max 150 chars)
        const usernameRegex = /^[a-zA-Z0-9._-]+$/
        if (!usernameRegex.test(formData.username)) {
          setError('Username inválido. Use apenas letras, números, pontos, hífens e underscores.')
          setLoading(false)
          return
        }
        
        if (formData.username.length > 150) {
          setError('Username muito longo. Máximo 150 caracteres.')
          setLoading(false)
          return
        }
        
        // Password validation
        if (formData.password.length < 8) {
          setError('A palavra-passe deve ter pelo menos 8 caracteres.')
          setLoading(false)
          return
        }
        
        if (formData.password !== formData.password_confirm) {
          setError('As palavras-passe não coincidem.')
          setLoading(false)
          return
        }
        
        await register({
          email: formData.email.trim(),
          username: formData.username.trim(),
          password: formData.password,
          password_confirm: formData.password_confirm,
          first_name: formData.first_name?.trim() || undefined,
          last_name: formData.last_name?.trim() || undefined,
          phone: formData.phone?.trim() || undefined,
        })
        // Students always go to student area
        router.push('/area-do-aluno')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao fazer login/registro'
      setError(errorMessage)
      
      // Show alert for specific login errors
      if (isLogin) {
        if (errorMessage.includes('não encontrado') || errorMessage.includes('Utilizador não encontrado')) {
          alert('❌ Utilizador não encontrado\n\nO utilizador que introduziu não existe. Verifique o email ou username e tente novamente.')
        } else if (errorMessage.includes('incorreta') || errorMessage.includes('Palavra-passe incorreta')) {
          alert('⚠️ Palavra-passe incorreta\n\nO utilizador existe, mas a palavra-passe está incorreta. Tente novamente.')
        } else if (errorMessage.includes('não foi possível conectar') || errorMessage.includes('Network Error')) {
          alert('🔌 Erro de Conexão\n\n' + errorMessage)
        }
      } else {
        // Show alert for registration errors
        const errorLines = errorMessage.split('\n')
        const title = errorLines[0] || 'Erro ao registar'
        const details = errorLines.slice(1).join('\n') || errorMessage
        
        alert(`❌ Erro ao Registar\n\n${details}\n\nPor favor, corrija os erros e tente novamente.`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          {isLogin ? 'Entrar' : 'Registar'}
        </h1>

        {error && (
          <div className={`px-4 py-3 rounded-lg mb-6 ${
            error.includes('não encontrado') || error.includes('Utilizador não encontrado')
              ? 'bg-orange-50 border border-orange-200 text-orange-800'
              : error.includes('incorreta') || error.includes('Palavra-passe incorreta')
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-start gap-2">
              <span className="text-lg">
                {error.includes('não encontrado') || error.includes('Utilizador não encontrado')
                  ? '❌'
                  : error.includes('incorreta') || error.includes('Palavra-passe incorreta')
                  ? '⚠️'
                  : isLogin ? '🔴' : '❌'}
              </span>
              <div className="flex-1">
                <p className="font-semibold">
                  {error.includes('não encontrado') || error.includes('Utilizador não encontrado')
                    ? 'Utilizador não encontrado'
                    : error.includes('incorreta') || error.includes('Palavra-passe incorreta')
                    ? 'Palavra-passe incorreta'
                    : isLogin ? 'Erro ao fazer login' : 'Erro ao registar'}
                </p>
                <div className="text-sm mt-1 whitespace-pre-line">
                  {error.split('\n').map((line, idx) => (
                    <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome de utilizador
                </label>
                <input
                  type="text"
                  required={!isLogin}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primeiro Nome
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Último Nome
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email ou Username
            </label>
            <input
              type="text"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com ou username"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone (opcional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Palavra-passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Palavra-passe
              </label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  required={!isLogin}
                  value={formData.password_confirm}
                  onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPasswordConfirm ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50"
          >
            {loading ? 'A processar...' : isLogin ? 'Entrar' : 'Registar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
            className="text-primary-600 hover:text-primary-700"
          >
            {isLogin ? 'Não tem conta? Registar' : 'Já tem conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
