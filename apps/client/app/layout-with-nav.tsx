'use client'

import { TopNavigation } from '@rentalshop/ui'
import { usePathname } from 'next/navigation'

interface LayoutWithNavProps {
  children: React.ReactNode
  variant?: 'client' | 'admin'
}

export default function LayoutWithNav({ children, variant = 'client' }: LayoutWithNavProps) {
  const pathname = usePathname()

  const handleSearch = (query: string) => {
    console.log('Search query:', query)
    // Implement search functionality
  }

  const handleLogout = () => {
    console.log('Logout clicked')
    // Implement logout functionality
  }

  const handleProfileClick = () => {
    console.log('Profile clicked')
    // Navigate to profile page
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation
        variant={variant}
        currentPage={pathname}
        notificationsCount={3}
        cartItemsCount={5}
        onSearch={handleSearch}
        onLogout={handleLogout}
        onProfileClick={handleProfileClick}
      />
      <main className="pt-6">
        {children}
      </main>
    </div>
  )
}
