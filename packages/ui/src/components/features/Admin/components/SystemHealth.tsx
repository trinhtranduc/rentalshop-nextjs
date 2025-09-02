'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { LucideIcon } from 'lucide-react';

interface HealthMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  icon: LucideIcon;
}

interface SystemHealthProps {
  title: string;
  metrics: HealthMetric[];
  className?: string;
}

export default function SystemHealth({
  title,
  metrics,
  className = ''
}: SystemHealthProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'warning':
        return 'Warning';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const percentage = (metric.value / metric.max) * 100;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-text-tertiary" />
                    <span className="text-sm font-medium text-text-primary">{metric.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary">
                      {metric.value} / {metric.max} {metric.unit}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${getStatusColor(metric.status)}`}>
                      {getStatusText(metric.status)}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getStatusColor(metric.status)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
