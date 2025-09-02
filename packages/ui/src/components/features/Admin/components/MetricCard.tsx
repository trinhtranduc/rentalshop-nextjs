'use client';

import React from 'react';
import { Card, CardContent } from '../../../ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  icon: LucideIcon;
  color: string;
  bgColor: string;
  className?: string;
}

export default function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  bgColor,
  className = ''
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {change && (
              <div className={`flex items-center gap-1 text-sm mt-1 ${
                change.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{change.isPositive ? '↗' : '↘'}</span>
                <span>{Math.abs(change.value)}%</span>
                <span className="text-text-tertiary">vs {change.period}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
