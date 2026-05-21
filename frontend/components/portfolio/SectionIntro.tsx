import type { HomeSection } from '@/lib/public-types'
import SectionHeader from './SectionHeader'

export default function SectionIntro({
  section,
  align = 'center',
}: {
  section?: Partial<HomeSection> | null
  align?: 'left' | 'center'
}) {
  if (!section?.title && !section?.subtitle) return null
  const label = (section.extra_data?.label as string) || section.badge || ''
  return (
    <SectionHeader
      label={label || undefined}
      title={section.title || section.subtitle || ''}
      subtitle={section.title ? section.subtitle : undefined}
      align={align}
    />
  )
}
