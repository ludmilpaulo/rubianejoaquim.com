interface SectionHeaderProps {
  label?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  dark?: boolean
}

export default function SectionHeader({
  label,
  title,
  subtitle,
  align = 'center',
  dark = true,
}: SectionHeaderProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left'
  return (
    <div className={`max-w-3xl mb-12 md:mb-16 ${alignClass}`}>
      {label && (
        <span
          className={`inline-block text-xs font-bold uppercase tracking-[0.2em] mb-4 ${
            dark ? 'text-amber-400' : 'text-amber-600'
          }`}
        >
          {label}
        </span>
      )}
      <h2
        className={`text-3xl sm:text-4xl md:text-5xl font-display font-bold leading-tight ${
          dark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-base sm:text-lg leading-relaxed ${
            dark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
