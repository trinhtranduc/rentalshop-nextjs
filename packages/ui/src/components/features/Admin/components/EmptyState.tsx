'use client';

import React from 'react';
import { Card, CardContent } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent>
        <div className="text-center py-12">
          <Icon className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-secondary mb-2">{title}</h3>
          <p className="text-text-tertiary mb-4">{description}</p>
          {actionLabel && onAction && (
            <Button onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
