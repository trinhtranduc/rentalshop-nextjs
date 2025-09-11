'use client';

import React, { useState } from 'react';
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
  CreditCard,
  Calendar,
  Clock,
  Database,
  ShieldCheck,
  FileText,
  Store,
  LogOut,
  User,
  Bell
} from 'lucide-react';

export interface AdminSidebarProps {
  user?: any;
  isOpen?: boolean;
  onToggle?: () => void;
  onLogout?: () => void;
  currentPath?: string;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
  notificationsCount?: number;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  subItems?: MenuItem[];
}

const adminMenuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'Merchants',
    href: '/merchants',
    icon: Building2,
  },
  {
    label: 'Plans',
    href: '/plans',
    icon: Package,
  },
  {
    label: 'Subscriptions',
    href: '/subscriptions',
    icon: Clock,
  },
  {
    label: 'Payments',
    href: '/payments',
    icon: CreditCard,
  },
  {
    label: 'Users',
    href: '/users',
    icon: Users,
  },
  {
    label: 'Products',
    href: '/products',
    icon: Package,
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: ShoppingCart,
    badge: '3',
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: Users,
  },
  {
    label: 'Calendar',
    href: '/calendar',
    icon: Calendar,
  },
  {
    label: 'System',
    href: '/system',
    icon: Settings,
    subItems: [
      { 
        label: 'Backup Management', 
        href: '/system/backup', 
        icon: Database 
      },
      { 
        label: 'Data Integrity', 
        href: '/system/integrity', 
        icon: ShieldCheck 
      },
      { 
        label: 'Audit Logs', 
        href: '/system/audit-logs', 
        icon: FileText 
      }
    ]
  }
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  user,
  isOpen = true,
  onToggle,
  onLogout,
  currentPath = '',
  isCollapsed = false,
  onCollapseToggle,
  notificationsCount = 0
}) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems.includes(item.href);
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <div key={item.href}>
        <div className="flex items-center">
          {hasSubItems ? (
            <button
              onClick={() => toggleExpanded(item.href)}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 group',
                active
                  ? 'bg-action-primary text-text-inverted'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              )}
            >
              <div className="flex items-center space-x-3">
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  active ? 'text-text-inverted' : 'text-text-secondary'
                )} />
                {!isCollapsed && (
                  <span className="text-base">{item.label}</span>
                )}
              </div>
              {!isCollapsed && (
                <ChevronRight className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  isExpanded ? 'rotate-90' : ''
                )} />
              )}
            </button>
          ) : (
            <Link
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 group',
                active
                  ? 'bg-action-primary text-text-inverted'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              )}
            >
              <div className="flex items-center space-x-3">
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  active ? 'text-text-inverted' : 'text-text-secondary'
                )} />
                {!isCollapsed && (
                  <span className="text-base">{item.label}</span>
                )}
              </div>
              {!isCollapsed && item.badge && (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          )}
        </div>

        {/* Sub Items */}
        {hasSubItems && isExpanded && !isCollapsed && (
          <div className="ml-6 mt-1 space-y-1">
            {item.subItems?.map((subItem) => {
              const SubIcon = subItem.icon;
              const subActive = isActive(subItem.href);
              
              return (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors duration-200',
                    subActive
                      ? 'bg-action-primary/20 text-action-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                  )}
                >
                  <SubIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{subItem.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      'flex flex-col h-full bg-bg-card border-r border-border transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">RentalShop</h1>
              <p className="text-xs text-text-secondary">Admin</p>
            </div>
          </div>
        )}
        
        {isCollapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mx-auto">
            <Store className="w-5 h-5 text-white" />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapseToggle}
          className="h-8 w-8"
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
        {adminMenuItems.map((item) => renderMenuItem(item))}
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
              <p className="text-xs text-text-secondary truncate">
                {user.role}
              </p>
            </div>
            {notificationsCount > 0 && (
              <div className="relative">
                <Bell className="w-4 h-4 text-text-secondary" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {notificationsCount}
                </span>
              </div>
            )}
          </div>
        )}

        {user && isCollapsed && (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            {notificationsCount > 0 && (
              <div className="relative">
                <Bell className="w-4 h-4 text-text-secondary" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {notificationsCount}
                </span>
              </div>
            )}
          </div>
        )}

        {onLogout && (
          <Button
            variant="ghost"
            onClick={onLogout}
            className={cn(
              'w-full justify-start text-text-secondary hover:text-text-primary hover:bg-bg-secondary',
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
