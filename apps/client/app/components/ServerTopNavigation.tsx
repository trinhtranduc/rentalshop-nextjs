'use client'

import React, { useState } from 'react';
import { 
  Home, 
  Package, 
  Users, 
  ShoppingCart, 
  Settings, 
  Store,
  User,
  StoreIcon,
  Calendar
} from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';

export interface ServerTopNavigationProps {
  currentPage: string;
}

export default function ServerTopNavigation({ currentPage }: ServerTopNavigationProps) {
  const { isPending, navigateTo, prefetchRoute } = useNavigation();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/users', label: 'Users', icon: User },
    { href: '/shops', label: 'Shops', icon: Store },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
  ];

  const isActive = (href: string) => currentPage === href;

  const handleTabClick = (href: string) => {
    navigateTo(href);
  };

  const handleTabHover = (href: string) => {
    setHoveredTab(href);
    prefetchRoute(href);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                <StoreIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">RentalShop</h1>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const isHovered = hoveredTab === item.href;
              
              return (
                <button
                  key={item.href}
                  onClick={() => handleTabClick(item.href)}
                  onMouseEnter={() => handleTabHover(item.href)}
                  onMouseLeave={() => setHoveredTab(null)}
                  className={`nav-item text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ease-out relative ${
                    active 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  } ${isHovered ? 'scale-105' : ''}`}
                  disabled={isPending}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                  {item.label}
                  
                  {/* Loading indicator for active tab */}
                  {isPending && active && (
                    <div className="absolute inset-0 bg-blue-50/50 rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  )}
                  
                  {/* Hover effect */}
                  {isHovered && !active && (
                    <div className="absolute inset-0 bg-gray-50/50 rounded-md transition-all duration-200"></div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right side - Settings only */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleTabClick('/settings')}
              onMouseEnter={() => prefetchRoute('/settings')}
              className={`nav-item text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 transition-all duration-200 ${
                currentPage === '/settings' ? 'text-blue-600 bg-blue-50' : ''
              }`}
              disabled={isPending}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              data-mobile-menu-toggle
              className="nav-item text-gray-500 hover:text-gray-900 focus:outline-none focus:text-gray-900 transition-colors duration-150"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden hidden mobile-menu" data-mobile-menu>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => handleTabClick(item.href)}
                  className={`nav-item block w-full text-left px-3 py-2 text-base font-medium flex items-center gap-3 transition-all duration-200 ${
                    active 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  disabled={isPending}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                  {item.label}
                  
                  {/* Loading indicator for mobile */}
                  {isPending && active && (
                    <div className="ml-auto">
                      <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => handleTabClick('/settings')}
              className={`nav-item block w-full text-left px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 flex items-center gap-3 transition-all duration-200 ${
                currentPage === '/settings' ? 'text-blue-600 bg-blue-50' : ''
              }`}
              disabled={isPending}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>
        </div>
      </div>
      
      {/* Global loading bar */}
      {isPending && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600">
          <div className="h-full bg-blue-400 animate-pulse"></div>
        </div>
      )}
    </header>
  );
}

