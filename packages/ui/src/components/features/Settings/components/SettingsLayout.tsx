'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button
} from '@rentalshop/ui';
import { ChevronRight } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface SettingsMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  roles?: string[];
}

export interface SettingsLayoutProps {
  user: any;
  loading: boolean;
  children: React.ReactNode;
  menuItems: SettingsMenuItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
}

// ============================================================================
// SETTINGS LAYOUT COMPONENT
// ============================================================================

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  user,
  loading,
  children,
  menuItems,
  activeSection,
  onSectionChange
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Show loading state while user data is being fetched
  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Settings</PageTitle>
          <p>Manage your account settings and preferences</p>
        </PageHeader>
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Show error state if user is not loaded
  if (!user) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Settings</PageTitle>
          <p>Manage your account settings and preferences</p>
        </PageHeader>
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">You need to be logged in to access settings</p>
            <div className="space-x-4">
              <Button onClick={() => window.location.href = '/login'}>
                Go to Login
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Settings</PageTitle>
        <p>Manage your account settings and preferences</p>
      </PageHeader>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <Card>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {menuItems
                  .filter((item) => {
                    // Filter menu items based on user role
                    if (!item.roles) return true; // Show items without role restrictions
                    
                    // Normalize role comparison (trim whitespace, handle case)
                    const userRole = (user?.role || '').trim().toUpperCase();
                    const hasRole = item.roles.some(role => role.toUpperCase() === userRole);
                    
                    return hasRole;
                  })
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{item.label}</p>
                          <p className="text-xs text-gray-500 truncate">{item.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    );
                  })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <PageContent>
            {children}
          </PageContent>
        </div>
      </div>
    </PageWrapper>
  );
};
