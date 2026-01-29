import type { Metadata } from 'next'
import Link from 'next/link'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rubianejoaquim.com'

export const metadata: Metadata = {
  title: 'Suporte | Rubiane Joaquim Educação Financeira',
  description: 'Centro de ajuda e suporte para Rubiane Joaquim Educação Financeira. Encontre respostas às suas perguntas sobre cursos, mentoria e a plataforma.',
  openGraph: {
    title: 'Suporte | Rubiane Joaquim Educação Financeira',
    description: 'Centro de ajuda e suporte. Encontre respostas às suas perguntas sobre cursos, mentoria e a plataforma.',
    url: '/support',
    siteName: 'Rubiane Joaquim Educação Financeira',
    type: 'website',
  },
  alternates: { canonical: '/support' },
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50/30">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Centro de Suporte
          </h1>
          <p className="text-xl text-gray-600">
            Estamos aqui para ajudar. Encontre respostas às suas perguntas ou entre em contato conosco.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Perguntas Frequentes</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Como posso aceder aos cursos?
              </h3>
              <p className="text-gray-600">
                Após registar-se na plataforma, pode navegar pelos cursos disponíveis. Para aceder ao conteúdo completo, 
                precisa de comprar o curso e fazer o upload do comprovativo de pagamento. Após aprovação, terá acesso total às aulas.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Como funciona o pagamento?
              </h3>
              <p className="text-gray-600">
                O pagamento é feito manualmente através de transferência bancária ou outros métodos indicados. 
                Após o pagamento, faça o upload do comprovativo na plataforma. A nossa equipa irá aprovar o pagamento 
                e ativar o seu acesso dentro de 24-48 horas.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Como solicito uma sessão de mentoria?
              </h3>
              <p className="text-gray-600">
                Na página de <Link href="/mentoria" className="text-primary-600 hover:text-primary-700 underline">Mentoria</Link>, 
                escolha o pacote que melhor se adequa às suas necessidades e preencha o formulário com os seus dados. 
                Entraremos em contacto para combinar os detalhes da sessão.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Posso aceder aos cursos no telemóvel?
              </h3>
              <p className="text-gray-600">
                Sim! A plataforma é totalmente responsiva e funciona perfeitamente em dispositivos móveis. 
                Também temos a aplicação móvel <strong>Zenda</strong> disponível para iOS e Android, que oferece 
                uma experiência ainda melhor para gerir as suas finanças pessoais.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Como posso recuperar a minha palavra-passe?
              </h3>
              <p className="text-gray-600">
                Na página de <Link href="/login" className="text-primary-600 hover:text-primary-700 underline">Login</Link>, 
                clique em "Esqueceu a palavra-passe?" e siga as instruções para recuperar o acesso à sua conta.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Os cursos têm certificado?
              </h3>
              <p className="text-gray-600">
                Sim, após completar todos os módulos e avaliações de um curso, receberá um certificado de conclusão 
                que pode descarregar e partilhar.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Não encontrou o que procura?</h2>
          <p className="text-gray-600 mb-6">
            Se tiver outras questões ou precisar de ajuda adicional, não hesite em contactar-nos.
          </p>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <a 
                href="mailto:suporte@rubianejoaquim.com" 
                className="text-primary-600 hover:text-primary-700 underline"
              >
                suporte@rubianejoaquim.com
              </a>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Horário de Atendimento</h3>
              <p className="text-gray-600">
                Segunda a Sexta: 9h00 - 18h00 (GMT)<br />
                Respondemos a todos os contactos no prazo de 24-48 horas.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            href="/cursos" 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-center"
          >
            <h3 className="font-semibold text-gray-900 mb-2">Ver Cursos</h3>
            <p className="text-sm text-gray-600">Explore os nossos cursos disponíveis</p>
          </Link>
          
          <Link 
            href="/mentoria" 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-center"
          >
            <h3 className="font-semibold text-gray-900 mb-2">Solicitar Mentoria</h3>
            <p className="text-sm text-gray-600">Agende uma sessão personalizada</p>
          </Link>
          
          <Link 
            href="/zenda" 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-center"
          >
            <h3 className="font-semibold text-gray-900 mb-2">App Zenda</h3>
            <p className="text-sm text-gray-600">Descarregue a nossa aplicação móvel</p>
          </Link>
        </div>
      </section>
    </div>
  )
}
