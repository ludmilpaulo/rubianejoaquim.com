'use client'

import type { CmsLocale } from '@/lib/cms-admin'

const LABELS: Record<CmsLocale, string> = {
  pt: 'PT',
  en: 'EN',
  fr: 'FR',
  es: 'ES',
}

export default function LocaleTabs({
  locale,
  onChange,
}: {
  locale: CmsLocale
  onChange: (l: CmsLocale) => void
}) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
      {(Object.keys(LABELS) as CmsLocale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            locale === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  )
}
