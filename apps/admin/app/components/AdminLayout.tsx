'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarSkeleton, HeaderSkeleton } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { AdminShell } from './shell/AdminShell';
import SubscriptionExpiryBanner from './SubscriptionExpiryBanner';
import { isArticleOnlyAdminPath } from '@rentalshop/ui';

interface AdminLayoutProps {
  children: React.ReactNode;
  notificationsCount?: number;
}

export default function AdminLayout({ 
  children, 
  notificationsCount = 0 
}: AdminLayoutProps) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';
  const isPublicPage = isLoginPage || pathname === '/';
  const showSidebar = Boolean(user) && !isPublicPage;

  // ARTICLE role: only blog CMS routes
  useEffect(() => {
    if (!user || user.role !== 'ARTICLE' || pathname === '/login') return;
    if (!isArticleOnlyAdminPath(pathname)) {
      router.replace('/posts');
    }
  }, [user, pathname, router]);

  // Show content skeleton while checking auth — never show sidebar until user is confirmed
  if (loading) {
    return (
      <div className="flex h-screen bg-bg-primary">
        {showSidebar && (
          <div className="hidden w-[248px] shrink-0 border-r border-border bg-bg-card lg:block">
            <SidebarSkeleton />
          </div>
        )}
        <div className="flex flex-1 flex-col overflow-hidden">
          {showSidebar && <HeaderSkeleton />}
          <main
            className={`flex-1 overflow-y-auto bg-bg-primary ${isPublicPage ? '' : 'p-4'}`}
          >
            {isPublicPage ? (
              children
            ) : (
              <div className="space-y-4">
                <div className="h-8 w-1/4 animate-pulse rounded bg-bg-tertiary" />
                <div className="h-64 animate-pulse rounded bg-bg-tertiary" />
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated (public pages excluded)
  if (!user && !isPublicPage) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  if (!showSidebar) {
    return (
      <div className="flex h-screen bg-bg-primary">
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-bg-primary">{children}</main>
      </div>
    );
  }

  return (
    <AdminShell user={user} pathname={pathname} onLogout={handleLogout} banner={<SubscriptionExpiryBanner />}>
      {children}
    </AdminShell>
  );
}
