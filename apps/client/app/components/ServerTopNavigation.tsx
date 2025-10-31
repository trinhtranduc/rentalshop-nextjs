'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@rentalshop/ui';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users, 
  User, 
  Building2, 
  Calendar,
  Tag,
  Settings,
  CreditCard,
  ChevronDown,
  Menu
} from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useCommonTranslations } from '@rentalshop/hooks';

export interface ServerTopNavigationProps {
  currentPage: string;
  userRole?: string; // Add user role for filtering navigation
}

export default function ServerTopNavigation({ currentPage, userRole }: ServerTopNavigationProps) {
  const { navigateTo, prefetchRoute } = useNavigation();
  const t = useCommonTranslations();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [clickedTab, setClickedTab] = useState<string | null>(null);
  const [localCurrentPage, setLocalCurrentPage] = useState(currentPage);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const allNavItems = [
    { href: '/dashboard', label: t('navigation.dashboard'), icon: Home },
    { href: '/orders', label: t('navigation.orders'), icon: ShoppingCart },
    { 
      href: '/products', 
      label: t('navigation.products'), 
      icon: Package,
      submenu: [
        { href: '/products', label: t('navigation.products'), icon: Package },
        { href: '/categories', label: t('navigation.categories'), icon: Tag },
      ]
    },
    { href: '/customers', label: t('navigation.customers'), icon: Users },
    { href: '/users', label: t('navigation.users'), icon: User },
    { href: '/outlets', label: t('navigation.outlets'), icon: Building2 },
    { href: '/calendar', label: t('navigation.calendar'), icon: Calendar },
  ];

  // Filter nav items based on user role
  const filterNavItemsByRole = (items: typeof allNavItems, userRole?: string) => {
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

  const navItems = filterNavItemsByRole(allNavItems, userRole);

  // Update local state when prop changes
  useEffect(() => {
    setLocalCurrentPage(currentPage);
  }, [currentPage]);

  // Close submenu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const isClickingNavItem = target.closest('.nav-item');
      const isClickingSubmenu = target.closest('[data-submenu]');
      
      if (openSubmenu && !isClickingNavItem && !isClickingSubmenu) {
        console.log('🔄 Click outside detected, closing submenu');
        setOpenSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openSubmenu]);

  const isActive = (href: string) => localCurrentPage === href;

  const handleTabClick = (href: string) => {
    console.log('🔄 handleTabClick called with:', href);
    
    // Immediately update local state for instant visual feedback
    setLocalCurrentPage(href);
    
    // Set clicked state for visual feedback
    setClickedTab(href);
    
    // Clear clicked state after a short delay
    setTimeout(() => setClickedTab(null), 200);
    
    // Navigate
    console.log('🔄 Calling navigateTo with:', href);
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
              <div className="w-8 h-8 bg-gradient-to-br from-blue-700 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AnyRent</h1>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const isHovered = hoveredTab === item.href;
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isSubmenuOpen = openSubmenu === item.href;
              
              return (
                <div key={item.href} className="relative">
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (hasSubmenu) {
                        console.log('🔄 Products menu clicked, toggling submenu');
                        setOpenSubmenu(isSubmenuOpen ? null : item.href);
                      } else {
                        console.log('🔄 Regular menu item clicked:', item.href);
                        handleTabClick(item.href);
                      }
                    }}
                    onMouseEnter={() => setHoveredTab(item.href)}
                    onMouseLeave={() => setHoveredTab(null)}
                    className={`nav-item text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-150 ease-out relative ${
                      active 
                        ? 'text-blue-700 bg-blue-50 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    } ${isHovered ? 'scale-105' : ''} ${clickedTab === item.href ? 'scale-95 bg-blue-100 shadow-md' : ''}`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-700' : 'text-gray-500'}`} />
                    {item.label}
                    {hasSubmenu && (
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                    )}
                    
                    {/* Hover effect */}
                    {isHovered && !active && (
                      <div className="absolute inset-0 bg-gray-50/50 rounded-md transition-all duration-200"></div>
                    )}
                  </Button>
                  
                  {/* Submenu Dropdown */}
                  {hasSubmenu && isSubmenuOpen && (
                    <div 
                      className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                      data-submenu="true"
                    >
                      <div className="py-1">
                        {item.submenu.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = currentPage === subItem.href;
                          
                          return (
                            <Button
                              variant="ghost"
                              key={subItem.href}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🔄 Submenu item clicked:', subItem.href);
                                handleTabClick(subItem.href);
                                // Add small delay before closing submenu to ensure navigation processes
                                setTimeout(() => {
                                  setOpenSubmenu(null);
                                }, 100);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors justify-start h-auto rounded-none ${
                                isSubActive ? 'text-blue-700 bg-blue-50' : 'text-gray-700'
                              }`}
                            >
                              <SubIcon className="w-4 h-4" />
                              {subItem.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right side - Settings only */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => handleTabClick('/settings')}
              onMouseEnter={() => prefetchRoute('/settings')}
              className={`nav-item text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 transition-all duration-150 ${
                currentPage === '/settings' ? 'text-blue-700 bg-blue-50 shadow-sm' : ''
              } ${clickedTab === '/settings' ? 'scale-95 bg-red-100 shadow-md' : ''}`}
            >
              <Settings className="w-4 h-4" />
              {t('navigation.settings')}
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              data-mobile-menu-toggle
              className="nav-item text-gray-500 hover:text-gray-900"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden hidden mobile-menu" data-mobile-menu>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Button
                  variant="ghost"
                  key={item.href}
                  onClick={() => handleTabClick(item.href)}
                  className={`nav-item block w-full text-left px-3 py-2 text-base font-medium flex items-center gap-3 transition-all duration-150 justify-start h-auto ${
                    active 
                      ? 'text-blue-700 bg-blue-50 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  } ${clickedTab === item.href ? 'scale-95 bg-blue-100 shadow-md' : ''}`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-blue-700' : 'text-gray-500'}`} />
                  {item.label}
                </Button>
              );
            })}
            <Button
              variant="ghost"
              onClick={() => handleTabClick('/settings')}
              className={`nav-item block w-full text-left px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 flex items-center gap-3 transition-all duration-150 justify-start h-auto ${
                currentPage === '/settings' ? 'text-blue-700 bg-blue-50 shadow-sm' : ''
              } ${clickedTab === '/settings' ? 'scale-95 bg-blue-100 shadow-md' : ''}`}
            >
              <Settings className="w-5 h-5" />
              {t('navigation.settings')}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

