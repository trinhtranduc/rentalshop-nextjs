import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <ToastProvider>
          <AdminLayout>
            {children}
          </AdminLayout>
        </ToastProvider>
      </body>
    </html>
  )
} 