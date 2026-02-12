import Link from 'next/link'
import type { Metadata } from 'next'
import RubianeImage from '@/components/RubianeImage'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rubianejoaquim.com'

export const metadata: Metadata = {
  title: 'Transforme a sua relação com o dinheiro | Rubiane Joaquim Educação Financeira',
  description: 'Rubiane Joaquim — educação financeira para todos os países e pessoas de língua portuguesa. Cursos online e mentoria para poupar, investir e liberdade financeira. Portugal, Brasil, Angola, Moçambique e lusófonos.',
  openGraph: {
    title: 'Transforme a sua relação com o dinheiro | Rubiane Joaquim',
    description: 'Cursos e mentoria em educação financeira para todos os países de língua portuguesa. Aprenda a poupar, investir e alcançar liberdade financeira com Rubiane Joaquim.',
    url: '/',
    siteName: 'Rubiane Joaquim Educação Financeira',
    images: [{ url: '/images/Rubiane.jpeg', width: 1200, height: 630, alt: 'Rubiane Joaquim — Especialista em Educação Financeira para todos os países de língua portuguesa' }],
    locale: 'pt_PT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Transforme a sua relação com o dinheiro | Rubiane Joaquim',
    description: 'Cursos e mentoria em educação financeira para todos os países e pessoas de língua portuguesa. Poupar, investir, liberdade financeira.',
    images: ['/images/Rubiane.jpeg'],
  },
  alternates: { canonical: '/' },
}

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Rubiane Joaquim | Educação Financeira — Cursos e Mentoria para Todos os Países de Língua Portuguesa',
  description: 'Cursos e mentoria em educação financeira para todos os países e pessoas de língua portuguesa. Com Rubiane Joaquim — poupar, investir e liberdade financeira.',
  url: SITE_URL,
  image: `${SITE_URL}/images/Rubiane.jpeg`,
  inLanguage: 'pt',
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: { '@id': `${SITE_URL}/#organization` },
  primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE_URL}/images/Rubiane.jpeg` },
}

export default function Home() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50/30 py-12 sm:py-16 md:py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center animate-fade-in">
            <div className="inline-block mb-4 sm:mb-6">
              <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-primary-100 text-primary-800 border border-primary-200">
                ✨ Educação Financeira que Transforma Vidas
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight px-2">
              Transforme a sua relação com o{' '}
              <span className="gradient-text">dinheiro</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-6 sm:mb-8 md:mb-10 max-w-3xl mx-auto leading-relaxed px-2">
              Cursos práticos e mentoria personalizada em educação financeira.{' '}
              <span className="font-semibold text-gray-900">Aprenda a gerir, investir e alcançar a sua liberdade financeira.</span>
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-2">
              <Link
                href="/cursos"
                className="group relative bg-primary-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold hover:bg-primary-700 transition-all duration-300 shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5 w-full sm:w-auto"
              >
                <span className="relative z-10">Explorar Cursos</span>
                <span className="absolute inset-0 bg-primary-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </Link>
              <Link
                href="/mentoria"
                className="group bg-white text-primary-600 border-2 border-primary-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold hover:bg-primary-50 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 w-full sm:w-auto"
              >
                Agendar Mentoria
              </Link>
            </div>
            <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm text-gray-500 px-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Acesso Imediato</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Suporte Personalizado</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>App Mobile Incluído</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-center">
            <div className="animate-slide-up">
              <div className="inline-block mb-4">
                <span className="text-primary-600 font-semibold text-sm uppercase tracking-wide">Sobre</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                Quem é a <span className="gradient-text">Rubiane</span>?
              </h2>
              <div className="space-y-3 sm:space-y-4 text-base sm:text-lg text-gray-600 leading-relaxed">
                <p>
Especialista em educação financeira com <strong className="text-gray-900">anos de experiência</strong>, Rubiane Joaquim ajuda pessoas 
                a alcançarem os seus objetivos financeiros.
                </p>
                <p>
                  A minha missão é <strong className="text-gray-900">democratizar o conhecimento financeiro</strong> e tornar a gestão 
                  de dinheiro acessível a todos, através de cursos práticos e mentoria personalizada.
                </p>
              </div>
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4 sm:gap-6">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary-600">50+</div>
                  <div className="text-xs sm:text-sm text-gray-600">Alunos Formados</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary-600">2+</div>
                  <div className="text-xs sm:text-sm text-gray-600">Anos de Experiência</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary-600">98%</div>
                  <div className="text-xs sm:text-sm text-gray-600">Taxa de Satisfação</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl hover-lift bg-gradient-to-br from-primary-100 to-primary-200">
                <RubianeImage />
              </div>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary-600/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <span className="text-primary-600 font-semibold text-xs sm:text-sm uppercase tracking-wide">Vantagens</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3 sm:mt-4 mb-3 sm:mb-4 px-2">
              Porquê escolher-nos?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
              Uma experiência completa de educação financeira adaptada às suas necessidades
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="group bg-white p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover-lift border border-gray-100">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Cursos Práticos</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Conteúdos estruturados e práticos, focados em resultados reais que pode aplicar imediatamente na sua vida.
              </p>
            </div>
            <div className="group bg-white p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover-lift border border-gray-100">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Mentoria Personalizada</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Acompanhamento individual e personalizado para alcançar os seus objetivos financeiros específicos.
              </p>
            </div>
            <div className="group bg-white p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover-lift border border-gray-100">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2m0 0H5m2 0h2m2 13h2M5 8h2m0 0V6a2 2 0 012-2h2M9 8v13" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Conteúdos Grátis</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Acesso imediato a aulas gratuitas para conhecer o nosso método antes de investir.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-12 sm:py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-primary-400/20 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-2">
            Pronto para começar?
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 md:mb-10 text-primary-100 max-w-2xl mx-auto leading-relaxed px-2">
            Junte-se a centenas de alunos que já transformaram a sua vida financeira e alcançaram a liberdade que sempre desejaram.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-2">
            <Link
              href="/cursos"
              className="group bg-white text-primary-600 px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:-translate-y-1 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span>Explorar Todos os Cursos</span>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/conteudos-gratis"
              className="bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold hover:bg-white/20 transition-all duration-300 w-full sm:w-auto text-center"
            >
              Ver Conteúdos Grátis
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
