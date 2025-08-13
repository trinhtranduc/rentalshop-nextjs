import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ClientTopNavigation from './components/ClientTopNavigation'
import NavigationProgressBar from './components/NavigationProgressBar'
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
        <NavigationProgressBar />
        <ClientTopNavigation />
        <main className="pt-24">
          {children}
        </main>
        <Script src="/components/mobile-menu.js" />
      </body>
    </html>
  )
} 