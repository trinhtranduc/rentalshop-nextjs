import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ClientLayout from './components/ClientLayout'
import { CurrencyProvider } from '@rentalshop/hooks'
import { AuthProvider } from './providers/AuthProvider'
import { ToastProvider } from './providers/ToastProvider'
import './globals.css'
import Script from 'next/script'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Rental Shop - Client',
  description: 'Rental shop management system for shop owners',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <AuthProvider>
          <CurrencyProvider>
            <ToastProvider>
              <ClientLayout>
                {children}
              </ClientLayout>
            </ToastProvider>
          </CurrencyProvider>
        </AuthProvider>
        <Script src="/mobile-menu.js" />
      </body>
    </html>
  )
} 