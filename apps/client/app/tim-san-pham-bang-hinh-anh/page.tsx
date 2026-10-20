import type { Metadata } from 'next'
import ImageSearchPageContent from '../components/public-pages/ImageSearchPageContent'
import { publicPageAlternates } from '../../lib/public-content/public-pages'

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
  // #1114: the localized siblings of this page
  alternates: { canonical: PATH, languages: publicPageAlternates('image-search') },
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

export default function AiImageSearchPage() {
  return <ImageSearchPageContent locale="vi" />
}
