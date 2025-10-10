'use client';

import React from 'react';
import { PageHeader, PageTitle } from '../../../layout/PageWrapper';
import { Button } from '../../../ui/button';
import { LucideIcon } from 'lucide-react';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  className?: string;
}

export default function AdminPageHeader({
  title,
  subtitle,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  className = ''
}: AdminPageHeaderProps) {
  return (
    <PageHeader className={className}>
      <div className="flex justify-between items-start">
        <div>
          <PageTitle subtitle={subtitle}>
            {title}
          </PageTitle>
        </div>
        {actionLabel && onAction && ActionIcon && (
          <Button onClick={onAction}>
            <ActionIcon className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </div>
    </PageHeader>
  );
}
