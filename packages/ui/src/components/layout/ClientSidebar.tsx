'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
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

const clientMenuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: ShoppingCart,
    badge: '3',
  },
  {
    label: 'Products',
    href: '/products',
    icon: Package,
    subItems: [
      { 
        label: 'All Products', 
        href: '/products', 
        icon: Package 
      },
      { 
        label: 'Categories', 
        href: '/categories', 
        icon: Tag 
      }
    ]
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: Users,
  },
  {
    label: 'Users',
    href: '/users',
    icon: User,
  },
  {
    label: 'Outlets',
    href: '/outlets',
    icon: Building2,
  },
  {
    label: 'Calendar',
    href: '/calendar',
    icon: Calendar,
  },
  {
    label: 'Settings',
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
  const pathname = usePathname();

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

  const menuItems = filterMenuItemsByRole(clientMenuItems, user?.role);

  // Update local state when prop changes
  useEffect(() => {
    setLocalCurrentPage(currentPath);
  }, [currentPath]);

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
    if (href === '/dashboard') {
      return localCurrentPage === '/dashboard';
    }
    return localCurrentPage.startsWith(href);
  };

  const handleTabClick = (href: string) => {
    // Immediately update local state for instant visual feedback
    setLocalCurrentPage(href);
    
    // Set clicked state for visual feedback
    setClickedTab(href);
    
    // Clear clicked state after a short delay
    setTimeout(() => setClickedTab(null), 200);
    
    // Navigate
    if (onNavigate) {
      onNavigate(href);
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
    const Icon = item.icon;

    return (
      <div key={item.href} className="relative">
        {hasSubItems ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleExpanded(item.href);
            }}
            onMouseEnter={() => handleTabHover(item.href)}
            onMouseLeave={() => setHoveredTab(null)}
            className={cn(
              'nav-item flex items-center justify-between w-full px-3 py-2 text-base font-medium rounded-md transition-all duration-150 ease-out relative',
              active 
                ? 'text-blue-600 bg-blue-50 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
              isHovered ? 'scale-105' : '',
              clickedTab === item.href ? 'scale-95 bg-blue-100 shadow-md' : ''
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn(
                'w-4 h-4',
                active ? 'text-blue-600' : 'text-gray-500'
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
            
            {/* Hover effect */}
            {isHovered && !active && (
              <div className="absolute inset-0 bg-gray-50/50 rounded-md transition-all duration-200"></div>
            )}
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabClick(item.href);
            }}
            onMouseEnter={() => handleTabHover(item.href)}
            onMouseLeave={() => setHoveredTab(null)}
            className={cn(
              'nav-item flex items-center justify-between w-full px-3 py-2 text-base font-medium rounded-md transition-all duration-150 ease-out relative',
              active 
                ? 'text-blue-600 bg-blue-50 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
              isHovered ? 'scale-105' : '',
              clickedTab === item.href ? 'scale-95 bg-blue-100 shadow-md' : ''
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn(
                'w-4 h-4',
                active ? 'text-blue-600' : 'text-gray-500'
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
            
            {/* Hover effect */}
            {isHovered && !active && (
              <div className="absolute inset-0 bg-gray-50/50 rounded-md transition-all duration-200"></div>
            )}
          </button>
        )}

        {/* Sub Items */}
        {hasSubItems && isExpanded && !isCollapsed && (
          <div className="ml-6 mt-1 space-y-1" data-submenu="true">
            {item.subItems?.map((subItem) => {
              const SubIcon = subItem.icon;
              const subActive = isActive(subItem.href);
              
              return (
                <button
                  key={subItem.href}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabClick(subItem.href);
                    // Add small delay before closing submenu to ensure navigation processes
                    setTimeout(() => {
                      setExpandedItems([]);
                    }, 100);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors rounded-md',
                    subActive ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                  )}
                >
                  <SubIcon className="w-4 h-4" />
                  {subItem.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      'flex flex-col h-full bg-white border-r border-gray-200 shadow-sm transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">RentalShop</h1>
            </div>
          </div>
        )}
        
        {isCollapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mx-auto shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapseToggle}
          className="h-8 w-8 text-gray-500 hover:text-gray-900"
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
      <div className="p-4 border-t border-gray-200">
        {user && !isCollapsed && (
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-gray-900 truncate">
                {user.name || user.email}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.role}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {notificationsCount > 0 && (
                <div className="relative">
                  <Bell className="w-4 h-4 text-gray-500" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {notificationsCount}
                  </span>
                </div>
              )}
              {cartItemsCount > 0 && (
                <div className="relative">
                  <ShoppingCart className="w-4 h-4 text-gray-500" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full text-xs text-white flex items-center justify-center">
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
                  <Bell className="w-4 h-4 text-gray-500" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {notificationsCount}
                  </span>
                </div>
              )}
              {cartItemsCount > 0 && (
                <div className="relative">
                  <ShoppingCart className="w-4 h-4 text-gray-500" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full text-xs text-white flex items-center justify-center">
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
              'w-full justify-start text-gray-500 hover:text-gray-900 hover:bg-gray-50',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        )}
      </div>
    </div>
  );
};
