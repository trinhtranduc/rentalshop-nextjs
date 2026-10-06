'use client'

/**
 * /affiliate (#582): public page (PUBLIC_ROUTES, sitemap), on the landing look — public header and
 * footer, white cards on the sky-to-slate wash. Copy lives in `affiliate.json` (en, vi).
 */
import React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertCircle, ArrowRight, CheckCircle, Copy, LifeBuoy, Link2, Share2, Sparkles } from 'lucide-react'
import PublicSiteHeader from '../components/PublicSiteHeader'
import PublicSiteFooter from '../components/PublicSiteFooter'

type SectionKey = 'whatIs' | 'howToGet' | 'howToUse' | 'howItWorks' | 'benefits' | 'bestPractices' | 'importantNotes' | 'troubleshooting'

const SECTIONS: Array<{ key: SectionKey; list?: string; ordered?: boolean; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'whatIs', icon: Link2 },
  { key: 'howToGet', list: 'steps', ordered: true, icon: Copy },
  { key: 'howToUse', list: 'methods', icon: Share2 },
  { key: 'howItWorks', list: 'steps', ordered: true, icon: ArrowRight },
  { key: 'benefits', list: 'items', icon: Sparkles },
  { key: 'bestPractices', list: 'tips', icon: CheckCircle },
  { key: 'importantNotes', list: 'notes', icon: AlertCircle },
  { key: 'troubleshooting', list: 'solutions', icon: LifeBuoy },
]

export default function AffiliatePage() {
  const t = useTranslations('affiliate')

  const items = (key: string): string[] => {
    const raw = t.raw(key) as unknown
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50">
      <PublicSiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <p className="mb-3 text-sm font-medium text-sky-700">{t('page.eyebrow')}</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">{t('subtitle')}</p>
        <p className="mt-2 text-sm text-slate-500">{t('lastUpdated')}</p>

        <div className="mt-10 flex flex-col gap-4">
          {SECTIONS.map(({ key, list, ordered, icon: Icon }) => {
            const rows = list ? items(`sections.${key}.${list}`) : []
            const ListTag = ordered ? 'ol' : 'ul'
            return (
              <section key={key} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-sky-50 text-sky-800">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">{t(`sections.${key}.title`)}</h2>
                    <p className="mt-1.5 leading-relaxed text-slate-600">{t(`sections.${key}.content`)}</p>
                    {rows.length > 0 && (
                      <ListTag className={`mt-3 space-y-1.5 pl-5 leading-relaxed text-slate-600 ${ordered ? 'list-decimal' : 'list-disc'}`}>
                        {rows.map((row) => (
                          <li key={row}>{row}</li>
                        ))}
                      </ListTag>
                    )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-sky-100 bg-white/90 p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{t('page.ctaTitle')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">{t('page.ctaBody')}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/settings"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-[15px] font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              {t('page.ctaButton')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/affiliate/guide"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-[15px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              {t('page.guideLink')}
            </Link>
          </div>
        </div>
      </main>

      <PublicSiteFooter />
    </div>
  )
}
