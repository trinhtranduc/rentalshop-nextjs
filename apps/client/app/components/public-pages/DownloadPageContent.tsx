import Link from 'next/link'
import { Smartphone, Monitor, BarChart3 } from 'lucide-react'
import type { PublicLocale } from '@rentalshop/constants'
import PublicSiteHeader from '../PublicSiteHeader'
import PublicSiteFooter from '../PublicSiteFooter'
import { StoreBadges } from '../StoreBadges'
import { publicPageMessages, publicPageJsonLd } from '../../../lib/public-content/public-pages'
import { publicHref } from '../../../lib/public-content/public-href'

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'

/** #1114: the download page in one public language; the copy lives in locales/{locale}/publicPages.json */
export default function DownloadPageContent({ locale }: { locale: PublicLocale }) {
  const t = publicPageMessages(locale).download
  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AnyRent',
    applicationCategory: 'BusinessApplication',
    operatingSystem: ['iOS', 'Android', 'Web'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND' },
    url: `${BASE_URL}${publicHref(locale, 'download')}`,
    downloadUrl: [
      'https://apps.apple.com/vn/app/anyrent/id6754793592',
      'https://play.google.com/store/apps/details?id=anyrent.shop',
    ],
  }
  const cards = [
    { icon: Smartphone, ...t.cards.mobile },
    { icon: Monitor, ...t.cards.web },
    { icon: BarChart3, ...t.cards.sync },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(publicPageJsonLd(locale, 'download')) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50">
        <PublicSiteHeader />

        <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-medium text-sky-700">{t.eyebrow}</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{t.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">{t.intro}</p>

          <div className="mt-10 rounded-2xl border border-sky-100 bg-white/90 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t.getTitle}</h2>
            <p className="mt-2 text-sm text-slate-600">{t.getSubtitle}</p>
            <div className="mt-6">
              <StoreBadges tone="dark" />
            </div>
            <p className="mt-6 text-sm text-slate-500">
              {t.webPrefix}{' '}
              <Link href="/register" className="font-medium text-sky-800 underline-offset-2 hover:underline">
                {t.webPortal}
              </Link>{' '}
              {t.webSuffix}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {cards.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-800">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-4 text-sm">
            <Link href={publicHref(locale, 'pricing')} className="font-medium text-sky-800 hover:underline">
              {t.links.pricing}
            </Link>
            <Link href={publicHref(locale, 'features')} className="font-medium text-sky-800 hover:underline">
              {t.links.features}
            </Link>
            <Link href={publicHref(locale, 'image-search')} className="font-medium text-sky-800 hover:underline">
              {t.links.imageSearch}
            </Link>
          </div>
        </main>

        <PublicSiteFooter />
      </div>
    </>
  )
}
