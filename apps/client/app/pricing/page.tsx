import type { Metadata } from 'next';
import PricingClient from './PricingClient';

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop';

export const metadata: Metadata = {
  title: 'Bảng giá Phần mềm Quản lý Cho thuê | AnyRent',
  description:
    'Bảng giá AnyRent - Phần mềm quản lý cửa hàng cho thuê. Gói Basic, Professional, Enterprise. Dùng thử miễn phí 14 ngày. Giá chỉ từ 99.000đ/tháng.',
  keywords: [
    'bảng giá phần mềm quản lý cho thuê',
    'giá AnyRent',
    'phần mềm cho thuê giá rẻ',
    'gói subscription quản lý cho thuê',
    'dùng thử phần mềm cho thuê miễn phí',
    'AnyRent pricing',
  ],
  alternates: {
    canonical: '/pricing',
    languages: {
      'x-default': '/pricing',
      vi: '/vi/pricing',
      en: '/en/pricing',
      zh: '/zh/pricing',
      ko: '/ko/pricing',
      ja: '/ja/pricing',
    },
  },
  openGraph: {
    title: 'Bảng giá Phần mềm Quản lý Cho thuê | AnyRent',
    description:
      'Gói Basic, Professional, Enterprise. Dùng thử miễn phí 14 ngày. Giá chỉ từ 99.000đ/tháng.',
    type: 'website',
    url: '/pricing',
    images: [
      {
        url: '/anyrent-iphone-product.jpg',
        width: 1200,
        height: 630,
        alt: 'AnyRent - Bảng giá phần mềm quản lý cho thuê',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bảng giá Phần mềm Quản lý Cho thuê | AnyRent',
    description:
      'Gói Basic, Professional, Enterprise. Dùng thử miễn phí 14 ngày. Giá chỉ từ 99.000đ/tháng.',
    images: ['/anyrent-iphone-product.jpg'],
  },
};

const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Bảng giá AnyRent - Phần mềm Quản lý Cho thuê',
  description:
    'Bảng giá phần mềm quản lý cửa hàng cho thuê AnyRent. Gói Basic, Professional, Enterprise.',
  url: `${BASE_URL}/pricing`,
  isPartOf: {
    '@type': 'WebSite',
    name: 'AnyRent',
    url: BASE_URL,
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Trang chủ',
        item: BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Bảng giá',
        item: `${BASE_URL}/pricing`,
      },
    ],
  },
};

const pricingFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Phần mềm quản lý cho thuê AnyRent có miễn phí không?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AnyRent cung cấp 14 ngày dùng thử miễn phí với đầy đủ tính năng. Sau đó bạn có thể chọn gói phù hợp từ 99.000đ/tháng.',
      },
    },
    {
      '@type': 'Question',
      name: 'Tôi có thể nâng cấp gói sau không?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Có, bạn có thể nâng cấp gói bất cứ lúc nào. Thanh toán sẽ được tính theo tỷ lệ và bạn sẽ có quyền truy cập ngay các tính năng cao hơn.',
      },
    },
    {
      '@type': 'Question',
      name: 'Chuyện gì xảy ra nếu tôi vượt giới hạn gói?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Nếu bạn vượt giới hạn gói, bạn sẽ cần nâng cấp lên gói cao hơn. Chúng tôi sẽ thông báo khi bạn gần đạt giới hạn.',
      },
    },
  ],
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqJsonLd) }}
      />
      <PricingClient />
    </>
  );
}
