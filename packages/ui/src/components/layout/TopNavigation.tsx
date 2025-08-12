'use client'

import { useState } from 'react'
import { 
  Home, 
  Store, 
  Users, 
  Settings, 
  User, 
  LogOut, 
  Menu, 
  X,
  Search,
  Bell,
  ShoppingCart,
  Package
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'

interface TopNavigationProps {
  variant?: 'client' | 'admin'
  currentPage: string // Make this required instead of using usePathname
  notificationsCount?: number
  cartItemsCount?: number
  onSearch?: (query: string) => void
  onLogout?: () => void
  onProfileClick?: () => void
}

export function TopNavigation({ 
  variant = 'client', 
  currentPage,
  notificationsCount = 0,
  cartItemsCount = 0,
  onSearch,
  onLogout,
  onProfileClick
}: TopNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const clientNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const adminNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/users', label: 'Users', icon: Users },
    { href: '/shops', label: 'Shops', icon: Store },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const navItems = variant === 'admin' ? adminNavItems : clientNavItems

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchQuery)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Store className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-gray-900">Rental Shop</h1>
              <p className="text-xs text-gray-500 capitalize">{variant}</p>
            </div>
          </div>

          {/* Center: Main Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.href
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  {item.label}
                </a>
              )
            })}
          </nav>

          {/* Right: Search + Actions + User */}
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search products, customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </form>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              {/* Notifications */}
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                <Bell className="w-5 h-5" />
                {notificationsCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {notificationsCount > 9 ? '9+' : notificationsCount}
                  </Badge>
                )}
              </Button>

              {/* Cart Items - Only for client */}
              {variant === 'client' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemsCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {cartItemsCount > 9 ? '9+' : cartItemsCount}
                    </Badge>
                  )}
                </Button>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onProfileClick}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:block text-sm font-medium">Profile</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search products, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.href
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-lg text-base font-medium flex items-center gap-3 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  {item.label}
                </a>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}

export default TopNavigation
