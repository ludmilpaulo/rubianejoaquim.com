import Link from 'next/link'

const WHATSAPP_NUMBER = '244944905246'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`
const WHATSAPP_MESSAGE = 'Olá! Gostaria de mais informações sobre os cursos e mentoria em educação financeira.'

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white mt-20 relative overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 opacity-60 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />

      <div
        className="max-w-7xl mx-auto py-10 sm:py-12 md:py-16 relative px-4 sm:px-6 lg:px-8"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))',
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-6 sm:gap-8 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-5">
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Educação Financeira
            </h3>
            <p className="text-slate-400 text-[15px] leading-relaxed max-w-sm">
              Transforme a sua relação com o dinheiro através de cursos e mentoria personalizada.
            </p>
          </div>

          {/* Links */}
          <div className="md:col-span-3">
            <h4 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider text-slate-300">
              Navegação
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/cursos', label: 'Cursos' },
                { href: '/mentoria', label: 'Mentoria' },
                { href: '/conteudos-gratis', label: 'Conteúdos Grátis' },
                { href: '/login', label: 'Entrar' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-slate-400 hover:text-white transition-colors duration-200 text-[15px] inline-flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-4">
            <h4 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider text-slate-300">
              Contacto
            </h4>
            <div className="space-y-4">
              {/* Email */}
              <a
                href="mailto:contacto@rubianejoaquim.com"
                className="flex items-center gap-4 p-3 -mx-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
              >
                <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-primary-600/20 transition-colors">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <div>
                  <span className="text-xs text-slate-500 block">Email</span>
                  <span className="text-[15px]">contacto@rubianejoaquim.com</span>
                </div>
              </a>

              {/* Phone */}
              <a
                href="tel:+244944905246"
                className="flex items-center gap-4 p-3 -mx-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
              >
                <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-primary-600/20 transition-colors">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <div>
                  <span className="text-xs text-slate-500 block">Telemóvel</span>
                  <span className="text-[15px]">+244 944 905246</span>
                </div>
              </a>

              {/* WhatsApp - prominent CTA */}
              <a
                href={`${WHATSAPP_URL}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 -mx-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300 transition-all duration-200 group"
              >
                <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#25D366]/20 flex items-center justify-center group-hover:bg-[#25D366]/30 transition-colors">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </span>
                <div className="flex-1">
                  <span className="text-xs text-emerald-500/80 block font-medium">WhatsApp</span>
                  <span className="text-[15px] font-medium">Falar no WhatsApp</span>
                </div>
                <svg className="w-5 h-5 text-emerald-400/70 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <p className="text-slate-500 text-xs sm:text-sm">
            &copy; {new Date().getFullYear()} Rubiane Joaquim Educação Financeira.{' '}
            <Link
              href="/legal"
              className="text-slate-400 hover:text-white transition-colors duration-200 underline underline-offset-2 decoration-slate-600 hover:decoration-primary-400"
            >
              Todos os direitos reservados.
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
