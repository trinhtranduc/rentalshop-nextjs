import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import ClientLayout from './components/ClientLayout'
import { ToastProvider } from './providers/ToastProvider'
import './globals.css'
import Script from 'next/script'

// Static imports - All locale files (build-time optimization)
import enCommon from '../../../locales/en/common.json';
import enAuth from '../../../locales/en/auth.json';
import enDashboard from '../../../locales/en/dashboard.json';
import enOrders from '../../../locales/en/orders.json';
import enProducts from '../../../locales/en/products.json';
import enCustomers from '../../../locales/en/customers.json';
import enSettings from '../../../locales/en/settings.json';
import enValidation from '../../../locales/en/validation.json';
import enErrors from '../../../locales/en/errors.json';
import enUsers from '../../../locales/en/users.json';
import enOutlets from '../../../locales/en/outlets.json';
import enCategories from '../../../locales/en/categories.json';
import enCalendar from '../../../locales/en/calendar.json';
import enPlans from '../../../locales/en/plans.json';
import enSubscription from '../../../locales/en/subscription.json';
import enLanding from '../../../locales/en/landing.json';
import enBankAccounts from '../../../locales/en/bankAccounts.json';

import viCommon from '../../../locales/vi/common.json';
import viAuth from '../../../locales/vi/auth.json';
import viDashboard from '../../../locales/vi/dashboard.json';
import viOrders from '../../../locales/vi/orders.json';
import viProducts from '../../../locales/vi/products.json';
import viCustomers from '../../../locales/vi/customers.json';
import viSettings from '../../../locales/vi/settings.json';
import viValidation from '../../../locales/vi/validation.json';
import viErrors from '../../../locales/vi/errors.json';
import viUsers from '../../../locales/vi/users.json';
import viOutlets from '../../../locales/vi/outlets.json';
import viCategories from '../../../locales/vi/categories.json';
import viCalendar from '../../../locales/vi/calendar.json';
import viPlans from '../../../locales/vi/plans.json';
import viSubscription from '../../../locales/vi/subscription.json';
import viLanding from '../../../locales/vi/landing.json';
import viBankAccounts from '../../../locales/vi/bankAccounts.json';

// Import new locale files (Chinese, Korean, Japanese)
import zhCommon from '../../../locales/zh/common.json';
import zhAuth from '../../../locales/zh/auth.json';
import zhLanding from '../../../locales/zh/landing.json';
import zhPlans from '../../../locales/zh/plans.json';
import koCommon from '../../../locales/ko/common.json';
import koAuth from '../../../locales/ko/auth.json';
import koLanding from '../../../locales/ko/landing.json';
import koPlans from '../../../locales/ko/plans.json';
import jaCommon from '../../../locales/ja/common.json';
import jaAuth from '../../../locales/ja/auth.json';
import jaLanding from '../../../locales/ja/landing.json';
import jaPlans from '../../../locales/ja/plans.json';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

