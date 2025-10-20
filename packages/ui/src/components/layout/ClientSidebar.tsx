'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useCommonTranslations } from '@rentalshop/hooks';
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Users, 
  Package, 
  ShoppingCart, 
  Building2, 
  Settings,
  Calendar,
  Tag,
  User,
  Store,
  LogOut,
  Bell,
  ChevronDown
} from 'lucide-react';

export interface ClientSidebarProps {
  user?: any;
  isOpen?: boolean;
  onToggle?: () => void;
  onLogout?: () => void;
  currentPath?: string;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
  notificationsCount?: number;
  cartItemsCount?: number;
  onNavigate?: (href: string) => void;
  onPrefetch?: (href: string) => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  subItems?: MenuItem[];
}

// Function to get menu items with translations
const getClientMenuItems = (t: any): MenuItem[] => [
  {
    label: t('navigation.dashboard'),
    href: '/dashboard',
    icon: Home,
  },
  {
    label: t('navigation.orders'),
    href: '/orders',
    icon: ShoppingCart,
  },
  {
    label: t('navigation.products'),
    href: '/products',
    icon: Package,
    subItems: [
      { 
        label: t('navigation.allProducts'), 
        href: '/products', 
        icon: Package 
      },
      { 
        label: t('navigation.categories'), 
        href: '/categories', 
        icon: Tag 
      }
    ]
  },
  {
    label: t('navigation.customers'),
    href: '/customers',
    icon: Users,
  },
  {
    label: t('navigation.users'),
    href: '/users',
    icon: User,
  },
  {
    label: t('navigation.outlets'),
    href: '/outlets',
    icon: Building2,
  },
  {
    label: t('navigation.calendar'),
    href: '/calendar',
    icon: Calendar,
  },
  {
    label: t('navigation.settings'),
    href: '/settings',
    icon: Settings,
  }
];

