'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ClientSidebar } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { Menu, X } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useAuth } from '@rentalshop/hooks';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { navigateTo, prefetchRoute } = useNavigation();
  const pathname = usePathname();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if we're on auth pages - hide sidebar on auth pages
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forget-password';
  
  // Check if we're on full-width pages - hide sidebar for better space
  // Edit order route: /orders/[id]/edit
  const isFullWidthPage = pathname === '/orders/create' || pathname?.includes('/edit');
  
  // Redirect to login if not authenticated (except on auth pages)
  if (!user && !isAuthPage) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
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

  // Hide sidebar on auth pages and full-width pages
  const showSidebar = !isAuthPage && !isFullWidthPage;

  return (
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
      <div className={`flex-1 flex flex-col overflow-hidden ${!showSidebar ? 'w-full' : ''}`}>
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
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">RS</span>
            </div>
            <span className="font-semibold text-text-primary">RentalShop</span>
          </div>

          <div className="w-8" /> {/* Spacer for centering */}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-bg-primary">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
