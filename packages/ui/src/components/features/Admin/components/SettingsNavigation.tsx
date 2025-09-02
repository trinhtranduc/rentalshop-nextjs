'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { LucideIcon } from 'lucide-react';

interface SettingsTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SettingsNavigationProps {
  tabs: SettingsTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function SettingsNavigation({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}: SettingsNavigationProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Settings Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <nav className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-action-primary text-text-inverted'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </CardContent>
    </Card>
  );
}
