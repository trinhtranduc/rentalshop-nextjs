import React from 'react';
import { Sidebar } from './sidebar';

interface DashboardWrapperProps {
  children: React.ReactNode;
  user?: any;
  onLogout?: () => void;
  currentPath?: string;
}

export default function DashboardWrapper({ 
  children, 
  user, 
  onLogout = () => {}, 
  currentPath = '' 
}: DashboardWrapperProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        user={user}
        onLogout={onLogout}
        currentPath={currentPath}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
} 