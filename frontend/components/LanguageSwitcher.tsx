'use client'

import { useLocale } from '@/contexts/LocaleContext'
import { locales, localeLabels, type Locale } from '@/lib/i18n/config'

export default function LanguageSwitcher({
  className = '',
  variant = 'cinema',
}: {
  className?: string
  variant?: 'cinema' | 'product'
}) {
  const { locale, setLocale } = useLocale()
  const isProduct = variant === 'product'

  return (
    <div
      className={`inline-flex items-center rounded-full p-0.5 ${
        isProduct
          ? 'border border-zenda-border bg-zenda-container'
          : 'border border-white/10 bg-black/30 backdrop-blur-md'
      } ${className}`}
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
              ? isProduct
                ? 'bg-zenda-primary text-white shadow-md'
                : 'bg-amber-400 text-slate-950 shadow-md'
              : isProduct
                ? 'text-zenda-navy hover:text-zenda-primary'
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
