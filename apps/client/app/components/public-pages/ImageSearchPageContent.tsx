import Link from 'next/link'
import Image from 'next/image'
import { Camera, Search, Zap, Brain } from 'lucide-react'
import type { PublicLocale } from '@rentalshop/constants'
import PublicSiteHeader from '../PublicSiteHeader'
import PublicSiteFooter from '../PublicSiteFooter'
import { StoreBadges } from '../StoreBadges'
import { faqJsonLd, publicPageJsonLd, publicPageMessages } from '../../../lib/public-content/public-pages'
import { publicHref } from '../../../lib/public-content/public-href'

/** #1114: the AI image search page in one public language; the copy lives in locales/{locale}/publicPages.json */
export default function ImageSearchPageContent({ locale }: { locale: PublicLocale }) {
  const t = publicPageMessages(locale).imageSearch
  const steps = [
    { icon: Camera, ...t.steps.snap },
    { icon: Search, ...t.steps.match },
    { icon: Zap, ...t.steps.instant },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(publicPageJsonLd(locale, 'image-search')) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd([[t.faq.q1, t.faq.a1], [t.faq.q2, t.faq.a2]])),
        }}
      />

      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50">
        <PublicSiteHeader />

        <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-sky-700">
                <Brain className="h-4 w-4" />
                {t.eyebrow}
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{t.title}</h1>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">{t.intro}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-xl bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-900"
                >
                  {t.tryFree}
                </Link>
                <Link
                  href={publicHref(locale, 'download')}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {t.download}
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="overflow-hidden rounded-[1.75rem] border border-white shadow-xl ring-1 ring-sky-100">
                <Image
                  src="/anyrent-ai-phone-results.png"
                  alt={t.imageAlt}
                  width={720}
                  height={1280}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
            </div>
          </div>

          <ol className="mt-16 grid gap-6 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <li key={title} className="rounded-xl border border-sky-100 bg-white p-6 shadow-sm">
                <span className="text-xs font-semibold text-sky-600">0{i + 1}</span>
                <div className="mt-3 mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-800">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
              </li>
            ))}
          </ol>

          <section className="mt-16 rounded-2xl border border-sky-100 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">{t.whyTitle}</h2>
            <ul className="mt-4 space-y-3 text-slate-600">
              <li>• {t.why1}</li>
              <li>• {t.why2}</li>
              <li>• {t.why3}</li>
            </ul>
            <div className="mt-8">
              <StoreBadges tone="dark" />
            </div>
          </section>

          <div className="mt-12 flex flex-wrap gap-4 text-sm">
            <Link href={publicHref(locale, 'features')} className="font-medium text-sky-800 hover:underline">
              {t.links.features}
            </Link>
            <Link href={publicHref(locale, 'pricing')} className="font-medium text-sky-800 hover:underline">
              {t.links.pricing}
            </Link>
            {/* The industry pages are Vietnamese only */}
            {locale === 'vi' && (
              <Link href={publicHref(locale, 'industry:cho-thue-ao-dai')} className="font-medium text-sky-800 hover:underline">
                {t.links.aoDai}
              </Link>
            )}
          </div>
        </main>

        <PublicSiteFooter />
      </div>
    </>
  )
}
