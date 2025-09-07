'use client'

import { useState } from 'react'
import { 
  Home, 
  Package, 
  Users, 
  Settings, 
  Tag, 
  ShoppingCart,
  Store,
  Building2,
  Bell,
  User,
  LogOut,
  X,
  Menu,
  CreditCard,
  Calendar,
  Clock,
  ChevronDown,
  BarChart3,
  ShieldCheck,
  FileText,
  Database,
  Activity,
  Wrench,
  Key,
  Download,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { LucideIcon } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  subItems?: NavItem[]
}

interface TopNavigationProps {
  variant?: 'client' | 'admin'
  currentPage: string // Make this required instead of using usePathname
  notificationsCount?: number
  cartItemsCount?: number
  onLogout?: () => void
  onProfileClick?: () => void
  userRole?: string // Add user role for filtering navigation
}

export function TopNavigation({ 
  variant = 'client', 
  currentPage,
  notificationsCount = 0,
  cartItemsCount = 0,
  onLogout,
  onProfileClick,
  userRole
}: TopNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const clientNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const adminNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/merchants', label: 'Merchants', icon: Building2 },
    { 
      href: '/plans', 
      label: 'Plans', 
      icon: Package
    },
    { href: '/subscriptions', label: 'Subscriptions', icon: Clock },
    { href: '/payments', label: 'Payments', icon: CreditCard },
    { href: '/users', label: 'Users', icon: Users },
    { 
      href: '/system', 
      label: 'System', 
      icon: Settings,
      subItems: [
        { href: '/system/backup', label: 'Backup Management', icon: Database },
        { href: '/system/integrity', label: 'Data Integrity', icon: ShieldCheck },
        { href: '/system/audit-logs', label: 'Audit Logs', icon: FileText }
      ]
    },

  ]

  // Filter nav items based on user role
  const filterNavItemsByRole = (items: NavItem[], userRole?: string) => {
    if (!userRole) return items;
    
    // Hide outlets tab for outlet-level users
    if (userRole === 'OUTLET_ADMIN' || userRole === 'OUTLET_STAFF') {
      return items.filter(item => item.href !== '/outlets');
    }
    
    return items;
  };

  const navItems = variant === 'admin' 
    ? filterNavItemsByRole(adminNavItems, userRole) 
    : clientNavItems



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
              const isActive = currentPage === item.href || (item.subItems && item.subItems.some(subItem => currentPage === subItem.href))
              const hasSubItems = item.subItems && item.subItems.length > 0
              
              if (hasSubItems) {
                return (
                  <div key={item.href} className="relative group">
                    <a
                      href={item.href}
                      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                      {item.label}
                      <ChevronDown className="w-3 h-3" />
                    </a>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        {item.subItems?.map((subItem) => {
                          const SubIcon = subItem.icon
                          const isSubActive = currentPage === subItem.href
                          return (
                            <a
                              key={subItem.href}
                              href={subItem.href}
                              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                                isSubActive
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-blue-600' : 'text-gray-500'}`} />
                              {subItem.label}
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              }
              
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

          {/* Right: Actions + User */}
          <div className="flex items-center space-x-4">
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


      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.href || (item.subItems && item.subItems.some(subItem => currentPage === subItem.href))
              const hasSubItems = item.subItems && item.subItems.length > 0
              
              return (
                <div key={item.href}>
                  <a
                    href={item.href}
                    className={`flex px-3 py-2 rounded-lg text-base font-medium items-center gap-3 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                    {item.label}
                  </a>
                  
                  {/* Mobile Sub-items */}
                  {hasSubItems && (
                    <div className="ml-6 space-y-1">
                      {item.subItems?.map((subItem) => {
                        const SubIcon = subItem.icon
                        const isSubActive = currentPage === subItem.href
                        return (
                          <a
                            key={subItem.href}
                            href={subItem.href}
                            className={`flex px-3 py-2 rounded-lg text-sm font-medium items-center gap-3 ${
                              isSubActive
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-blue-600' : 'text-gray-500'}`} />
                            {subItem.label}
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}

export default TopNavigation
