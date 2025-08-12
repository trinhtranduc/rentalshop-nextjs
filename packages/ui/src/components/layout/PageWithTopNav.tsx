'use client'

import { TopNavigation } from './TopNavigation'
import { usePathname } from 'next/navigation'

interface PageWithTopNavProps {
  children: React.ReactNode
  variant?: 'client' | 'admin'
  notificationsCount?: number
  cartItemsCount?: number
  onSearch?: (query: string) => void
  onLogout?: () => void
  onProfileClick?: () => void
  showSearch?: boolean
  showNotifications?: boolean
  showCart?: boolean
}

export function PageWithTopNav({ 
  children, 
  variant = 'client',
  notificationsCount = 0,
  cartItemsCount = 0,
  onSearch,
  onLogout,
  onProfileClick,
  showSearch = true,
  showNotifications = true,
  showCart = true
}: PageWithTopNavProps) {
  const pathname = usePathname()

  const defaultHandleSearch = (query: string) => {
    console.log('Search query:', query)
    // Default search implementation
  }

  const defaultHandleLogout = () => {
    console.log('Logout clicked')
    // Default logout implementation
  }

  const defaultHandleProfileClick = () => {
    console.log('Profile clicked')
    // Default profile implementation
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation
        variant={variant}
        currentPage={pathname}
        notificationsCount={showNotifications ? notificationsCount : 0}
        cartItemsCount={showCart ? cartItemsCount : 0}
        onSearch={onSearch || defaultHandleSearch}
        onLogout={onLogout || defaultHandleLogout}
        onProfileClick={onProfileClick || defaultHandleProfileClick}
      />
      <main className="pt-6">
        {children}
      </main>
    </div>
  )
}

export default PageWithTopNav
