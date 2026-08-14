/**
 * Master Zenda fintech illustration. Renders the SVG as a vector (not a
 * cropped photo/screenshot). viewBox 1200×1600 is preserved via width 100%
 * and height auto — do not wrap in overflow-hidden + object-cover.
 */
export const ZENDA_FINTECH_SVG = '/zenda_fintech_vector.svg'
export const ZENDA_FINTECH_OG = '/zenda_fintech_og.png'

type Props = {
  className?: string
  priority?: boolean
}

export default function ZendaFintechVisual({ className = '', priority }: Props) {
  return (
    <figure className={`zenda-fintech-visual ${className}`.trim()}>
      {/* Native img keeps SVG vectors; next/image fill would crop/distort. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ZENDA_FINTECH_SVG}
        alt="Zenda — financial dashboard with balance, budget, goals, wallet and card"
        width={1200}
        height={1600}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </figure>
  )
}
