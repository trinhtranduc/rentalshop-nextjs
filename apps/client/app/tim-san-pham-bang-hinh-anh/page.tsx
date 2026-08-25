import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Camera, Search, Zap, Brain } from 'lucide-react'
import PublicSiteHeader from '../components/PublicSiteHeader'
import PublicSiteFooter from '../components/PublicSiteFooter'
import { StoreBadges } from '../components/StoreBadges'

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'
const PATH = '/tim-san-pham-bang-hinh-anh'

export const metadata: Metadata = {
  title: 'Tìm sản phẩm cho thuê bằng hình ảnh AI | AnyRent',
  description:
    'AI Image Search của AnyRent: chụp ảnh áo dài, áo cưới hoặc thiết bị — tìm ngay sản phẩm tương tự trong kho, kèm tồn kho và giá thuê.',
  keywords: [
    'tìm sản phẩm bằng hình ảnh',
    'AI image search cho thuê',
    'tìm áo dài bằng ảnh',
    'AnyRent AI',
    'phần mềm cho thuê AI',
    'nhận diện hình ảnh cho thuê',
  ],
  alternates: {
    canonical: PATH,
    languages: {
      'x-default': PATH,
      vi: `/vi${PATH}`,
      en: `/en${PATH}`,
      zh: `/zh${PATH}`,
      ko: `/ko${PATH}`,
      ja: `/ja${PATH}`,
    },
  },
  openGraph: {
    title: 'Tìm sản phẩm cho thuê bằng hình ảnh AI | AnyRent',
    description:
      'Chụp ảnh → AI tìm sản phẩm tương tự trong kho. Tồn kho và giá thuê hiện ngay.',
    type: 'website',
    url: PATH,
    images: [
      {
        url: '/anyrent-ai-phone-results.png',
        width: 720,
        height: 1280,
        alt: 'AnyRent AI Image Search',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tìm sản phẩm cho thuê bằng hình ảnh AI | AnyRent',
    description: 'Chụp ảnh — AI tìm sản phẩm tương tự trong kho cửa hàng cho thuê.',
    images: ['/anyrent-ai-phone-results.png'],
  },
}

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Tìm sản phẩm cho thuê bằng hình ảnh AI',
  description:
    'Tính năng AI Image Search của AnyRent giúp tìm sản phẩm cho thuê bằng ảnh chụp.',
  url: `${BASE_URL}${PATH}`,
  isPartOf: { '@type': 'WebSite', name: 'AnyRent', url: BASE_URL },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: BASE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Tìm sản phẩm bằng hình ảnh AI',
        item: `${BASE_URL}${PATH}`,
      },
    ],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Tìm sản phẩm bằng hình ảnh AI hoạt động thế nào?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Khách hoặc nhân viên chụp/tải ảnh mẫu. AnyRent dùng AI embedding để so khớp với ảnh sản phẩm trong kho và trả về các món tương tự kèm tình trạng còn hàng và giá thuê.',
      },
    },
    {
      '@type': 'Question',
      name: 'AI Image Search phù hợp ngành nào?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Đặc biệt hiệu quả với cho thuê áo dài, áo cưới, trang phục và thiết bị — khi khách nhớ kiểu dáng hơn là tên mã sản phẩm.',
      },
    },
  ],
}

const steps = [
  {
    icon: Camera,
    title: 'Chụp ảnh tìm sản phẩm',
    desc: 'Chụp hoặc tải ảnh mẫu áo dài, áo cưới, trang phục — không cần nhớ tên hay barcode.',
  },
  {
    icon: Search,
    title: 'Nhận diện thông minh bằng AI',
    desc: 'Vector embedding phân tích màu, kiểu dáng, chất liệu để gợi ý sản phẩm gần nhất trong kho.',
  },
  {
    icon: Zap,
    title: 'Kết quả tức thì',
    desc: 'Vài giây có danh sách khớp kèm tồn kho và giá thuê — sẵn sàng tạo đơn.',
  },
]

export default function AiImageSearchPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50">
        <PublicSiteHeader />

        <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-sky-700">
                <Brain className="h-4 w-4" />
                Trí tuệ nhân tạo · AI Image Search
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Tìm sản phẩm cho thuê bằng hình ảnh AI
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Khách chỉ cần một bức ảnh — AnyRent tìm sản phẩm tương tự trong kho, kèm tình trạng
                còn hàng và giá thuê. Không cần nhớ tên mã hay gõ từ khóa.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-xl bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-900"
                >
                  Dùng thử miễn phí
                </Link>
                <Link
                  href="/download"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Tải ứng dụng
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="overflow-hidden rounded-[1.75rem] border border-white shadow-xl ring-1 ring-sky-100">
                <Image
                  src="/anyrent-ai-phone-results.png"
                  alt="Màn hình AnyRent hiển thị kết quả tìm bằng ảnh AI"
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
              <li
                key={title}
                className="rounded-xl border border-sky-100 bg-white p-6 shadow-sm"
              >
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
            <h2 className="text-2xl font-bold text-slate-900">Vì sao shop cho thuê cần AI Image Search?</h2>
            <ul className="mt-4 space-y-3 text-slate-600">
              <li>• Khách nhớ kiểu dáng, màu sắc — không nhớ mã sản phẩm.</li>
              <li>• Nhân viên tìm hàng nhanh hơn khi cửa hàng đông.</li>
              <li>• Giảm nhầm size/mẫu khi kho lớn (áo dài, áo cưới, trang phục).</li>
            </ul>
            <div className="mt-8">
              <StoreBadges tone="dark" />
            </div>
          </section>

          <div className="mt-12 flex flex-wrap gap-4 text-sm">
            <Link href="/features" className="font-medium text-sky-800 hover:underline">
              Tất cả tính năng →
            </Link>
            <Link href="/pricing" className="font-medium text-sky-800 hover:underline">
              Bảng giá →
            </Link>
            <Link href="/cho-thue-ao-dai" className="font-medium text-sky-800 hover:underline">
              Cho thuê áo dài →
            </Link>
          </div>
        </main>

        <PublicSiteFooter />
      </div>
    </>
  )
}
