import React, { useState } from 'react';
import { Sidebar } from './sidebar';

interface DashboardWrapperProps {
  children: React.ReactNode;
  user?: any;
  onLogout?: () => void;
  currentPath?: string;
  hideSidebar?: boolean;
  allowCollapse?: boolean;
}

export default function DashboardWrapper({ 
  children, 
  user, 
  onLogout = () => {}, 
  currentPath = '',
  hideSidebar = false,
  allowCollapse = true
}: DashboardWrapperProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleCollapseToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-50">
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
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
} 