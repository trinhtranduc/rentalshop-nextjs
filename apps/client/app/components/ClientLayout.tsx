'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ClientSidebar, LoadingIndicator, CurrencyProvider, LanguageSwitcher } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { Menu, X } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useAuth, useCommonTranslations } from '@rentalshop/hooks';
import type { CurrencyCode } from '@rentalshop/types';
import { isPublicRoute, isAuthRoute, isPublicInfoRoute } from '../../lib/routes';

interface ClientLayoutProps {
  children: React.ReactNode;
  notificationsCount?: number;
  cartItemsCount?: number;
  onSearch?: (query: string) => void;
}

export default function ClientLayout({ 
  children, 
  notificationsCount = 0,
  cartItemsCount = 0,
  onSearch
}: ClientLayoutProps) {
  const { user, logout, loading } = useAuth();
  const t = useCommonTranslations();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { navigateTo, prefetchRoute } = useNavigation();
  const pathname = usePathname();

  // Get merchant currency from user object (already loaded from login)
  const merchantCurrency: CurrencyCode = (user?.merchant?.currency as CurrencyCode) || 'USD';

  // Show loading state while checking authentication
      if (loading) {
        return (
          <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
            <LoadingIndicator 
              variant="circular" 
              size="lg"
              message={`${t('labels.loading')}...`}
            />
          </div>
        );
      }

  // ✅ OFFICIAL WAY: Use centralized route configuration
  // Check route types using centralized route utilities
  const isAuthPage = isAuthRoute(pathname);
  const isPublicPage = isPublicRoute(pathname);
  
  // Check if we're on full-width pages - hide sidebar for better space
  // Edit order route: /orders/[id]/edit
  const isFullWidthPage = pathname === '/orders/create' || pathname?.includes('/edit');
  
  // Redirect to login if not authenticated (except on public pages)
  // But only redirect if we're not currently on a page that might be setting up auth
  if (!user && !isPublicPage && !loading) {
    if (typeof window !== 'undefined') {
      // Check if there's a token in localStorage (check both old and new format)
      const authData = localStorage.getItem('authData');
      const oldToken = localStorage.getItem('authToken');
      const hasToken = authData || oldToken;
      
      // If there's a token, wait for auth state to sync (give it more time)
      if (hasToken) {
        // Don't redirect immediately - wait for auth state to sync
        // This handles the case where user just logged in and token is stored
        // but React state hasn't updated yet
        console.log('⏳ ClientLayout: Token found but user state not loaded, waiting...');
        return (
          <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
            <LoadingIndicator 
              variant="circular" 
              size="lg"
              message={`${t('labels.loading')}...`}
            />
          </div>
        );
      }
      
      // No token and not loading - redirect to login
      console.log('🚨 ClientLayout: No user, no token, redirecting to login');
      window.location.href = '/login';
    }
    return null;
  }

  // If user is logged in but on auth page (not public info pages), redirect to dashboard
  // Public info pages like /email-verification can still be accessed by logged-in users
  if (user && isAuthRoute(pathname) && !isPublicInfoRoute(pathname)) {
    if (typeof window !== 'undefined') {
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <LoadingIndicator 
          variant="circular" 
          size="lg"
          message="Redirecting..."
        />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
  };

  const handleSearch = (query: string) => {
    if (onSearch) {
      onSearch(query);
    } else {
      // Default search behavior
      console.log('Search query:', query);
    }
  };

  // Hide sidebar on public pages (landing page, auth pages) and full-width pages
  const showSidebar = !isPublicPage && !isFullWidthPage;

  return (
    <CurrencyProvider merchantCurrency={merchantCurrency}>
      <div className="flex h-screen bg-bg-primary">
      {/* Show sidebar on all pages except login */}
      {showSidebar && (
        <>
          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`
            fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <ClientSidebar
              user={user}
              isOpen={isMobileMenuOpen}
              onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onLogout={handleLogout}
              currentPath={pathname}
              isCollapsed={isCollapsed}
              onCollapseToggle={() => setIsCollapsed(!isCollapsed)}
              notificationsCount={notificationsCount}
              cartItemsCount={cartItemsCount}
              onNavigate={navigateTo}
              onPrefetch={prefetchRoute}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${!showSidebar ? 'w-full' : ''}`}>
        {/* Top Bar for Mobile - Only show if sidebar is visible */}
        {showSidebar && (
          <div className="lg:hidden bg-bg-card border-b border-border px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-700 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">RS</span>
            </div>
            <span className="font-semibold text-text-primary">AnyRent</span>
          </div>

          <div className="w-8" /> {/* Spacer for centering */}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 bg-bg-primary overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
      </div>
    </CurrencyProvider>
  );
}
