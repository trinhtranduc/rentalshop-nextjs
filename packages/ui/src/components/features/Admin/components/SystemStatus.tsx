'use client';

import React from 'react';
import { Card, CardContent } from '../../../ui/card';
import { LucideIcon } from 'lucide-react';

interface StatusItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  status?: 'healthy' | 'warning' | 'error';
}

interface SystemStatusProps {
  statusItems: StatusItem[];
  className?: string;
}

export default function SystemStatus({ statusItems, className = '' }: SystemStatusProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getStatusBgColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'error':
        return 'bg-red-100';
      default:
        return 'bg-blue-100';
    }
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {statusItems.map((item, index) => {
        const Icon = item.icon;
        const statusColor = item.status ? getStatusColor(item.status) : item.color;
        const statusBgColor = item.status ? getStatusBgColor(item.status) : item.bgColor;
        
        return (
          <Card key={index}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">{item.label}</p>
                  <p className={`text-2xl font-bold ${statusColor}`}>{item.value}</p>
                </div>
                <div className={`p-3 rounded-full ${statusBgColor}`}>
                  <Icon className={`h-6 w-6 ${statusColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
