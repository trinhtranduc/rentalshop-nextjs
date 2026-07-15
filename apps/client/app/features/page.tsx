import type { Metadata } from 'next';
import FeaturesClient from './FeaturesClient';

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop';

export const metadata: Metadata = {
  title: 'Tính năng Phần mềm Quản lý Cho thuê | AnyRent',
  description:
    'Khám phá tính năng phần mềm quản lý cửa hàng cho thuê AnyRent: quản lý đơn hàng, kho hàng, khách hàng, lịch đặt, báo cáo doanh thu. Hỗ trợ iOS và Web.',
  keywords: [
    'tính năng phần mềm quản lý cho thuê',
    'phần mềm quản lý cửa hàng cho thuê',
    'quản lý đơn hàng cho thuê',
    'quản lý kho cho thuê',
    'quản lý khách hàng cho thuê',
    'app quản lý cho thuê iOS',
    'AnyRent features',
  ],
  alternates: {
    canonical: '/features',
    languages: {
      'x-default': '/features',
      vi: '/vi/features',
      en: '/en/features',
      zh: '/zh/features',
      ko: '/ko/features',
      ja: '/ja/features',
    },
  },
  openGraph: {
    title: 'Tính năng Phần mềm Quản lý Cho thuê | AnyRent',
    description:
      'Quản lý đơn hàng, kho, khách hàng, lịch đặt và báo cáo doanh thu trên iOS và Web.',
    type: 'website',
    url: '/features',
    images: [
      {
        url: '/anyrent.png',
        width: 1200,
        height: 630,
        alt: 'AnyRent - Tính năng phần mềm quản lý cho thuê',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tính năng Phần mềm Quản lý Cho thuê | AnyRent',
    description:
      'Quản lý đơn hàng, kho, khách hàng, lịch đặt và báo cáo doanh thu trên iOS và Web.',
    images: ['/anyrent.png'],
  },
};

const featuresJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Tính năng AnyRent - Phần mềm Quản lý Cho thuê',
  description:
    'Trang tính năng phần mềm quản lý cửa hàng cho thuê AnyRent. Quản lý đơn hàng, kho hàng, khách hàng, lịch đặt, báo cáo doanh thu.',
  url: `${BASE_URL}/features`,
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
        name: 'Tính năng',
        item: `${BASE_URL}/features`,
      },
    ],
  },
};

export default function FeaturesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(featuresJsonLd) }}
      />
      <FeaturesClient />
    </>
  );
}
