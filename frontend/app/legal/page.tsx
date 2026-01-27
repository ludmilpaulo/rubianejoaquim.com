import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aviso Legal e Direitos de Autor',
  description: 'Aviso legal, direitos de autor e informações de contacto de Rubiane Joaquim Educação Financeira.',
}

const currentYear = new Date().getFullYear()

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero — Aviso Legal */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(2,132,199,0.15),transparent)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24 relative">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/20 border border-primary-400/30 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 tracking-tight">
            Aviso Legal e Direitos de Autor
          </h1>
          <p className="text-slate-400 text-center text-lg max-w-2xl mx-auto">
            Informações legais e de propriedade intelectual de Rubiane Joaquim Educação Financeira.
          </p>
        </div>
      </section>

      {/* Conteúdo */}
      <section className="relative -mt-2 pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
            {/* Bloco: Identificação */}
            <div className="p-8 md:p-10 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm">1</span>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3">Identificação</h2>
                  <p className="text-slate-600 leading-relaxed">
                    Este sítio é operado por <strong className="text-slate-800">Rubiane Joaquim Educação Financeira</strong>.
                    Pode contactar-nos por e-mail em{' '}
                    <a href="mailto:contacto@rubianejoaquim.com" className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2">
                      contacto@rubianejoaquim.com
                    </a>
                    {' '}ou por telemóvel/WhatsApp: <strong className="text-slate-800">+244 944 905246</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco: Direitos de Autor */}
            <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/40">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm">2</span>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3">Direitos de Autor e Propriedade Intelectual</h2>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    Todo o conteúdo deste sítio — textos, imagens, vídeos, gráficos, logótipos e demais materiais — é propriedade de Rubiane Joaquim Educação Financeira ou de quem licenciou o seu uso, e está protegido pelas leis de direitos de autor e propriedade intelectual aplicáveis.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    &copy; {currentYear} Rubiane Joaquim Educação Financeira. <strong className="text-slate-800">Todos os direitos reservados.</strong> Nenhuma parte deste sítio ou dos cursos e materiais nele disponibilizados pode ser reproduzida, distribuída ou utilizada comercialmente sem autorização prévia e escrita.
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco: Uso do site */}
            <div className="p-8 md:p-10 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm">3</span>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3">Uso do Sítio</h2>
                  <p className="text-slate-600 leading-relaxed">
                    O uso deste sítio e dos serviços nele disponibilizados está sujeito aos termos e condições que forem aplicáveis aos cursos, mentorias e conteúdos em que se inscrever. Ao utilizar o sítio, declara aceitar estas condições e a nossa política de privacidade, quando disponível.
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco: Contacto */}
            <div className="p-8 md:p-10 bg-gradient-to-br from-slate-50 to-primary-50/30">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm">4</span>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3">Contacto</h2>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    Para questões sobre aviso legal, direitos de autor ou uso de conteúdos, utilize os canais indicados na secção Identificação.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="mailto:contacto@rubianejoaquim.com"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      E-mail
                    </a>
                    <a
                      href="https://wa.me/244944905246"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:bg-[#20bd5a] transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA de regresso */}
          <div className="mt-10 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar ao início
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
