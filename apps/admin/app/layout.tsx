import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import DynamicTopNavigation from './components/DynamicTopNavigation'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Rental Shop - Admin',
  description: 'Rental shop administration system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <DynamicTopNavigation />
        <main className="pt-24">
          {children}
        </main>
      </body>
    </html>
  )
} 