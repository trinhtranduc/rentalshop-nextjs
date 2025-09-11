'use client';

import React, { useState } from 'react';
import { AdminSidebar } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { Menu, X } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  user?: any;
  onLogout?: () => void;
  notificationsCount?: number;
}

export default function AdminLayout({ 
  children, 
  user, 
  onLogout, 
  notificationsCount = 0 
}: AdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Default logout behavior - redirect to login
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex h-screen bg-bg-primary">
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
        <AdminSidebar
          user={user}
          isOpen={isMobileMenuOpen}
          onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onLogout={handleLogout}
          isCollapsed={isCollapsed}
          onCollapseToggle={() => setIsCollapsed(!isCollapsed)}
          notificationsCount={notificationsCount}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar for Mobile */}
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
            <span className="font-semibold text-text-primary">RentalShop Admin</span>
          </div>

          <div className="w-8" /> {/* Spacer for centering */}
        </div>

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
