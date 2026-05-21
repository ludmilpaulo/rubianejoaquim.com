'use client'

import type { HomeSection, ShowreelVideo } from '@/lib/public-types'
import { getYoutubeEmbedUrl } from '@/lib/youtube'
import SectionIntro from './SectionIntro'
import Reveal from './Reveal'

export default function ShowreelSection({
  videos,
  intro,
}: {
  videos: ShowreelVideo[]
  intro?: HomeSection
}) {
  const primary = videos.find((v) => v.is_primary) ?? videos[0]
  if (!primary) return null

  const embedUrl = getYoutubeEmbedUrl(primary.youtube_url)

  return (
    <section id="showreel" className="py-24 md:py-32 section-dark border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionIntro
            section={{
              ...intro,
              title: intro?.title || primary.title,
              subtitle: intro?.subtitle || primary.description,
            }}
          />
        </Reveal>
        <Reveal delay={120}>
          <div className="relative aspect-video max-w-5xl mx-auto rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl premium-glow -mt-4">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={primary.title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500">
                {primary.title}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
