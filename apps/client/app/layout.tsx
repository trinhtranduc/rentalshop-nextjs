import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ClientTopNavigation from './components/ClientTopNavigation'
import { CurrencyProvider } from '@rentalshop/hooks'
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
    <html lang="vi">
      <body className={`${inter.variable} font-sans`}>
        <CurrencyProvider>
          <ClientTopNavigation />
          <main className="pt-24">
            {children}
          </main>
        </CurrencyProvider>
        <Script src="/mobile-menu.js" />
      </body>
    </html>
  )
} 