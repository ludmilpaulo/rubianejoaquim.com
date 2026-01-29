import type { Metadata } from 'next'
import Link from 'next/link'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rubianejoaquim.com'

export const metadata: Metadata = {
  title: 'Zenda - App de Educação Financeira | Rubiane Joaquim',
  description: 'Zenda é a aplicação móvel de educação financeira desenvolvida por Rubiane Joaquim. Gerencie suas finanças pessoais, acompanhe gastos, orçamentos, metas e dívidas. Disponível para iOS e Android.',
  openGraph: {
    title: 'Zenda - App de Educação Financeira | Rubiane Joaquim',
    description: 'Aplicação móvel completa para gestão de finanças pessoais. Acompanhe gastos, orçamentos, metas e muito mais.',
    url: '/zenda',
    siteName: 'Rubiane Joaquim Educação Financeira',
    images: [{ url: '/images/zenda-app.png', width: 1200, height: 630, alt: 'Zenda - App de Educação Financeira' }],
    type: 'website',
  },
  alternates: { canonical: '/zenda' },
}

export default function ZendaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50/30">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Zenda
              </h1>
              <p className="text-2xl text-primary-600 font-semibold mb-4">
                Educação Financeira na Palma da Sua Mão
              </p>
              <p className="text-lg text-gray-600 mb-8">
                A aplicação móvel completa desenvolvida por Rubiane Joaquim para ajudá-lo a 
                gerir as suas finanças pessoais de forma simples e eficaz.
              </p>
              
              <div className="flex flex-wrap gap-4 mb-8">
                <a
                  href="https://apps.apple.com/app/zenda"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C1.79 15.25 2.51 7.59 9.05 7.31c1.35.07 2.3.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <span>App Store</span>
                </a>
                
                <a
                  href="https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <span>Google Play</span>
                </a>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl p-8 shadow-xl">
                <div className="bg-white rounded-xl p-4 shadow-lg">
                  <div className="aspect-[9/16] bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400 text-sm">Preview do App</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
          Funcionalidades Principais
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Finanças Pessoais</h3>
            <p className="text-gray-600">
              Registe e acompanhe todas as suas despesas pessoais, organize por categorias e visualize gráficos detalhados.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Orçamentos</h3>
            <p className="text-gray-600">
              Crie orçamentos diários, mensais ou anuais. Compare gastos reais com os orçamentos definidos e mantenha-se no controlo.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Metas Financeiras</h3>
            <p className="text-gray-600">
              Defina objetivos financeiros e acompanhe o seu progresso. Visualize quanto falta para alcançar cada meta.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Gestão de Dívidas</h3>
            <p className="text-gray-600">
              Registe e acompanhe todas as suas dívidas. Veja o progresso de pagamento e mantenha-se organizado.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Financial Copilot</h3>
            <p className="text-gray-600">
              Obtenha conselhos financeiros personalizados com inteligência artificial. Faça perguntas e receba orientações práticas.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Finanças do Negócio</h3>
            <p className="text-gray-600">
              Gerencie as finanças do seu negócio separadamente. Registe vendas, despesas e acompanhe métricas importantes.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Porquê Escolher o Zenda?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">✓ Sincronização em Tempo Real</h3>
              <p className="text-gray-600 mb-6">
                Os seus dados são sincronizados entre todos os seus dispositivos. Aceda às suas finanças em qualquer lugar.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">✓ Privacidade e Segurança</h3>
              <p className="text-gray-600 mb-6">
                Os seus dados financeiros são protegidos com encriptação de ponta a ponta. A sua privacidade é a nossa prioridade.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">✓ Interface Intuitiva</h3>
              <p className="text-gray-600 mb-6">
                Design moderno e fácil de usar. Gerencie as suas finanças sem complicações.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">✓ Relatórios Detalhados</h3>
              <p className="text-gray-600 mb-6">
                Visualize gráficos e relatórios detalhados sobre os seus gastos, orçamentos e progresso financeiro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Comece a Gerir as Suas Finanças Hoje
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Descarregue o Zenda gratuitamente e dê o primeiro passo rumo à liberdade financeira.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <a
              href="https://apps.apple.com/app/zenda"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C1.79 15.25 2.51 7.59 9.05 7.31c1.35.07 2.3.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span>Descarregar para iOS</span>
            </a>
            
            <a
              href="https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <span>Descarregar para Android</span>
            </a>
          </div>
          
          <p className="text-primary-200">
            Desenvolvido por <Link href="/" className="underline hover:text-white">Rubiane Joaquim Educação Financeira</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
