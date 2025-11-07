import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import ClientLayout from './components/ClientLayout'
import { ToastProvider } from './providers/ToastProvider'
import './globals.css'
import Script from 'next/script'

// Disable static generation for root layout
export const dynamic = 'force-dynamic';

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

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'AnyRent - Client',
  description: 'AnyRent management system for shop owners',
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
    title: 'AnyRent Client',
  },
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
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ READ COOKIE SERVER-SIDE - No flash, correct locale from start
  // Default to Vietnamese for Vietnam market
  let locale: 'en' | 'vi' = 'vi';
  
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE');
    
    if (localeCookie?.value && (localeCookie.value === 'en' || localeCookie.value === 'vi')) {
      locale = localeCookie.value;
    }
  } catch (error) {
    // Fallback to Vietnamese (primary market)
    console.log('Using default locale: vi');
  }

  return (
    <html lang={locale}>
      <body className={`${inter.variable} font-sans`}>
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
