import type { Metadata } from 'next'
import Link from 'next/link'
import { Smartphone, Monitor, BarChart3 } from 'lucide-react'
import PublicSiteHeader from '../components/PublicSiteHeader'
import PublicSiteFooter from '../components/PublicSiteFooter'
import { StoreBadges } from '../components/StoreBadges'

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'

export const metadata: Metadata = {
  title: 'Tải ứng dụng AnyRent — iOS & Android | Phần mềm quản lý cho thuê',
  description:
    'Tải AnyRent trên App Store và Google Play. Quản lý cửa hàng cho thuê trên điện thoại hoặc Web Portal — đơn hàng, kho, lịch, khách hàng.',
  keywords: [
    'tải app AnyRent',
    'ứng dụng quản lý cho thuê',
    'AnyRent App Store',
    'AnyRent Google Play',
    'phần mềm cho thuê iOS',
    'app quản lý cửa hàng cho thuê',
  ],
  alternates: {
    canonical: '/download',
    languages: {
      'x-default': '/download',
      vi: '/vi/download',
      en: '/en/download',
      zh: '/zh/download',
      ko: '/ko/download',
      ja: '/ja/download',
    },
  },
  openGraph: {
    title: 'Tải ứng dụng AnyRent — iOS & Android',
    description:
      'Quản lý cửa hàng cho thuê mọi lúc trên iPhone, Android và Web Portal.',
    type: 'website',
    url: '/download',
    images: [{ url: '/anyrent-og.jpg', width: 1200, height: 630, alt: 'AnyRent app download' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tải ứng dụng AnyRent — iOS & Android',
    description: 'App Store + Google Play. Quản lý cho thuê trên di động và web.',
    images: ['/anyrent-og.jpg'],
  },
}

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Tải ứng dụng AnyRent',
  description:
    'Tải AnyRent trên App Store và Google Play. Quản lý cửa hàng cho thuê trên iOS, Android và Web.',
  url: `${BASE_URL}/download`,
  isPartOf: { '@type': 'WebSite', name: 'AnyRent', url: BASE_URL },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tải ứng dụng', item: `${BASE_URL}/download` },
    ],
  },
}

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AnyRent',
  applicationCategory: 'BusinessApplication',
  operatingSystem: ['iOS', 'Android', 'Web'],
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND' },
  url: `${BASE_URL}/download`,
  downloadUrl: [
    'https://apps.apple.com/vn/app/anyrent/id6754793592',
    'https://play.google.com/store/apps/details?id=anyrent.shop',
  ],
}

export default function DownloadPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50">
        <PublicSiteHeader />

        <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-medium text-sky-700">AnyRent · Đa nền tảng</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Tải ứng dụng AnyRent
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Quản lý cửa hàng cho thuê trên iPhone, Android hoặc trình duyệt. Đồng bộ đơn hàng, kho
            và lịch thuê theo thời gian thực.
          </p>

          <div className="mt-10 rounded-2xl border border-sky-100 bg-white/90 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Tải ngay</h2>
            <p className="mt-2 text-sm text-slate-600">
              Chọn cửa hàng phù hợp với thiết bị của bạn.
            </p>
            <div className="mt-6">
              <StoreBadges tone="dark" />
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Hoặc dùng thử{' '}
              <Link href="/register" className="font-medium text-sky-800 underline-offset-2 hover:underline">
                Web Portal
              </Link>{' '}
              ngay trên trình duyệt — không cần cài app.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Smartphone,
                title: 'Ứng dụng di động',
                desc: 'Tạo đơn, check tồn kho và lịch thuê ngay tại cửa hàng hoặc khi đang di chuyển.',
              },
              {
                icon: Monitor,
                title: 'Web Portal',
                desc: 'Đầy đủ báo cáo, cấu hình cửa hàng và quản lý đội ngũ trên máy tính.',
              },
              {
                icon: BarChart3,
                title: 'Đồng bộ mọi nơi',
                desc: 'Một tài khoản — dữ liệu đồng bộ giữa app iOS, Android và web.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-800">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-4 text-sm">
            <Link href="/pricing" className="font-medium text-sky-800 hover:underline">
              Xem bảng giá →
            </Link>
            <Link href="/features" className="font-medium text-sky-800 hover:underline">
              Tính năng →
            </Link>
            <Link
              href="/tim-san-pham-bang-hinh-anh"
              className="font-medium text-sky-800 hover:underline"
            >
              Tìm sản phẩm bằng hình ảnh AI →
            </Link>
          </div>
        </main>

        <PublicSiteFooter />
      </div>
    </>
  )
}
