'use client';

import React from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
} from '@rentalshop/ui';
import { useSettingsTranslations } from '@rentalshop/hooks';

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
  const t = useSettingsTranslations();

  // Show loading state while user data is being fetched
  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>{t('title')}</PageTitle>
          <p>{t('subtitle')}</p>
        </PageHeader>
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('loading') || 'Loading settings...'}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const visibleItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    const userRole = (user?.role || '').trim().toUpperCase();
    return item.roles.some((role) => role.toUpperCase() === userRole);
  });

  return (
    <div>
      <PageHeader>
        <PageTitle>{t('title')}</PageTitle>
      </PageHeader>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Section menu: chips that scroll on phones, a short list on desktop */}
        <nav aria-label={t('menuItems.navLabel')} className="lg:w-56 lg:flex-shrink-0">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onSectionChange(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    title={item.description}
                    className={`flex min-h-[40px] w-full items-center gap-2.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors lg:rounded-lg lg:border-0 lg:px-3 ${
                      isActive
                        ? 'border-blue-200 bg-blue-50 text-blue-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 lg:bg-transparent'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Section */}
        <div className="min-w-0 flex-1 lg:max-w-3xl">
          {children}
        </div>
      </div>
    </div>
  );
};
