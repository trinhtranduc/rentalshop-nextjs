'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { LucideIcon } from 'lucide-react';

interface ActivityItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  description: string;
  icon: LucideIcon;
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

  const displayActivities = activities.slice(0, maxItems);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => {
            const Icon = activity.icon;
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
