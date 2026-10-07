'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LoadingIndicator, CurrencyProvider } from '@rentalshop/ui';
import { ShopShell } from './shell/ShopShell';
import { ThemeProvider } from '../providers/ThemeProvider';
import { useAuth, useCommonTranslations, useGlobalErrorHandler } from '@rentalshop/hooks';
import type { CurrencyCode } from '@rentalshop/types';
import { clearAuthData } from '@rentalshop/utils';
import { isPublicRoute, isAuthRoute, isPublicInfoRoute } from '../../lib/routes';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { user, logout, loading } = useAuth();
  const t = useCommonTranslations();
  const router = useRouter();
  const pathname = usePathname();
  
  // ✅ GLOBAL ERROR HANDLER: Tự động xử lý và hiển thị toast cho tất cả API errors
  useGlobalErrorHandler();

  // ============================================================================
  // ROUTE CONFIGURATION
  // ============================================================================
  const isAuthPage = isAuthRoute(pathname);
  const isPublicPage = isPublicRoute(pathname);
  // Every edit page (Sửa đơn #523, Sửa sản phẩm #547, Sửa khách hàng #541) renders inside the shell
  const isAffiliateGuidePage = pathname?.includes('/affiliate/guide');
  const isBlogPage = pathname?.startsWith('/blog');
  const showSidebar = !isPublicPage && !isAffiliateGuidePage && !isBlogPage;
  const canRenderWithoutAuth = isPublicPage && !isAuthPage;

  // ============================================================================
  // AUTH STATE
  // ============================================================================
  const hasToken = typeof window !== 'undefined' && (
    localStorage.getItem('authData') || localStorage.getItem('authToken')
  );
  const merchantCurrency: CurrencyCode = ((user?.merchant as { currency?: CurrencyCode } | undefined)?.currency) || 'USD';
  
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
          clearAuthData();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasToken, isAuthPage, user, router]);
  
  // ============================================================================
  // EARLY RETURNS - Auth guards and loading states
  // ============================================================================
  
  // Public content must not be blocked by auth initialization or stale tokens.
  if (loading && !canRenderWithoutAuth) {
    return <LoadingScreen message={`${t('labels.loading')}...`} />;
  }
  
  // Redirect logged-in users from auth pages
  if (user && isAuthPage && !isPublicInfoRoute(pathname)) {
    return <LoadingScreen message="Redirecting..." />;
  }
  
  // Protected and auth pages still wait for user state synchronization.
  if (hasToken && !user && !canRenderWithoutAuth) {
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
      <div className="ar-theme min-h-screen bg-ar-page flex items-center justify-center">
        <LoadingIndicator variant="circular" size="lg" message={message} />
      </div>
    );
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleLogout = () => logout();

  return (
    <ThemeProvider>
      <CurrencyProvider merchantCurrency={merchantCurrency}>
        {showSidebar ? (
          <ShopShell user={user} pathname={pathname} onLogout={handleLogout}>
            <div className="w-full min-w-0">{children}</div>
          </ShopShell>
        ) : (
          <div className="flex h-screen bg-bg-primary">
            <main className="flex-1 bg-bg-primary overflow-y-auto min-w-0">
              <div className="w-full min-w-0">{children}</div>
            </main>
          </div>
        )}
      </CurrencyProvider>
    </ThemeProvider>
  );
}
