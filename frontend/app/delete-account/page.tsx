'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import Link from 'next/link'

export default function DeleteAccountPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const handleRequestDeletion = async () => {
    if (!confirmed) {
      setError('Por favor, confirme que leu e entendeu as informações acima.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await authApi.requestAccountDeletion()
      alert('Sua solicitação de exclusão de conta foi recebida. Sua conta e dados associados serão removidos em breve.\n\nVocê será desconectado agora.')
      logout()
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao solicitar exclusão de conta. Por favor, tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/area-do-aluno" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
            ← Voltar para Área do Aluno
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Solicitar Exclusão de Conta
          </h1>
          <p className="text-lg text-gray-600">
            Zenda - Educação Financeira
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="prose prose-lg max-w-none">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <h2 className="text-xl font-semibold text-red-900 mb-2">
                ⚠️ Aviso Importante
              </h2>
              <p className="text-red-800">
                A exclusão da sua conta é <strong>permanente e irreversível</strong>. 
                Todos os seus dados serão removidos permanentemente após o processamento da solicitação.
              </p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-blue-900 mt-0 mb-4">
                📋 Como Solicitar a Exclusão da Sua Conta no Zenda
              </h2>
              <p className="text-blue-800 mb-4 font-semibold">
                Siga estes passos para solicitar a exclusão da sua conta e dados associados:
              </p>
              <ol className="list-decimal list-inside space-y-4 text-blue-900 font-medium">
                <li className="bg-white p-3 rounded border border-blue-200">
                  <strong>Leia atentamente</strong> todas as informações abaixo sobre quais dados serão excluídos e quais podem ser mantidos.
                </li>
                <li className="bg-white p-3 rounded border border-blue-200">
                  <strong>Revise o período de retenção</strong> de 30 dias e as exceções legais mencionadas abaixo.
                </li>
                <li className="bg-white p-3 rounded border border-blue-200">
                  <strong>Confirme</strong> que você leu e entendeu todas as informações marcando a caixa de confirmação no final desta página.
                </li>
                <li className="bg-white p-3 rounded border border-blue-200">
                  <strong>Clique no botão</strong> "Solicitar Exclusão de Conta" para enviar sua solicitação.
                </li>
                <li className="bg-white p-3 rounded border border-blue-200">
                  Você será <strong>desconectado automaticamente</strong> após a solicitação ser enviada com sucesso.
                </li>
              </ol>
              <p className="text-blue-800 mt-4 text-sm">
                <strong>Nota:</strong> Se você não tiver uma conta ou não estiver logado, entre em contato conosco através dos canais de suporte abaixo.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
              Dados que Serão Excluídos
            </h2>
            <p className="text-gray-700 mb-4">
              Quando você solicita a exclusão da sua conta no <strong>Zenda</strong>, os seguintes dados serão permanentemente removidos:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-8 text-gray-700">
              <li><strong>Informações da Conta:</strong> Email, nome de usuário, nome completo, telefone, endereço</li>
              <li><strong>Dados de Autenticação:</strong> Tokens de acesso, sessões ativas</li>
              <li><strong>Progresso nos Cursos:</strong> Aulas concluídas, progresso de cursos, certificados</li>
              <li><strong>Inscrições:</strong> Histórico de inscrições em cursos e mentoria</li>
              <li><strong>Dados Financeiros Pessoais:</strong> Despesas, orçamentos, metas financeiras, dívidas registradas</li>
              <li><strong>Dados Financeiros de Negócios:</strong> Vendas, despesas de negócios, categorias personalizadas</li>
              <li><strong>Tarefas e Objetivos:</strong> Todas as tarefas criadas, objetivos financeiros, lembretes</li>
              <li><strong>Conversas com AI Copilot:</strong> Histórico de conversas e mensagens</li>
              <li><strong>Comprovativos de Pagamento:</strong> Arquivos enviados como comprovativos de pagamento</li>
              <li><strong>Resultados de Quizzes e Exames:</strong> Pontuações, respostas, resultados de avaliações</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
              Dados que Podem Ser Mantidos
            </h2>
            <p className="text-gray-700 mb-4">
              Por motivos legais e de conformidade, alguns dados podem ser mantidos por períodos específicos:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-8 text-gray-700">
              <li>
                <strong>Registros Financeiros Legais:</strong> Dados relacionados a transações financeiras podem ser mantidos 
                conforme exigido por lei (geralmente até 7 anos para fins fiscais e contábeis)
              </li>
              <li>
                <strong>Logs de Sistema:</strong> Logs de segurança e auditoria podem ser mantidos por até 90 dias 
                para fins de segurança e resolução de problemas
              </li>
              <li>
                <strong>Dados Anonimizados:</strong> Dados agregados e anonimizados podem ser mantidos para fins de 
                análise e melhoria do serviço (sem identificação pessoal)
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
              Período de Retenção
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
              <p className="text-blue-900">
                <strong>Período de Processamento:</strong> Sua conta será desativada imediatamente após a solicitação. 
                A exclusão completa dos dados ocorrerá dentro de <strong>30 dias</strong> após a solicitação, 
                exceto para dados que devem ser mantidos por motivos legais conforme mencionado acima.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
              Antes de Continuar
            </h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-8">
              <p className="text-yellow-900 mb-2">
                <strong>Recomendações:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-yellow-900">
                <li>Exporte quaisquer dados importantes antes de solicitar a exclusão</li>
                <li>Certifique-se de que não precisa mais acessar seus cursos, progresso ou dados financeiros</li>
                <li>Se você tem inscrições ativas em cursos, considere concluí-los antes de excluir a conta</li>
                <li>Se tiver dúvidas, entre em contato com o suporte antes de prosseguir</li>
              </ul>
            </div>

            {/* Confirmation Checkbox */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 mr-3 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-gray-700">
                  <strong>Confirmo que li e entendi</strong> todas as informações acima sobre a exclusão da minha conta. 
                  Entendo que esta ação é <strong>permanente e irreversível</strong> e que todos os meus dados serão 
                  removidos conforme descrito acima. Estou ciente do período de retenção de 30 dias e das exceções legais.
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {user ? (
                <>
                  <Link
                    href="/area-do-aluno"
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center font-semibold transition"
                  >
                    Cancelar
                  </Link>
                  <button
                    onClick={handleRequestDeletion}
                    disabled={loading || !confirmed}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
                  >
                    {loading ? 'Processando...' : 'Solicitar Exclusão de Conta'}
                  </button>
                </>
              ) : (
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 w-full">
                  <p className="text-yellow-900 font-semibold mb-2">
                    Você precisa estar logado para solicitar a exclusão da conta.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    <Link
                      href="/login"
                      className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-center font-semibold transition"
                    >
                      Fazer Login
                    </Link>
                    <Link
                      href="/"
                      className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center font-semibold transition"
                    >
                      Voltar ao Início
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Precisa de Ajuda?
              </h3>
              <p className="text-gray-600 mb-4">
                Se você tiver dúvidas sobre a exclusão da sua conta ou precisar de assistência, 
                entre em contato com nosso suporte:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>
                  <strong>Email:</strong> contacto@rubianejoaquim.com
                </li>
                <li>
                  <strong>WhatsApp:</strong>{' '}
                  <a href="https://wa.me/244944905246" className="text-primary-600 hover:text-primary-700">
                    +244 944 905246
                  </a>
                </li>
                <li>
                  <Link href="/area-do-aluno" className="text-primary-600 hover:text-primary-700">
                    Voltar para Área do Aluno
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
