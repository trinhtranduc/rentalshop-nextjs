import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import AdminLayout from './components/AdminLayout'
// AuthProvider removed - using centralized useAuth hook from @rentalshop/hooks
import { ToastProvider } from './providers/ToastProvider'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'AnyRent - Admin',
  description: 'AnyRent administration system',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
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
  themeColor: '#1e293b',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AnyRent Admin',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get messages and locale from i18n.ts configuration
  const messages = await getMessages();

  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <AdminLayout>
              {children}
            </AdminLayout>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
} 