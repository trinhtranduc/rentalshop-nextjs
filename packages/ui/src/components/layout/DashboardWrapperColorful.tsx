import React, { useState } from 'react';
import { Sidebar } from './sidebar';

interface DashboardWrapperColorfulProps {
  children: React.ReactNode;
  user?: any;
  onLogout?: () => void;
  currentPath?: string;
  hideSidebar?: boolean;
  allowCollapse?: boolean;
}

export default function DashboardWrapperColorful({ 
  children, 
  user, 
  onLogout = () => {}, 
  currentPath = '',
  hideSidebar = false,
  allowCollapse = true
}: DashboardWrapperColorfulProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleCollapseToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-brand-50 via-bg-primary to-brand-100">
      {!hideSidebar && (
        <Sidebar 
          user={user}
          onLogout={onLogout}
          currentPath={currentPath}
          isCollapsed={sidebarCollapsed}
          onCollapseToggle={allowCollapse ? handleCollapseToggle : undefined}
        />
      )}
      <main className={`flex-1 overflow-y-auto ${!hideSidebar ? 'transition-all duration-300 ease-in-out' : ''}`}>
        <div className="p-8 space-y-8">
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-brand-500 to-action-primary rounded-2xl p-8 shadow-glow animate-fade-in">
            <h1 className="text-4xl font-display font-bold text-white mb-2">
              Welcome to RentalShop
            </h1>
            <p className="text-xl text-brand-100 font-medium">
              Your comprehensive rental management dashboard
            </p>
          </div>
          
          {/* Main Content with Enhanced Styling */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
} 