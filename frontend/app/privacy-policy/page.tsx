import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Zenda - Educação Financeira',
  description: 'Política de privacidade do aplicativo Zenda desenvolvido por Rubiane Joaquim Educação Financeira. Informações sobre coleta, uso e proteção de dados pessoais.',
  robots: {
    index: true,
    follow: true,
  },
}

const currentYear = new Date().getFullYear()

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero — Privacy Policy */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(2,132,199,0.15),transparent)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24 relative">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/20 border border-primary-400/30 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 tracking-tight">
            Política de Privacidade
          </h1>
          <p className="text-slate-400 text-center text-lg max-w-2xl mx-auto">
            <strong className="text-white">Zenda</strong> — Desenvolvido por <strong className="text-white">Rubiane Joaquim Educação Financeira</strong>
          </p>
        </div>
      </section>

      {/* Conteúdo */}
      <section className="relative -mt-2 pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
            
            {/* Identificação do App e Desenvolvedor */}
            <div className="p-8 md:p-10 border-b border-slate-100 bg-gradient-to-br from-primary-50 to-slate-50">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Identificação</h2>
              <div className="space-y-3 text-slate-700">
                <p className="leading-relaxed">
                  <strong className="text-slate-900">Nome do Aplicativo:</strong> <span className="font-semibold text-primary-700">Zenda</span>
                </p>
                <p className="leading-relaxed">
                  <strong className="text-slate-900">Desenvolvedor:</strong> <span className="font-semibold text-primary-700">Rubiane Joaquim Educação Financeira</span>
                </p>
                <p className="leading-relaxed">
                  <strong className="text-slate-900">Entidade Legal:</strong> Rubiane Joaquim Educação Financeira
                </p>
                <p className="leading-relaxed">
                  <strong className="text-slate-900">Contacto:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>E-mail:</strong> <a href="mailto:contacto@rubianejoaquim.com" className="text-primary-600 hover:text-primary-700 underline">contacto@rubianejoaquim.com</a></li>
                  <li><strong>Telefone/WhatsApp:</strong> +244 944 905246</li>
                </ul>
                <p className="leading-relaxed mt-4">
                  Esta Política de Privacidade descreve como o aplicativo <strong>Zenda</strong>, desenvolvido por <strong>Rubiane Joaquim Educação Financeira</strong>, coleta, usa, armazena e protege suas informações pessoais.
                </p>
              </div>
            </div>

            {/* Informações Coletadas */}
            <div className="p-8 md:p-10 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Informações que Coletamos</h2>
              <div className="space-y-4 text-slate-700">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">2.1. Informações da Conta</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Nome completo</li>
                    <li>Endereço de e-mail</li>
                    <li>Nome de usuário</li>
                    <li>Número de telefone (opcional)</li>
                    <li>Senha (criptografada)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">2.2. Dados de Uso do Aplicativo</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Progresso nos cursos e aulas</li>
                    <li>Resultados de quizzes e exames</li>
                    <li>Preferências e configurações do aplicativo</li>
                    <li>Histórico de atividades</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">2.3. Dados Financeiros</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Despesas pessoais e de negócios</li>
                    <li>Orçamentos e metas financeiras</li>
                    <li>Dívidas registradas</li>
                    <li>Vendas e receitas (para usuários de negócios)</li>
                    <li>Dados de categorias personalizadas</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">2.4. Dados de Comunicação</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Histórico de conversas com o AI Financial Copilot</li>
                    <li>Mensagens e interações dentro do aplicativo</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">2.5. Dados Técnicos</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Informações do dispositivo (modelo, sistema operacional)</li>
                    <li>Endereço IP</li>
                    <li>Identificadores únicos do dispositivo</li>
                    <li>Logs de uso e erros</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">2.6. Dados de Pagamento</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Comprovativos de pagamento enviados</li>
                    <li>Informações de inscrições em cursos e mentorias</li>
                    <li>Histórico de transações</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Como Usamos as Informações */}
            <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/40">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Como Usamos suas Informações</h2>
              <div className="space-y-3 text-slate-700">
                <p className="leading-relaxed">Utilizamos suas informações para:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Fornecer e melhorar os serviços do aplicativo <strong>Zenda</strong></li>
                  <li>Processar inscrições em cursos e mentorias</li>
                  <li>Gerenciar sua conta e autenticação</li>
                  <li>Rastrear seu progresso nos cursos e aulas</li>
                  <li>Fornecer funcionalidades de finanças pessoais e de negócios</li>
                  <li>Operar o AI Financial Copilot e melhorar suas respostas</li>
                  <li>Enviar notificações importantes sobre o serviço</li>
                  <li>Responder a suas solicitações e fornecer suporte</li>
                  <li>Detectar e prevenir fraudes ou uso indevido</li>
                  <li>Cumprir obrigações legais</li>
                  <li>Analisar o uso do aplicativo para melhorias</li>
                </ul>
              </div>
            </div>

            {/* Compartilhamento de Informações */}
            <div className="p-8 md:p-10 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Compartilhamento de Informações</h2>
              <div className="space-y-4 text-slate-700">
                <p className="leading-relaxed">
                  <strong>Rubiane Joaquim Educação Financeira</strong> não vende suas informações pessoais. Podemos compartilhar suas informações apenas nas seguintes situações:
                </p>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">4.1. Prestadores de Serviços</h3>
                  <p className="leading-relaxed ml-4">
                    Podemos compartilhar informações com prestadores de serviços terceirizados que nos ajudam a operar o aplicativo <strong>Zenda</strong>, como serviços de hospedagem, análise de dados e processamento de pagamentos. Esses prestadores são obrigados a manter a confidencialidade das informações.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">4.2. Serviços de IA</h3>
                  <p className="leading-relaxed ml-4">
                    Para operar o AI Financial Copilot, podemos compartilhar suas mensagens com provedores de serviços de IA (como OpenAI). Essas mensagens são processadas de acordo com as políticas de privacidade desses provedores.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">4.3. Requisitos Legais</h3>
                  <p className="leading-relaxed ml-4">
                    Podemos divulgar informações se exigido por lei, ordem judicial ou processo legal, ou para proteger nossos direitos, propriedade ou segurança.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">4.4. Com seu Consentimento</h3>
                  <p className="leading-relaxed ml-4">
                    Podemos compartilhar informações com terceiros quando você nos der consentimento explícito para fazê-lo.
                  </p>
                </div>
              </div>
            </div>

            {/* Segurança dos Dados */}
            <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/40">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Segurança dos Dados</h2>
              <div className="space-y-3 text-slate-700">
                <p className="leading-relaxed">
                  <strong>Rubiane Joaquim Educação Financeira</strong> implementa medidas de segurança técnicas e organizacionais para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Isso inclui:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Criptografia de dados em trânsito e em repouso</li>
                  <li>Autenticação segura e controle de acesso</li>
                  <li>Monitoramento regular de segurança</li>
                  <li>Backups regulares dos dados</li>
                  <li>Treinamento de pessoal em práticas de segurança</li>
                </ul>
                <p className="leading-relaxed mt-4">
                  No entanto, nenhum método de transmissão pela Internet ou armazenamento eletrônico é 100% seguro. Embora nos esforcemos para proteger suas informações, não podemos garantir segurança absoluta.
                </p>
              </div>
            </div>

            {/* Seus Direitos */}
            <div className="p-8 md:p-10 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Seus Direitos</h2>
              <div className="space-y-3 text-slate-700">
                <p className="leading-relaxed">Você tem os seguintes direitos em relação às suas informações pessoais:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li><strong>Acesso:</strong> Solicitar uma cópia das informações pessoais que mantemos sobre você</li>
                  <li><strong>Retificação:</strong> Corrigir informações imprecisas ou incompletas</li>
                  <li><strong>Exclusão:</strong> Solicitar a exclusão de suas informações pessoais (sujeito a retenções legais)</li>
                  <li><strong>Portabilidade:</strong> Receber suas informações em formato estruturado e portável</li>
                  <li><strong>Oposição:</strong> Opor-se ao processamento de suas informações em certas circunstâncias</li>
                  <li><strong>Limitação:</strong> Solicitar a limitação do processamento de suas informações</li>
                </ul>
                <p className="leading-relaxed mt-4">
                  Para exercer esses direitos, entre em contato conosco através dos canais indicados na seção de Contacto abaixo ou visite{' '}
                  <Link href="/delete-account" className="text-primary-600 hover:text-primary-700 underline font-medium">
                    nossa página de exclusão de conta
                  </Link>.
                </p>
              </div>
            </div>

            {/* Retenção de Dados */}
            <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/40">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Retenção de Dados</h2>
              <div className="space-y-3 text-slate-700">
                <p className="leading-relaxed">
                  Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir os propósitos descritos nesta política, a menos que um período de retenção mais longo seja exigido ou permitido por lei.
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li><strong>Dados da Conta:</strong> Mantidos enquanto sua conta estiver ativa e por até 30 dias após a exclusão</li>
                  <li><strong>Dados Financeiros:</strong> Podem ser mantidos por até 7 anos para fins fiscais e contábeis, conforme exigido por lei</li>
                  <li><strong>Logs de Sistema:</strong> Mantidos por até 90 dias para fins de segurança e resolução de problemas</li>
                  <li><strong>Dados Anonimizados:</strong> Podem ser mantidos indefinidamente para fins de análise e melhoria do serviço</li>
                </ul>
                <p className="leading-relaxed mt-4">
                  Quando você solicita a exclusão da sua conta, processamos a solicitação dentro de <strong>30 dias</strong>, exceto para dados que devem ser mantidos por motivos legais.
                </p>
              </div>
            </div>

            {/* Cookies e Tecnologias Similares */}
            <div className="p-8 md:p-10 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Cookies e Tecnologias Similares</h2>
              <div className="space-y-3 text-slate-700">
                <p className="leading-relaxed">
                  O aplicativo <strong>Zenda</strong> e o site web podem usar cookies e tecnologias similares para melhorar sua experiência, analisar o uso e personalizar conteúdo. Você pode gerenciar as preferências de cookies através das configurações do seu dispositivo ou navegador.
                </p>
              </div>
            </div>

            {/* Privacidade de Menores */}
            <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/40">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Privacidade de Menores</h2>
              <div className="space-y-3 text-slate-700">
                <p className="leading-relaxed">
                  O aplicativo <strong>Zenda</strong> não é destinado a menores de 18 anos. Não coletamos intencionalmente informações pessoais de menores. Se descobrirmos que coletamos informações de um menor sem consentimento dos pais, tomaremos medidas para excluir essas informações.
                </p>
              </div>
            </div>

            {/* Alterações nesta Política */}
            <div className="p-8 md:p-10 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Alterações nesta Política</h2>
              <div className="space-y-3 text-slate-700">
                <p className="leading-relaxed">
                  <strong>Rubiane Joaquim Educação Financeira</strong> pode atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações significativas publicando a nova política nesta página e atualizando a data de "Última Atualização" abaixo.
                </p>
                <p className="leading-relaxed">
                  Recomendamos que você revise esta política periodicamente para se manter informado sobre como protegemos suas informações.
                </p>
                <p className="leading-relaxed mt-4 text-sm text-slate-600">
                  <strong>Última Atualização:</strong> {new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Contacto */}
            <div className="p-8 md:p-10 bg-gradient-to-br from-slate-50 to-primary-50/30">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Contacto</h2>
              <div className="space-y-4 text-slate-700">
                <p className="leading-relaxed">
                  Se você tiver dúvidas, preocupações ou solicitações relacionadas a esta Política de Privacidade ou ao tratamento de suas informações pessoais no aplicativo <strong>Zenda</strong>, entre em contato conosco:
                </p>
                <div className="bg-white rounded-lg p-6 border border-slate-200">
                  <p className="font-semibold text-slate-900 mb-3">Rubiane Joaquim Educação Financeira</p>
                  <ul className="space-y-2">
                    <li>
                      <strong>E-mail:</strong>{' '}
                      <a href="mailto:contacto@rubianejoaquim.com" className="text-primary-600 hover:text-primary-700 underline">
                        contacto@rubianejoaquim.com
                      </a>
                    </li>
                    <li>
                      <strong>Telefone/WhatsApp:</strong>{' '}
                      <a href="https://wa.me/244944905246" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">
                        +244 944 905246
                      </a>
                    </li>
                    <li>
                      <strong>Website:</strong>{' '}
                      <a href="https://www.rubianejoaquim.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">
                        www.rubianejoaquim.com
                      </a>
                    </li>
                  </ul>
                </div>
                <p className="leading-relaxed mt-4">
                  Para solicitar a exclusão da sua conta e dados associados, visite nossa{' '}
                  <Link href="/delete-account" className="text-primary-600 hover:text-primary-700 underline font-medium">
                    página de exclusão de conta
                  </Link>.
                </p>
              </div>
            </div>
          </div>

          {/* Links de navegação */}
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link
              href="/delete-account"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
            >
              Solicitar Exclusão de Conta
            </Link>
            <Link
              href="/legal"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Aviso Legal
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Voltar ao Início
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
