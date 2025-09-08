'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'outline' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig = {
  // Merchant Statuses
  active: {
    color: 'bg-action-success/10 text-action-success border-action-success/20',
    icon: ''
  },
  inactive: {
    color: 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20',
    icon: ''
  },
  trial: {
    color: 'bg-action-primary/10 text-action-primary border-action-primary/20',
    icon: ''
  },
  expired: {
    color: 'bg-action-warning/10 text-action-warning border-action-warning/20',
    icon: ''
  },
  cancelled: {
    color: 'bg-action-danger/10 text-action-danger border-action-danger/20',
    icon: ''
  },
  
  // Payment Statuses
  completed: {
    color: 'bg-action-success/10 text-action-success border-action-success/20',
    icon: ''
  },
  pending: {
    color: 'bg-action-warning/10 text-action-warning border-action-warning/20',
    icon: ''
  },
  failed: {
    color: 'bg-action-danger/10 text-action-danger border-action-danger/20',
    icon: ''
  },
  refunded: {
    color: 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20',
    icon: '↩'
  },
  
  // Order Statuses
  reserved: {
    color: 'bg-action-primary/10 text-action-primary border-action-primary/20',
    icon: ''
  },
  pickuped: {
    color: 'bg-action-warning/10 text-action-warning border-action-warning/20',
    icon: ''
  },
  returned: {
    color: 'bg-action-success/10 text-action-success border-action-success/20',
    icon: ''
  },
  
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
  variant = 'default',
  size = 'md',
  className
}) => {
  const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || {
    color: 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20',
    icon: '❓'
  };

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
