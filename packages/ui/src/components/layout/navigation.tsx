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
  ChevronLeft,
  ChevronRight,
  Tag,
  ShoppingCart,
  Building2
} from 'lucide-react'
import { Button } from '@rentalshop/ui/base'

interface NavigationProps {
  variant?: 'client' | 'admin'
  currentPage?: string
  hideSidebar?: boolean
  allowCollapse?: boolean
  onCollapseToggle?: () => void
  isCollapsed?: boolean
  userRole?: string // Add user role for filtering navigation
}

export function Navigation({ 
  variant = 'client', 
  currentPage,
  hideSidebar = false,
  allowCollapse = true,
  onCollapseToggle,
  isCollapsed = false,
  userRole
}: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)

  const clientNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/products', label: 'Products', icon: Store },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/orders', label: 'Orders', icon: Store },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const adminNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/users', label: 'Users', icon: Users },
    { href: '/outlets', label: 'Outlets', icon: Building2 },
    { href: '/products', label: 'Products', icon: Store },
    { href: '/categories', label: 'Categories', icon: Tag },
    { href: '/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  // Filter nav items based on user role
  const filterNavItemsByRole = (items: typeof adminNavItems, userRole?: string) => {
    if (!userRole) return items;
    
    // Hide specific tabs based on user role
    if (userRole === 'OUTLET_ADMIN') {
      // OUTLET_ADMIN can see users but not outlets, subscriptions, plans, payments
      return items.filter(item => 
        item.href !== '/outlets' && 
        item.href !== '/subscriptions' && 
        item.href !== '/plans' && 
        item.href !== '/payments'
      );
    } else if (userRole === 'OUTLET_STAFF') {
      // OUTLET_STAFF cannot see users, outlets, subscriptions, plans, payments (limited permissions)
      return items.filter(item => 
        item.href !== '/users' && 
        item.href !== '/outlets' && 
        item.href !== '/subscriptions' && 
        item.href !== '/plans' && 
        item.href !== '/payments'
      );
    }
    
    return items;
  };

  const navItems = variant === 'admin' 
    ? filterNavItemsByRole(adminNavItems, userRole) 
    : clientNavItems

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
            {!hideSidebar && (
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
                        {!isCollapsed && item.label}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {!hideSidebar && allowCollapse && onCollapseToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCollapseToggle}
                className="text-nav-tint hover:text-gray-300"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-nav-tint hover:text-gray-300">
              <User className="w-4 h-4 mr-2" />
              {!isCollapsed && 'Profile'}
            </Button>
            <Button variant="ghost" size="sm" className="text-nav-tint hover:text-gray-300">
              <LogOut className="w-4 h-4 mr-2" />
              {!isCollapsed && 'Logout'}
            </Button>
            {!hideSidebar && (
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
            )}
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      {!hideSidebar && isOpen && (
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