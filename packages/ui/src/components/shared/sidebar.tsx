'use client'

import { Home, Store, Users, Settings, User, LogOut, Menu, X } from 'lucide-react'
import { Button } from '../button'

interface SidebarProps {
  variant?: 'client' | 'admin'
  currentPage?: string
  isOpen?: boolean
  onToggle?: () => void
}

export function Sidebar({ variant = 'client', currentPage, isOpen = false, onToggle }: SidebarProps) {
  const clientNavItems = [
    { href: '/dashboard', label: 'Bảng điều khiển', icon: Home },
    { href: '/products', label: 'Sản phẩm', icon: Store },
    { href: '/customers', label: 'Khách hàng', icon: Users },
    { href: '/orders', label: 'Đơn hàng', icon: Store },
    { href: '/settings', label: 'Cài đặt', icon: Settings },
  ]

  const adminNavItems = [
    { href: '/dashboard', label: 'Bảng điều khiển', icon: Home },
    { href: '/users', label: 'Người dùng', icon: Users },
    { href: '/shops', label: 'Cửa hàng', icon: Store },
    { href: '/products', label: 'Sản phẩm', icon: Store },
    { href: '/orders', label: 'Đơn hàng', icon: Store },
    { href: '/settings', label: 'Cài đặt', icon: Settings },
  ]

  const navItems = variant === 'admin' ? adminNavItems : clientNavItems

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden" onClick={onToggle} />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-nav-background text-nav-tint transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
              <Store className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold">
              {variant === 'admin' ? 'Admin Panel' : 'Rental Shop'}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="md:hidden text-nav-tint hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === item.href
                      ? 'bg-brand-secondary text-white'
                      : 'text-nav-tint hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.label}
                </a>
              )
            })}
          </div>
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start text-nav-tint hover:text-gray-300">
              <User className="w-4 h-4 mr-3" />
              Hồ sơ
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-nav-tint hover:text-gray-300">
              <LogOut className="w-4 h-4 mr-3" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    </>
  )
} 