// Generate metadata based on locale
export async function generateMetadata(): Promise<Metadata> {
  // Get locale from cookies (same logic as RootLayout)
  let locale: 'en' | 'vi' | 'zh' | 'ko' | 'ja' = 'vi';
  
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE');
    
    if (localeCookie?.value && ['en', 'vi', 'zh', 'ko', 'ja'].includes(localeCookie.value)) {
      locale = localeCookie.value as 'en' | 'vi' | 'zh' | 'ko' | 'ja';
    }
  } catch (error) {
    // Fallback to Vietnamese
    locale = 'vi';
  }

  // Vietnamese metadata
  if (locale === 'vi') {
    return {
      title: {
        default: 'AnyRent - Phần mềm Quản lý Cửa hàng Cho thuê Chuyên nghiệp',
        template: '%s | AnyRent',
      },
      description: 'Phần mềm quản lý cửa hàng cho thuê hàng đầu tại Việt Nam. Hệ thống quản lý cho thuê toàn diện với quản lý đơn hàng cho thuê, quản lý kho cho thuê và quản lý khách hàng. Hỗ trợ đa nền tảng iOS, Android và Web.',
      keywords: [
        'phần mềm quản lý cửa hàng cho thuê',
        'hệ thống quản lý cho thuê',
        'quản lý đơn hàng cho thuê',
        'quản lý kho cho thuê',
        'quản lý khách hàng',
        'phần mềm cho thuê',
        'hệ thống quản lý cửa hàng',
        'phần mềm quản lý cho thuê áo dài',
        'phần mềm quản lý cho thuê áo cưới',
        'phần mềm quản lý cho thuê trang thiết bị',
        'phần mềm quản lý cho thuê xe',
        'phần mềm quản lý cho thuê trang phục biểu diễn',
        'phần mềm quản lý cho thuê máy in',
        'quản lý cho thuê áo dài',
        'quản lý cho thuê áo cưới',
        'quản lý cho thuê trang thiết bị',
        'quản lý cho thuê xe',
        'quản lý cho thuê trang phục',
        'quản lý cho thuê máy in',
        'AnyRent',
      ],
      authors: [{ name: 'AnyRent Team' }],
      creator: 'AnyRent',
      publisher: 'AnyRent',
      formatDetection: {
        email: false,
        address: false,
        telephone: false,
      },
      metadataBase: new URL(process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'),
      alternates: {
        canonical: '/',
        languages: {
          'vi': '/vi',
          'en': '/en',
          'zh': '/zh',
          'ko': '/ko',
          'ja': '/ja',
        },
      },
      openGraph: {
        type: 'website',
        locale: 'vi_VN',
        alternateLocale: ['en_US', 'zh_CN', 'ko_KR', 'ja_JP'],
        url: '/',
        siteName: 'AnyRent',
        title: 'AnyRent - Phần mềm Quản lý Cửa hàng Cho thuê Chuyên nghiệp',
        description: 'Phần mềm quản lý cửa hàng cho thuê hàng đầu tại Việt Nam. Hệ thống quản lý cho thuê toàn diện với quản lý đơn hàng cho thuê, quản lý kho cho thuê và quản lý khách hàng.',
        images: [
          {
            url: '/anyrent-logo-light.svg',
            width: 1200,
            height: 630,
            alt: 'AnyRent - Phần mềm Quản lý Cửa hàng Cho thuê',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'AnyRent - Phần mềm Quản lý Cửa hàng Cho thuê',
        description: 'Phần mềm quản lý cửa hàng cho thuê hàng đầu tại Việt Nam. Hệ thống quản lý cho thuê toàn diện.',
        images: ['/anyrent-logo-light.svg'],
        creator: '@anyrent',
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      icons: {
        icon: [
          { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
          { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
          { url: '/favicon.ico', sizes: 'any' },
        ],
        apple: [
          { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      manifest: '/manifest.json',
      themeColor: '#3b82f6',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'AnyRent',
      },
      verification: {
        google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
        yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
        yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
      },
    };
  }

  // Chinese metadata
  if (locale === 'zh') {
    return {
      title: {
        default: 'AnyRent - 租赁店管理软件与系统',
        template: '%s | AnyRent',
      },
      description: '领先的租赁店管理软件和租赁管理系统。适用于各种租赁业务的综合解决方案：旗袍租赁、婚纱租赁、设备租赁、车辆租赁、演出服装租赁、打印机租赁管理。',
      keywords: [
        '租赁店管理软件',
        '租赁管理系统',
        '租赁订单管理',
        '租赁库存管理',
        '客户管理',
        '租赁软件',
        '商店管理系统',
        '旗袍租赁管理软件',
        '婚纱租赁管理',
        '设备租赁管理软件',
        '车辆租赁管理软件',
        '衣装租赁管理软件',
        '打印机租赁管理软件',
        'AnyRent',
      ],
      authors: [{ name: 'AnyRent Team' }],
      creator: 'AnyRent',
      publisher: 'AnyRent',
      formatDetection: {
        email: false,
        address: false,
        telephone: false,
      },
      metadataBase: new URL(process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'),
      alternates: {
        canonical: '/',
        languages: {
          'vi': '/vi',
          'en': '/en',
          'zh': '/zh',
          'ko': '/ko',
          'ja': '/ja',
        },
      },
      openGraph: {
        type: 'website',
        locale: 'zh_CN',
        alternateLocale: ['vi_VN', 'en_US', 'ko_KR', 'ja_JP'],
        url: '/',
        siteName: 'AnyRent',
        title: 'AnyRent - 租赁店管理软件与系统',
        description: '领先的租赁店管理软件和租赁管理系统。适用于各种租赁业务的综合解决方案。',
        images: [
          {
            url: '/anyrent-logo-light.svg',
            width: 1200,
            height: 630,
            alt: 'AnyRent - 租赁店管理软件',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'AnyRent - 租赁店管理软件',
        description: '领先的租赁店管理软件和租赁管理系统。',
        images: ['/anyrent-logo-light.svg'],
        creator: '@anyrent',
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      icons: {
        icon: [
          { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
          { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
          { url: '/favicon.ico', sizes: 'any' },
        ],
        apple: [
          { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      manifest: '/manifest.json',
      themeColor: '#3b82f6',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'AnyRent',
      },
      verification: {
        google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
        yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
        yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
      },
    };
  }

  // Korean metadata
  if (locale === 'ko') {
    return {
      title: {
        default: 'AnyRent - 렌탈샵 관리 소프트웨어 및 시스템',
        template: '%s | AnyRent',
      },
      description: '선도적인 렌탈샵 관리 소프트웨어 및 렌탈 관리 시스템. 다양한 렌탈 비즈니스를 위한 포괄적인 솔루션: 아오자이 렌탈, 웨딩드레스 렌탈, 장비 렌탈, 차량 렌탈, 공연 의상 렌탈, 프린터 렌탈 관리.',
      keywords: [
        '렌탈샵 관리 소프트웨어',
        '렌탈 관리 시스템',
        '렌탈 주문 관리',
        '렌탈 재고 관리',
        '고객 관리',
        '렌탈 소프트웨어',
        '매장 관리 시스템',
        '아오자이 렌탈 관리 소프트웨어',
        '웨딩드레스 렌탈 관리',
        '장비 렌탈 관리 소프트웨어',
        '차량 렌탈 관리 소프트웨어',
        '의상 렌탈 관리 소프트웨어',
        '프린터 렌탈 관리 소프트웨어',
        'AnyRent',
      ],
      authors: [{ name: 'AnyRent Team' }],
      creator: 'AnyRent',
      publisher: 'AnyRent',
      formatDetection: {
        email: false,
        address: false,
        telephone: false,
      },
      metadataBase: new URL(process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'),
      alternates: {
        canonical: '/',
        languages: {
          'vi': '/vi',
          'en': '/en',
          'zh': '/zh',
          'ko': '/ko',
          'ja': '/ja',
        },
      },
      openGraph: {
        type: 'website',
        locale: 'ko_KR',
        alternateLocale: ['vi_VN', 'en_US', 'zh_CN', 'ja_JP'],
        url: '/',
        siteName: 'AnyRent',
        title: 'AnyRent - 렌탈샵 관리 소프트웨어 및 시스템',
        description: '선도적인 렌탈샵 관리 소프트웨어 및 렌탈 관리 시스템. 다양한 렌탈 비즈니스를 위한 포괄적인 솔루션.',
        images: [
          {
            url: '/anyrent-logo-light.svg',
            width: 1200,
            height: 630,
            alt: 'AnyRent - 렌탈샵 관리 소프트웨어',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'AnyRent - 렌탈샵 관리 소프트웨어',
        description: '선도적인 렌탈샵 관리 소프트웨어 및 렌탈 관리 시스템.',
        images: ['/anyrent-logo-light.svg'],
        creator: '@anyrent',
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      icons: {
        icon: [
          { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
          { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
          { url: '/favicon.ico', sizes: 'any' },
        ],
        apple: [
          { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      manifest: '/manifest.json',
      themeColor: '#3b82f6',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'AnyRent',
      },
      verification: {
        google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
        yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
        yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
      },
    };
  }

  // Japanese metadata
  if (locale === 'ja') {
    return {
      title: {
        default: 'AnyRent - レンタルショップ管理ソフトウェアとシステム',
        template: '%s | AnyRent',
      },
      description: 'トップクラスのレンタルショップ管理ソフトウェアとレンタル管理システム。様々なレンタル事業に対応する包括的なソリューション：アオザイレンタル、ウェディングドレスレンタル、設備レンタル、車両レンタル、衣装レンタル、プリンターレンタル管理。',
      keywords: [
        'レンタルショップ管理ソフトウェア',
        'レンタル管理システム',
        'レンタル注文管理',
        'レンタル在庫管理',
        '顧客管理',
        'レンタルソフトウェア',
        '店舗管理システム',
        'アオザイレンタル管理ソフトウェア',
        'ウェディングドレスレンタル管理',
        '設備レンタル管理ソフトウェア',
        '車両レンタル管理ソフトウェア',
        '衣装レンタル管理ソフトウェア',
        'プリンターレンタル管理ソフトウェア',
        'AnyRent',
      ],
      authors: [{ name: 'AnyRent Team' }],
      creator: 'AnyRent',
      publisher: 'AnyRent',
      formatDetection: {
        email: false,
        address: false,
        telephone: false,
      },
      metadataBase: new URL(process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'),
      alternates: {
        canonical: '/',
        languages: {
          'vi': '/vi',
          'en': '/en',
          'zh': '/zh',
          'ko': '/ko',
          'ja': '/ja',
        },
      },
      openGraph: {
        type: 'website',
        locale: 'ja_JP',
        alternateLocale: ['vi_VN', 'en_US', 'zh_CN', 'ko_KR'],
        url: '/',
        siteName: 'AnyRent',
        title: 'AnyRent - レンタルショップ管理ソフトウェアとシステム',
        description: 'トップクラスのレンタルショップ管理ソフトウェアとレンタル管理システム。様々なレンタル事業に対応する包括的なソリューション。',
        images: [
          {
            url: '/anyrent-logo-light.svg',
            width: 1200,
            height: 630,
            alt: 'AnyRent - レンタルショップ管理ソフトウェア',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'AnyRent - レンタルショップ管理ソフトウェア',
        description: 'トップクラスのレンタルショップ管理ソフトウェアとレンタル管理システム。',
        images: ['/anyrent-logo-light.svg'],
        creator: '@anyrent',
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      icons: {
        icon: [
          { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
          { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
          { url: '/favicon.ico', sizes: 'any' },
        ],
        apple: [
          { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      manifest: '/manifest.json',
      themeColor: '#3b82f6',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'AnyRent',
      },
      verification: {
        google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
        yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
        yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
      },
    };
  }

  // English metadata (default fallback)
  return {
    title: {
      default: 'AnyRent - Rental Shop Management Software & System',
      template: '%s | AnyRent',
    },
    description: 'Leading rental shop management software in Vietnam. Comprehensive rental management system with rental order management, rental inventory management, and customer management. Multi-platform support for iOS, Android, and Web.',
    keywords: [
      'rental shop management software',
      'rental management system',
      'rental order management',
      'rental inventory management',
      'customer management',
      'rental software',
      'shop management system',
      'ao dai rental management software',
      'wedding dress rental management',
      'equipment rental management software',
      'vehicle rental management software',
      'costume rental management software',
      'printer rental management software',
      'dress rental management',
      'equipment rental software',
      'vehicle rental software',
      'costume rental software',
      'printer rental software',
      'AnyRent',
    ],
    authors: [{ name: 'AnyRent Team' }],
    creator: 'AnyRent',
    publisher: 'AnyRent',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'),
    alternates: {
      canonical: '/',
      languages: {
        'vi': '/vi',
        'en': '/en',
        'zh': '/zh',
        'ko': '/ko',
        'ja': '/ja',
      },
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      alternateLocale: ['vi_VN', 'zh_CN', 'ko_KR', 'ja_JP'],
      url: '/',
      siteName: 'AnyRent',
      title: 'AnyRent - Rental Shop Management Software & System',
      description: 'Leading rental shop management software in Vietnam. Comprehensive rental management system with rental order management, rental inventory management, and customer management.',
      images: [
        {
          url: '/anyrent-logo-light.svg',
          width: 1200,
          height: 630,
          alt: 'AnyRent - Rental Shop Management Software',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'AnyRent - Rental Shop Management Software',
      description: 'Leading rental shop management software in Vietnam. Comprehensive rental management system.',
      images: ['/anyrent-logo-light.svg'],
      creator: '@anyrent',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
      title: 'AnyRent',
  },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
      yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
      yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
    },
  };
}

// Combine all messages by locale
const messages = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    orders: enOrders,
    products: enProducts,
    customers: enCustomers,
    settings: enSettings,
    validation: enValidation,
    errors: enErrors,
    users: enUsers,
    outlets: enOutlets,
    categories: enCategories,
    calendar: enCalendar,
    plans: enPlans,
    subscription: enSubscription,
    landing: enLanding,
    bankAccounts: enBankAccounts,
  },
  vi: {
    common: viCommon,
    auth: viAuth,
    dashboard: viDashboard,
    orders: viOrders,
    products: viProducts,
    customers: viCustomers,
    settings: viSettings,
    validation: viValidation,
    errors: viErrors,
    users: viUsers,
    outlets: viOutlets,
    categories: viCategories,
    calendar: viCalendar,
    plans: viPlans,
    subscription: viSubscription,
    landing: viLanding,
    bankAccounts: viBankAccounts,
  },
  // Chinese (Simplified) - Landing page only
  zh: {
    common: zhCommon,
    auth: zhAuth,
    landing: zhLanding,
    plans: zhPlans,
    // Fallback to English for other sections
    dashboard: enDashboard,
    orders: enOrders,
    products: enProducts,
    customers: enCustomers,
    settings: enSettings,
    validation: enValidation,
    errors: enErrors,
    users: enUsers,
    outlets: enOutlets,
    categories: enCategories,
    calendar: enCalendar,
    subscription: enSubscription,
    bankAccounts: enBankAccounts,
  },
  // Korean - Landing page only
  ko: {
    common: koCommon,
    auth: koAuth,
    landing: koLanding,
    plans: koPlans,
    // Fallback to English for other sections
    dashboard: enDashboard,
    orders: enOrders,
    products: enProducts,
    customers: enCustomers,
    settings: enSettings,
    validation: enValidation,
    errors: enErrors,
    users: enUsers,
    outlets: enOutlets,
    categories: enCategories,
    calendar: enCalendar,
    subscription: enSubscription,
    bankAccounts: enBankAccounts,
  },
  // Japanese - Landing page only
  ja: {
    common: jaCommon,
    auth: jaAuth,
    landing: jaLanding,
    plans: jaPlans,
    // Fallback to English for other sections
    dashboard: enDashboard,
    orders: enOrders,
    products: enProducts,
    customers: enCustomers,
    settings: enSettings,
    validation: enValidation,
    errors: enErrors,
    users: enUsers,
    outlets: enOutlets,
    categories: enCategories,
    calendar: enCalendar,
    subscription: enSubscription,
    bankAccounts: enBankAccounts,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ READ COOKIE SERVER-SIDE - No flash, correct locale from start
  // Default to Vietnamese for Vietnam market
  let locale: 'en' | 'vi' | 'zh' | 'ko' | 'ja' = 'vi';
  
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE');
    
    if (localeCookie?.value && ['en', 'vi', 'zh', 'ko', 'ja'].includes(localeCookie.value)) {
      locale = localeCookie.value as 'en' | 'vi' | 'zh' | 'ko' | 'ja';
    }
  } catch (error) {
    // Fallback to Vietnamese (primary market)
    console.log('Using default locale: vi');
  }

  return (
    <html lang={locale} className="overflow-x-hidden">
      <body className={`${inter.variable} font-sans overflow-x-hidden`}>
        <NextIntlClientProvider locale={locale} messages={messages[locale]}>
          <ToastProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </ToastProvider>
        </NextIntlClientProvider>
        <Script src="/mobile-menu.js" />
      </body>
    </html>
  )
}
