'use client';

import React from 'react';
import { Card, CardContent } from '../../../ui/card';
import { LucideIcon } from 'lucide-react';

interface StatItem {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface StatsOverviewProps {
  stats: StatItem[];
  className?: string;
}

export default function StatsOverview({ stats, className = '' }: StatsOverviewProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</p>
                  {stat.trend && (
                    <div className={`flex items-center gap-1 text-sm ${
                      stat.trend.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <span>{stat.trend.isPositive ? '↗' : '↘'}</span>
                      <span>{Math.abs(stat.trend.value)}%</span>
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