export const ClientSidebar: React.FC<ClientSidebarProps> = ({
  user,
  isOpen = true,
  onToggle,
  onLogout,
  currentPath = '',
  isCollapsed = false,
  onCollapseToggle,
  notificationsCount = 0,
  cartItemsCount = 0,
  onNavigate,
  onPrefetch
}) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [clickedTab, setClickedTab] = useState<string | null>(null);
  const [localCurrentPage, setLocalCurrentPage] = useState(currentPath);
  const [isNavigating, setIsNavigating] = useState<string | null>(null);
  const pathname = usePathname();
  
  // Get translations
  const t = useCommonTranslations();

  // Filter menu items based on user role
  const filterMenuItemsByRole = (items: MenuItem[], userRole?: string) => {
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

  const menuItems = filterMenuItemsByRole(getClientMenuItems(t), user?.role);

  // Update local state when prop changes - prioritize pathname for immediate updates
  useEffect(() => {
    const actualPath = pathname || currentPath;
    setLocalCurrentPage(actualPath);
    // Clear navigation state when path actually changes
    if (isNavigating && actualPath !== isNavigating) {
      setIsNavigating(null);
    }
  }, [pathname, currentPath, isNavigating]);

  // AGGRESSIVE PREFETCHING: Prefetch all pages on mount for instant navigation
  useEffect(() => {
    if (onPrefetch) {
      menuItems.forEach(item => {
        onPrefetch(item.href);
      });
    }
  }, [menuItems, onPrefetch]);

  // Close submenu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const isClickingNavItem = target.closest('.nav-item');
      const isClickingSubmenu = target.closest('[data-submenu]');
      
      if (expandedItems.length > 0 && !isClickingNavItem && !isClickingSubmenu) {
        setExpandedItems([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expandedItems]);

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    // Use pathname as primary source for immediate feedback, fallback to localCurrentPage
    const currentPathToCheck = pathname || localCurrentPage;
    if (href === '/dashboard') {
      return currentPathToCheck === '/dashboard';
    }
    return currentPathToCheck.startsWith(href);
  };

  const handleTabClick = (href: string) => {
    // OPTIMISTIC UI UPDATE: Immediately set navigation state for instant visual feedback
    setIsNavigating(href);
    setLocalCurrentPage(href);
    
    // Set clicked state for immediate visual feedback
    setClickedTab(href);
    
    // Clear clicked state quickly for responsive feel
    setTimeout(() => setClickedTab(null), 150);
    
    // Navigate asynchronously - don't block UI updates
    if (onNavigate) {
      // Use requestAnimationFrame to ensure state updates render first
      requestAnimationFrame(() => {
        onNavigate(href);
      });
    }
  };

  const handleTabHover = (href: string) => {
    setHoveredTab(href);
    if (onPrefetch) {
      onPrefetch(href);
    }
  };


  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems.includes(item.href);
    const active = isActive(item.href);
    const isHovered = hoveredTab === item.href;
    const isNavigatingTo = isNavigating === item.href;
    const isClicked = clickedTab === item.href;
    const Icon = item.icon;
    
    // Combined state for immediate visual feedback
    const shouldHighlight = active || isNavigatingTo;

    return (
      <div key={item.href} className="relative">
        {hasSubItems ? (
          <Button
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleExpanded(item.href);
            }}
            onMouseEnter={() => handleTabHover(item.href)}
            onMouseLeave={() => setHoveredTab(null)}
            className={cn(
              'nav-item flex items-center justify-between w-full px-3 py-2.5 text-sm font-normal rounded-lg relative',
              shouldHighlight
                ? 'nav-item-active text-blue-700 font-medium bg-blue-50/80' 
                : 'text-text-primary hover:text-blue-700 hover:bg-bg-secondary',
              isHovered && !shouldHighlight ? 'hover:shadow-sm' : '',
              isClicked ? 'scale-[0.98] transform' : '',
              isNavigatingTo ? 'nav-item-loading ring-1 ring-blue-200/50' : ''
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn(
                'w-4 h-4 transition-colors duration-100',
                shouldHighlight ? 'text-blue-700' : 'text-text-secondary'
              )} />
              {!isCollapsed && (
                <span>{item.label}</span>
              )}
            </div>
            {!isCollapsed && (
              <ChevronDown className={cn(
                'w-4 h-4 transition-transform duration-200',
                isExpanded ? 'rotate-180' : ''
              )} />
            )}
            
            {/* Hover effect - only show when not currently active/navigating */}
            {isHovered && !shouldHighlight && (
              <div className="absolute inset-0 bg-bg-secondary/50 rounded-lg transition-all duration-100"></div>
            )}
            
            {/* Navigation indicator */}
            {isNavigatingTo && (
              <div className="absolute inset-0 bg-blue-50/30 rounded-lg animate-pulse transition-all duration-100"></div>
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabClick(item.href);
            }}
            onMouseEnter={() => handleTabHover(item.href)}
            onMouseLeave={() => setHoveredTab(null)}
            className={cn(
              'nav-item flex items-center justify-between w-full px-3 py-2.5 text-sm font-normal rounded-lg relative',
              shouldHighlight
                ? 'nav-item-active text-blue-700 font-medium bg-blue-50/80' 
                : 'text-text-primary hover:text-blue-700 hover:bg-bg-secondary',
              isHovered && !shouldHighlight ? 'hover:shadow-sm' : '',
              isClicked ? 'scale-[0.98] transform' : '',
              isNavigatingTo ? 'nav-item-loading ring-1 ring-blue-200/50' : ''
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn(
                'w-4 h-4 transition-colors duration-100',
                shouldHighlight ? 'text-blue-700' : 'text-text-secondary'
              )} />
              {!isCollapsed && (
                <span>{item.label}</span>
              )}
            </div>
            {!isCollapsed && item.badge && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {item.badge}
              </span>
            )}
            
            {/* Hover effect - only show when not currently active/navigating */}
            {isHovered && !shouldHighlight && (
              <div className="absolute inset-0 bg-bg-secondary/50 rounded-lg transition-all duration-100"></div>
            )}
            
            {/* Navigation indicator */}
            {isNavigatingTo && (
              <div className="absolute inset-0 bg-blue-50/30 rounded-lg animate-pulse transition-all duration-100"></div>
            )}
          </Button>
        )}

        {/* Sub Items */}
        {hasSubItems && isExpanded && !isCollapsed && (
          <div className="ml-6 mt-1 space-y-1" data-submenu="true">
            {item.subItems?.map((subItem) => {
              const SubIcon = subItem.icon;
              const subActive = isActive(subItem.href);
              const subNavigating = isNavigating === subItem.href;
              const subClicked = clickedTab === subItem.href;
              const subShouldHighlight = subActive || subNavigating;
              
              return (
                <Button
                  variant="ghost"
                  key={subItem.href}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabClick(subItem.href);
                    // Add small delay before closing submenu to ensure navigation processes
                    setTimeout(() => {
                      setExpandedItems([]);
                    }, 50); // Reduced delay for faster response
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm font-normal flex items-center gap-2 hover:bg-bg-secondary transition-all duration-100 rounded-lg justify-start h-auto will-change-transform',
                    subShouldHighlight ? 'text-blue-700 font-medium bg-blue-50/80' : 'text-text-primary hover:text-blue-700',
                    subClicked ? 'scale-[0.99] transform' : '',
                    subNavigating ? 'ring-1 ring-blue-200/50' : ''
                  )}
                >
                  <SubIcon className={cn(
                    'w-4 h-4 transition-colors duration-100',
                    subShouldHighlight ? 'text-blue-700' : 'text-text-secondary'
                  )} />
                  {subItem.label}
                  {subNavigating && (
                    <div className="absolute inset-0 bg-blue-50/20 rounded-lg transition-all duration-100"></div>
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      'flex flex-col h-full bg-bg-card border-r border-border shadow-sm transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Hidden Link components for Next.js automatic prefetching */}
      <div className="hidden">
        {menuItems.map(item => (
          <Link key={item.href} href={item.href} />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-700 to-blue-500 rounded-lg flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">RentalShop</h1>
            </div>
          </div>
        )}
        
        {isCollapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-700 to-blue-500 rounded-lg flex items-center justify-center mx-auto shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapseToggle}
          className="h-8 w-8 text-text-tertiary hover:text-text-primary"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>


      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => renderMenuItem(item))}
      </nav>

      {/* User Profile & Actions */}
      <div className="p-4 border-t border-border">
        {user && !isCollapsed && (
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user.name || user.email}
              </p>
              <p className="text-xs text-text-tertiary truncate">
                {user.role}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {cartItemsCount > 0 && (
                <div className="relative">
                  <ShoppingCart className="w-4 h-4 text-text-tertiary" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-action-primary rounded-full text-xs text-white flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {user && isCollapsed && (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center space-x-1">
              {notificationsCount > 0 && (
                <div className="relative">
                  <Bell className="w-4 h-4 text-text-tertiary" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-action-danger rounded-full text-xs text-white flex items-center justify-center">
                    {notificationsCount}
                  </span>
                </div>
              )}
              {cartItemsCount > 0 && (
                <div className="relative">
                  <ShoppingCart className="w-4 h-4 text-text-tertiary" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-action-primary rounded-full text-xs text-white flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {onLogout && (
          <Button
            variant="ghost"
            onClick={onLogout}
            className={cn(
              'w-full justify-start text-text-secondary hover:text-text-primary hover:bg-bg-secondary text-sm font-normal',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">{t('navigation.logout')}</span>}
          </Button>
        )}
      </div>
    </div>
  );
};
