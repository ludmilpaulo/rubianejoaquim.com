'use client'

import { useTranslations } from '@/contexts/LocaleContext'
import type { ShowreelVideo } from '@/lib/portfolio-types'
import { getYoutubeEmbedUrl } from '@/lib/youtube'
import SectionHeader from './SectionHeader'

export default function ShowreelSection({ videos }: { videos: ShowreelVideo[] }) {
  const t = useTranslations()
  const primary = videos.find((v) => v.is_primary) ?? videos[0]
  if (!primary) return null

  const embedUrl = getYoutubeEmbedUrl(primary.youtube_url)

  return (
    <section id="showreel" className="py-20 md:py-28 bg-slate-900/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          label={t('showreel.label')}
          title={primary.title || t('showreel.title')}
        />
        <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/50 aspect-video bg-black">
          <iframe
            src={embedUrl}
            title={primary.title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {primary.description && (
          <p className="text-center text-slate-400 mt-6 max-w-2xl mx-auto">{primary.description}</p>
        )}
      </div>
    </section>
  )
}
