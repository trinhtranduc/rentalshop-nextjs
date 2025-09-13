'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { LucideIcon, Activity, User, Settings, Database, CreditCard, ShoppingCart, Building2, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ActivityItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  description: string;
  icon?: LucideIcon;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface ActivityFeedProps {
  title: string;
  activities: ActivityItem[];
  maxItems?: number;
  className?: string;
}

export default function ActivityFeed({
  title,
  activities,
  maxItems = 10,
  className = ''
}: ActivityFeedProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'info':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDefaultIcon = (action: string, type: string): LucideIcon => {
    const actionLower = action.toLowerCase();
    
    // Map actions to icons
    if (actionLower.includes('create') || actionLower.includes('add')) {
      return Building2;
    } else if (actionLower.includes('update') || actionLower.includes('edit')) {
      return Settings;
    } else if (actionLower.includes('delete') || actionLower.includes('remove')) {
      return AlertCircle;
    } else if (actionLower.includes('login') || actionLower.includes('auth')) {
      return User;
    } else if (actionLower.includes('payment') || actionLower.includes('billing')) {
      return CreditCard;
    } else if (actionLower.includes('order') || actionLower.includes('purchase')) {
      return ShoppingCart;
    } else if (actionLower.includes('backup') || actionLower.includes('system')) {
      return Database;
    } else if (actionLower.includes('error') || actionLower.includes('fail')) {
      return AlertCircle;
    } else if (actionLower.includes('success') || actionLower.includes('complete')) {
      return CheckCircle;
    }
    
    // Default based on type
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertCircle;
      case 'error':
        return AlertCircle;
      case 'info':
      default:
        return Info;
    }
  };

  const displayActivities = activities.slice(0, maxItems);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => {
            const Icon = activity.icon || getDefaultIcon(activity.action, activity.type);
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${getTypeColor(activity.type)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">{activity.user}</span>
                    <span className="text-sm text-text-secondary">{activity.action}</span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{activity.description}</p>
                  <p className="text-xs text-text-tertiary mt-1">{activity.timestamp}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
