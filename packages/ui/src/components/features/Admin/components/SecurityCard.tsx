'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { LucideIcon } from 'lucide-react';

interface SecurityCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  status: 'secure' | 'warning' | 'critical';
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function SecurityCard({
  title,
  description,
  icon: Icon,
  status,
  actionLabel,
  onAction,
  className = ''
}: SecurityCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'secure':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        };
      case 'warning':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200'
        };
      case 'critical':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Card className={`${className} ${config.borderColor} border-2`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {actionLabel && onAction && (
            <Button variant="outline" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">{description}</p>
      </CardContent>
    </Card>
  );
}
