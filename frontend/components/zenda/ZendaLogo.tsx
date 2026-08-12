import Image from 'next/image'

type Size = 'sm' | 'md' | 'lg' | 'xl'
type Variant = 'full' | 'icon'

const SIZE_PX: Record<Size, number> = {
  sm: 40,
  md: 64,
  lg: 96,
  xl: 128,
}

interface ZendaLogoProps {
  size?: Size
  variant?: Variant
  className?: string
  priority?: boolean
}

/**
 * Official Zenda logo for Next.js surfaces.
 * Uses `/public/zenda_logo.svg` (copied from assets/zenda_logo.svg).
 */
export default function ZendaLogo({
  size = 'md',
  variant = 'full',
  className = '',
  priority = false,
}: ZendaLogoProps) {
  const px = SIZE_PX[size]
  const rounded = variant === 'icon' ? 'rounded-2xl' : 'rounded-xl'

  return (
    <Image
      src="/zenda_logo.svg"
      alt="Zenda"
      width={px}
      height={px}
      priority={priority}
      className={`${rounded} object-contain ${className}`.trim()}
    />
  )
}
