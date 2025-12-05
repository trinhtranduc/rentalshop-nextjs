'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const { user, logout, loading, refreshUser } = useAuth();
  const t = useCommonTranslations();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { navigateTo, prefetchRoute } = useNavigation();
  const pathname = usePathname();

  // ============================================================================
  // ROUTE CONFIGURATION
  // ============================================================================
  const isAuthPage = isAuthRoute(pathname);
  const isPublicPage = isPublicRoute(pathname);
  const isFullWidthPage = pathname?.includes('/edit');
  const showSidebar = !isPublicPage && !isFullWidthPage;
  
  // ============================================================================
  // AUTH STATE
  // ============================================================================
  const hasToken = typeof window !== 'undefined' && (
    localStorage.getItem('authData') || localStorage.getItem('authToken')
  );
  const merchantCurrency: CurrencyCode = (user?.merchant?.currency as CurrencyCode) || 'USD';
  
  // ============================================================================
  // REDIRECT LOGIC - All hooks must be called before early returns
  // ============================================================================
  
  // Redirect logged-in users away from auth pages
  useEffect(() => {
    if (user && isAuthPage && !isPublicInfoRoute(pathname)) {
      router.push('/dashboard');
    }
  }, [user, isAuthPage, pathname, router]);
  
  // Handle token sync for auth pages (user has token but state not synced yet)
  useEffect(() => {
    if (hasToken && isAuthPage && !user) {
      const timer = setTimeout(() => {
        if (user) {
          router.push('/dashboard');
        } else {
          // Token exists but user not synced - likely invalid token
          const { clearAuthData } = require('@rentalshop/utils');
          clearAuthData();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasToken, isAuthPage, user, router]);
  
  // ============================================================================
  // EARLY RETURNS - Auth guards and loading states
  // ============================================================================
  
  // Show loading while auth is initializing
  if (loading) {
    return <LoadingScreen message={`${t('labels.loading')}...`} />;
  }
  
  // Redirect logged-in users from auth pages
  if (user && isAuthPage && !isPublicInfoRoute(pathname)) {
    return <LoadingScreen message="Redirecting..." />;
  }
  
  // Wait for user state sync if token exists
  if (hasToken && !user) {
    return <LoadingScreen message={`${t('labels.loading')}...`} />;
  }
  
  // Redirect unauthenticated users to login (security-critical: use hard reload)
  if (!user && !isPublicPage && !isAuthPage && !hasToken) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }
  
  // ============================================================================
  // HELPER COMPONENTS
  // ============================================================================
  
  function LoadingScreen({ message }: { message: string }) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <LoadingIndicator variant="circular" size="lg" message={message} />
      </div>
    );
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleLogout = () => logout();
  
  const handleSearch = (query: string) => {
    onSearch?.(query) || console.log('Search query:', query);
  };

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
