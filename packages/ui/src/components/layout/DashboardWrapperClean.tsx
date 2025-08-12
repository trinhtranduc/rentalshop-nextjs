import React, { useState } from 'react';
import { Sidebar } from './sidebar';

interface DashboardWrapperCleanProps {
  children: React.ReactNode;
  user?: any;
  onLogout?: () => void;
  currentPath?: string;
  hideSidebar?: boolean;
  allowCollapse?: boolean;
}

export default function DashboardWrapperClean({ 
  children, 
  user, 
  onLogout = () => {}, 
  currentPath = '',
  hideSidebar = false,
  allowCollapse = true
}: DashboardWrapperCleanProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleCollapseToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-bg-secondary">
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
        <div className="p-6 space-y-6">
          {/* Main Content */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
} 