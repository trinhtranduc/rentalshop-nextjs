'use client'

import { useState } from 'react'
import { Menu, X, Home, Store, Users, Settings, User, LogOut } from 'lucide-react'
import { Button } from '../button'

interface NavigationProps {
  variant?: 'client' | 'admin'
  currentPage?: string
}

export function Navigation({ variant = 'client', currentPage }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)

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
    <nav className="bg-nav-background text-nav-tint shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors ${
                        currentPage === item.href
                          ? 'bg-brand-secondary text-white'
                          : 'text-nav-tint hover:text-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-nav-tint hover:text-gray-300">
              <User className="w-4 h-4 mr-2" />
              Hồ sơ
            </Button>
            <Button variant="ghost" size="sm" className="text-nav-tint hover:text-gray-300">
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="text-nav-tint hover:text-gray-300"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${
                    currentPage === item.href
                      ? 'bg-brand-secondary text-white'
                      : 'text-nav-tint hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </a>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
} 