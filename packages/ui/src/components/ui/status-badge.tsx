'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { getStatusColor, getStatusLabel } from '@rentalshop/constants';

export interface StatusBadgeProps {
  status: string;
  type?: 'subscription' | 'order' | 'payment' | 'entity' | 'availability';
  variant?: 'default' | 'outline' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Special statuses that don't fit the standard categories
const specialStatusConfig = {
  // User Statuses
  online: {
    color: 'bg-action-success/10 text-action-success border-action-success/20',
    icon: '🟢'
  },
  offline: {
    color: 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20',
    icon: '⚪'
  },
  
  // System Statuses
  healthy: {
    color: 'bg-action-success/10 text-action-success border-action-success/20',
    icon: '✅'
  },
  warning: {
    color: 'bg-action-warning/10 text-action-warning border-action-warning/20',
    icon: '⚠️'
  },
  error: {
    color: 'bg-action-danger/10 text-action-danger border-action-danger/20',
    icon: '❌'
  },
  
  // Outlet Statuses
  default: {
    color: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    icon: ''
  },
  'main branch': {
    color: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    icon: ''
  }
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'entity',
  variant = 'default',
  size = 'md',
  className
}) => {
  // Check if it's a special status first
  const specialConfig = specialStatusConfig[status.toLowerCase() as keyof typeof specialStatusConfig];
  
  let config;
  if (specialConfig) {
    config = specialConfig;
  } else {
    // Use centralized status constants
    const colorClass = getStatusColor(status, type);
    const label = getStatusLabel(status, type);
    config = {
      color: colorClass,
      icon: ''
    };
  }

  const baseClasses = cn(
    'inline-flex items-center gap-1.5 rounded-full font-medium border',
    sizeClasses[size],
    config.color,
    className
  );

  return (
    <span className={baseClasses}>
      <span className="text-xs">{config.icon}</span>
      <span className="capitalize">{status}</span>
    </span>
  );
};

export default StatusBadge;
