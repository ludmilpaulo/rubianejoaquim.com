'use client'

import { useLocale } from '@/contexts/LocaleContext'
import { locales, localeLabels, type Locale } from '@/lib/i18n/config'

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale()

  return (
    <div
      className={`inline-flex items-center rounded-full border border-white/10 bg-black/30 p-0.5 backdrop-blur-md ${className}`}
      role="group"
      aria-label="Language selector"
    >
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code as Locale)}
          className={`min-w-[2.25rem] rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide transition-all duration-200 ${
            locale === code
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white'
          }`}
          aria-pressed={locale === code}
        >
          {localeLabels[code]}
        </button>
      ))}
    </div>
  )
}
