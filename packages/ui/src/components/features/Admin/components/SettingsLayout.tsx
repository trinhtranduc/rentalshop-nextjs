'use client';

import React from 'react';
import { PageWrapper, PageContent } from '../../../layout/PageWrapper';
import AdminPageHeader from './AdminPageHeader';
import SettingsNavigation from './SettingsNavigation';
import SystemStatus from './SystemStatus';
import { LucideIcon } from 'lucide-react';

interface SettingsTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface StatusItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  status?: 'healthy' | 'warning' | 'error';
}

interface SettingsLayoutProps {
  title: string;
  subtitle?: string;
  tabs: SettingsTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  statusItems: StatusItem[];
  children: React.ReactNode;
  onSave?: () => void;
  onReset?: () => void;
  saving?: boolean;
  className?: string;
}

export default function SettingsLayout({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  statusItems,
  children,
  onSave,
  onReset,
  saving = false,
  className = ''
}: SettingsLayoutProps) {
  return (
    <PageWrapper className={className}>
      <AdminPageHeader
        title={title}
        subtitle={subtitle}
        actionLabel="Save Changes"
        onAction={onSave}
      />

      <PageContent>
        {/* System Status */}
        <SystemStatus
          statusItems={statusItems}
          className="mb-8"
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <SettingsNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </PageContent>
    </PageWrapper>
  );
}
