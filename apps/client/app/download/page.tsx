import type { Metadata } from 'next'
import DownloadPageContent from '../components/public-pages/DownloadPageContent'
import { publicPageAlternates } from '../../lib/public-content/public-pages'

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
  // #1114: the localized siblings of this page
  alternates: { canonical: '/download', languages: publicPageAlternates('download') },
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

export default function DownloadPage() {
  return <DownloadPageContent locale="vi" />
}
