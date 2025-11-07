'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@rentalshop/ui/base';
import { Button, Card } from '@rentalshop/ui/base';
import { ChevronLeft, ChevronRight, Home, Users, Package, ShoppingCart, Building2, Settings } from 'lucide-react';
// @ts-ignore - hooks package doesn't have type declarations yet
import { useOptimisticNavigation } from '@rentalshop/hooks';

export interface SidebarProps {
  user?: any;
  isOpen?: boolean;
  onToggle?: () => void;
  onLogout?: () => void;
  currentPath?: string;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
      </svg>
    ),
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    label: 'Products',
    href: '/products',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    badge: '3',
  },
  {
    label: 'Outlets',
    href: '/outlets',
    icon: (
      <Building2 className="w-5 h-5" />
    ),
  },
  {
    label: 'Users',
    href: '/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  isOpen = false,
  onToggle,
  onLogout,
  currentPath = '',
  isCollapsed = false,
  onCollapseToggle,
}) => {
  const router = useRouter();
  const { navigate, navigatingTo } = useOptimisticNavigation();

  // Prefetch all pages on mount for instant navigation
  useEffect(() => {
    menuItems.forEach(item => {
      router.prefetch(item.href);
    });
  }, [router]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Navigation Loading Overlay - REMOVED for instant transitions */}
      {/* Let Next.js loading.tsx handle skeleton loading instead */}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              {!isCollapsed && (
                <span className="font-bold text-2xl text-gray-900 leading-none">AnyRent</span>
              )}
            </button>
            
            <div className="flex items-center space-x-2">
              {/* Collapse Toggle Button */}
              {onCollapseToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCollapseToggle}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                </Button>
              )}
              
              {/* Close button for mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="lg:hidden text-gray-500 hover:text-gray-700 focus:outline-none h-8 w-8 p-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {/* Hidden Links for Next.js prefetching */}
            <div className="hidden">
              {menuItems.map((item) => (
                <Link key={`prefetch-${item.href}`} href={item.href} prefetch={true}>
                  {item.label}
                </Link>
              ))}
            </div>

            {menuItems.map((item) => {
              const isActive = currentPath === item.href;
              const isNavigating = navigatingTo === item.href;
              const shouldHighlight = isActive || isNavigating;
              
              return (
                <button
                  key={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.href);
                  }}
                  onMouseEnter={() => {
                    // Aggressive prefetch on hover
                    router.prefetch(item.href);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 group',
                    shouldHighlight
                      ? 'bg-green-100 text-green-700 border-r-2 border-green-600'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    // Add click feedback
                    navigatingTo === item.href && 'bg-green-50 text-green-700 border-r-2 border-green-600'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <span className={cn(
                      'flex-shrink-0 transition-colors duration-150',
                      shouldHighlight ? 'text-green-600' : 'text-slate-500'
                    )}>
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className={cn(
                        'text-base transition-all duration-150',
                        shouldHighlight ? 'font-medium' : 'font-normal'
                      )}>{item.label}</span>
                    )}
                  </div>
                  
                  {!isCollapsed && item.badge && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile */}
          {user && (
            <div className="p-4 border-t border-gray-200">
              <Card className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {user.firstName?.[0] || user.email?.[0] || 'U'}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user.email || 'User'
                        }
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.role || 'User'}
                      </p>
                    </div>
                  )}
                </div>
                
                {!isCollapsed && (
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => navigate('/profile')}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profile</span>
                      </div>
                    </button>
                    
                    <Button
                      onClick={onLogout}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}; 