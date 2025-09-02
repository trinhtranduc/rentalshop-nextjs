'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Building2, 
  CreditCard, 
  Settings, 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Calendar,
  ChevronDown,
  LogOut
} from 'lucide-react';

interface AdminNavigationProps {
  user: any;
  onLogout: () => void;
}

export default function AdminNavigation({ user, onLogout }: AdminNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      current: pathname === '/dashboard'
    },
    {
      name: 'Merchants',
      href: '/merchants',
      icon: Building2,
      current: pathname.startsWith('/merchants')
    },
    {
      name: 'Plans',
      href: '/plans',
      icon: Package,
      current: pathname.startsWith('/plans')
    },
    {
      name: 'Billing Cycles',
      href: '/billing-cycles',
      icon: Calendar,
      current: pathname.startsWith('/billing-cycles')
    },
    {
      name: 'Payments',
      href: '/payments',
      icon: CreditCard,
      current: pathname.startsWith('/payments')
    },
    {
      name: 'Users',
      href: '/users',
      icon: Users,
      current: pathname.startsWith('/users')
    },
    {
      name: 'Products',
      href: '/products',
      icon: Package,
      current: pathname.startsWith('/products')
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: ShoppingCart,
      current: pathname.startsWith('/orders')
    },
    {
      name: 'Customers',
      href: '/customers',
      icon: Users,
      current: pathname.startsWith('/customers')
    },
    {
      name: 'Calendar',
      href: '/calendar',
      icon: Calendar,
      current: pathname.startsWith('/calendar')
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: pathname.startsWith('/settings')
    }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-bg-card shadow-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Building2 className="h-8 w-8 text-action-primary" />
              <span className="ml-2 text-xl font-bold text-text-primary">
                RentalShop Admin
              </span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-action-primary text-text-inverted'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative">
              <div>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-action-primary"
                >
                  <div className="h-8 w-8 rounded-full bg-action-primary flex items-center justify-center">
                    <span className="text-sm font-medium text-text-inverted">
                      {user?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <span className="ml-2 text-text-primary hidden md:block">
                    {user?.name || 'Admin'}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4 text-text-tertiary" />
                </button>
              </div>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-bg-card rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-text-secondary border-b border-border">
                    <div className="font-medium text-text-primary">{user?.name || 'Admin'}</div>
                    <div className="text-text-tertiary">{user?.email}</div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-action-primary"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon for menu */}
              <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-action-primary text-text-inverted'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
