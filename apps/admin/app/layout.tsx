import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import AdminLayout from './components/AdminLayout'
import { AuthProvider } from './providers/AuthProvider'
import { ToastProvider } from './providers/ToastProvider'
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
        <AuthProvider>
          <ToastProvider>
            <AdminLayout>
              {children}
            </AdminLayout>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 