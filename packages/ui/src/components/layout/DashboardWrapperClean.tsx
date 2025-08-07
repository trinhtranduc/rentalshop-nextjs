import React from 'react';
import { Sidebar } from './sidebar';

interface DashboardWrapperCleanProps {
  children: React.ReactNode;
}

export default function DashboardWrapperClean({ children }: DashboardWrapperCleanProps) {
  return (
    <div className="flex h-screen bg-bg-secondary">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
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