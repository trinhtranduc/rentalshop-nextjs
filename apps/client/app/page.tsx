import type { Metadata } from 'next';
import LandingPageClient from './LandingPageClient';

/**
 * Server Component wrapper for the Landing Page
 * 
 * Purpose: Render JSON-LD structured data server-side for SEO crawlers.
 * The landing page content remains a client component for interactivity,
 * but critical SEO schemas are now in the initial HTML response.
 */

const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop';

// FAQ data (static, used for FAQ schema)
const faqItems = [
  {
    question: 'Phần mềm quản lý cửa hàng cho thuê AnyRent có miễn phí không?',
    answer: 'AnyRent cung cấp gói Basic miễn phí 14 ngày dùng thử với đầy đủ tính năng cơ bản. Sau đó bạn có thể chọn gói phù hợp với nhu cầu kinh doanh.',
  },
  {
    question: 'Tôi có thể sử dụng phần mềm quản lý cửa hàng cho thuê trên nhiều thiết bị không?',
    answer: 'Có, AnyRent hỗ trợ đa nền tảng. Bạn có thể sử dụng trên iOS (iPhone/iPad) và truy cập Web Portal từ bất kỳ trình duyệt nào.',
  },
  {
    question: 'Dữ liệu quản lý cửa hàng cho thuê của tôi có an toàn không?',
    answer: 'Hoàn toàn an toàn. AnyRent sử dụng mã hóa SSL, sao lưu dữ liệu tự động hàng ngày, và tuân thủ các tiêu chuẩn bảo mật quốc tế.',
  },
  {
    question: 'Bạn có cung cấp hỗ trợ khách hàng cho hệ thống quản lý cho thuê không?',
    answer: 'Có, chúng tôi cung cấp hỗ trợ 24/7 qua WhatsApp, Zalo, Telegram và Email. Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ bạn.',
  },
];

// JSON-LD Schemas (rendered server-side for SEO)
const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AnyRent',
  applicationCategory: 'BusinessApplication',
  operatingSystem: ['iOS', 'Web'],
  offers: {
    '@type': 'Offer',
    price: '99000',
    priceCurrency: 'VND',
    priceValidUntil: '2027-12-31',
  },
  description: 'Phần mềm quản lý cửa hàng cho thuê hàng đầu tại Việt Nam. Hệ thống quản lý cho thuê toàn diện phù hợp cho nhiều ngành nghề.',
  url: BASE_URL,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '500',
    bestRating: '5',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AnyRent',
  url: BASE_URL,
  logo: `${BASE_URL}/anyrent-logo-light.svg`,
  description: 'Phần mềm quản lý cửa hàng cho thuê hàng đầu tại Việt Nam.',
  sameAs: [
    'https://apps.apple.com/vn/app/anyrent/id6754793592',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    telephone: '+84764774647',
    email: 'trinhduc20@gmail.com',
    availableLanguage: ['Vietnamese', 'English'],
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map(item => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AnyRent',
  url: BASE_URL,
  description: 'Phần mềm quản lý cửa hàng cho thuê áo dài, áo cưới, trang thiết bị hàng đầu Việt Nam.',
  inLanguage: ['vi', 'en'],
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/blog?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AnyRent - Phần mềm quản lý cho thuê',
  url: BASE_URL,
  description: 'Giải pháp quản lý cửa hàng cho thuê áo dài, áo cưới, trang thiết bị, xe, trang phục biểu diễn tại Việt Nam.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: ['iOS', 'Web'],
  availableOnDevice: ['Mobile', 'Desktop', 'Tablet'],
  countriesSupported: 'VN',
  softwareVersion: '1.0.6',
};

export default function Page() {
  return (
    <>
      {/* Server-rendered JSON-LD for SEO (visible to crawlers in initial HTML) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      
      {/* Client-side landing page with full interactivity */}
      <LandingPageClient />
    </>
  );
}
