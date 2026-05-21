'use client'

import Link from 'next/link'
import PhoneSlideshow from '@/components/PhoneSlideshow'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslations } from '@/contexts/LocaleContext'

const FEATURES = [
  { icon: '💰', titleKey: 'zenda.features.personal', descKey: 'zenda.features.personalDesc' },
  { icon: '🏪', titleKey: 'zenda.features.business', descKey: 'zenda.features.businessDesc' },
  { icon: '🎓', titleKey: 'zenda.features.education', descKey: 'zenda.features.educationDesc' },
  { icon: '🤖', titleKey: 'zenda.features.ai', descKey: 'zenda.features.aiDesc' },
  { icon: '🌍', titleKey: 'zenda.features.fx', descKey: 'zenda.features.fxDesc' },
  { icon: '📊', titleKey: 'zenda.features.health', descKey: 'zenda.features.healthDesc' },
] as const

const FAQ = [
  { qKey: 'zenda.faq.q1', aKey: 'zenda.faq.a1' },
  { qKey: 'zenda.faq.q2', aKey: 'zenda.faq.a2' },
  { qKey: 'zenda.faq.q3', aKey: 'zenda.faq.a3' },
] as const

export default function ZendaLanding() {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden cinematic-hero py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-medium border border-indigo-500/30">
                Zenda App
              </span>
              <LanguageSwitcher />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
              {t('zenda.hero.title')}
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed">{t('zenda.hero.subtitle')}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                {t('zenda.hero.download')}
              </a>
              <Link href="/contact" className="btn-secondary">
                {t('zenda.hero.contact')}
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-indigo-900/40 to-slate-900 p-6 ring-1 ring-white/10">
            <PhoneSlideshow
              images={[
                '/phone/iphone/0.png',
                '/phone/iphone/1.png',
                '/phone/iphone/2.png',
                '/phone/iphone/3.png',
              ]}
            />
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-center mb-12">{t('zenda.features.title')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.titleKey}
                className="p-6 rounded-2xl bg-slate-950/80 border border-white/5 hover:border-amber-400/30 transition-colors"
              >
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-4 text-lg font-semibold">{t(f.titleKey)}</h3>
                <p className="mt-2 text-slate-400 text-sm leading-relaxed">{t(f.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-bold">{t('zenda.pricing.title')}</h2>
          <p className="mt-4 text-slate-400">{t('zenda.pricing.subtitle')}</p>
          <div className="mt-10 p-8 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-amber-500/10 border border-indigo-500/30">
            <p className="text-4xl font-bold text-amber-400">10 000 Kz</p>
            <p className="text-slate-300 mt-2">{t('zenda.pricing.monthly')}</p>
            <p className="text-sm text-emerald-400 mt-4">{t('zenda.pricing.trial')}</p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">{t('zenda.faq.title')}</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <details key={item.qKey} className="p-4 rounded-xl bg-slate-950 border border-white/5 group">
                <summary className="font-semibold cursor-pointer">{t(item.qKey)}</summary>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">{t(item.aKey)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-white/5 text-center text-slate-500 text-sm">
        <Link href="/privacy-policy" className="hover:text-amber-300 mx-3">
          Privacy
        </Link>
        <Link href="/support" className="hover:text-amber-300 mx-3">
          Support
        </Link>
        <Link href="/delete-account" className="hover:text-amber-300 mx-3">
          Delete account
        </Link>
      </footer>
    </div>
  )
}
