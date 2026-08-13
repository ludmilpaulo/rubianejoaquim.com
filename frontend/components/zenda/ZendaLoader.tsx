import Image from 'next/image'

type Size = 'sm' | 'md' | 'lg'

const SIZE_PX: Record<Size, number> = {
  sm: 40,
  md: 64,
  lg: 96,
}

interface ZendaLoaderProps {
  message?: string
  size?: Size
  className?: string
}

/**
 * Branded loading mark — logo + growth-green ring.
 * Use instead of generic spinners on auth, dashboards, and data fetches.
 */
export default function ZendaLoader({
  message,
  size = 'md',
  className = '',
}: ZendaLoaderProps) {
  const px = SIZE_PX[size]
  const ring = px + 16

  return (
    <div className={`zenda-loader ${className}`.trim()} role="status" aria-live="polite">
      <div className="zenda-loader-mark" style={{ width: ring, height: ring }}>
        <div className="zenda-loader-ring" />
        <Image
          src="/zenda_logo.svg"
          alt=""
          width={px}
          height={px}
          className="rounded-xl object-contain relative z-[1]"
          priority
        />
      </div>
      {message ? (
        <p className="text-sm text-zenda-textSecondary text-center max-w-[17.5rem] leading-snug">
          {message}
        </p>
      ) : (
        <span className="sr-only">A carregar…</span>
      )}
    </div>
  )
}
