import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { TrendingUp, TrendingDown, Activity, Cpu, Monitor, HardDrive, Wifi, Database, Globe } from 'lucide-react';

export interface PerformanceMetric {
  id: string;
  name: string;
  category: 'CPU' | 'MEMORY' | 'DISK' | 'NETWORK' | 'DATABASE' | 'API';
  value: number;
  unit: string;
  threshold: {
    warning: number;
    critical: number;
  };
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  trend: 'UP' | 'DOWN' | 'STABLE';
  change: number;
  timestamp: string;
  description: string;
}

interface PerformanceMetricCardProps {
  metric: PerformanceMetric;
  onClick?: (metric: PerformanceMetric) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'CPU': return Cpu;
    case 'MEMORY': return Monitor;
    case 'DISK': return HardDrive;
    case 'NETWORK': return Wifi;
    case 'DATABASE': return Database;
    case 'API': return Globe;
    default: return Activity;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'HEALTHY': return 'bg-green-100 text-green-800';
    case 'WARNING': return 'bg-yellow-100 text-yellow-800';
    case 'CRITICAL': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'UP': return TrendingUp;
    case 'DOWN': return TrendingDown;
    case 'STABLE': return Activity;
    default: return Activity;
  }
};

const getTrendColor = (trend: string, change: number) => {
  if (trend === 'UP') return 'text-red-500';
  if (trend === 'DOWN') return 'text-green-500';
  return 'text-gray-500';
};

function PerformanceMetricCard({ metric, onClick }: PerformanceMetricCardProps) {
  const Icon = getCategoryIcon(metric.category);
  const TrendIcon = getTrendIcon(metric.trend);
  const trendColor = getTrendColor(metric.trend, metric.change);

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${onClick ? 'hover:border-primary' : ''}`}
      onClick={() => onClick?.(metric)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">
          {metric.name}
        </CardTitle>
        <Icon className="h-4 w-4 text-text-tertiary" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-text-primary">
              {metric.value}{metric.unit}
            </span>
            <div className="flex items-center space-x-1">
              <TrendIcon className={`h-3 w-3 ${trendColor}`} />
              <span className={`text-xs ${trendColor}`}>
                {metric.change > 0 ? '+' : ''}{metric.change}{metric.unit}
              </span>
            </div>
          </div>
          <Badge className={getStatusColor(metric.status)}>
            {metric.status}
          </Badge>
        </div>
        <p className="text-xs text-text-tertiary mt-1">
          {metric.description}
        </p>
        <div className="mt-2 text-xs text-text-tertiary">
          <div>Warn: {metric.threshold.warning}{metric.unit}</div>
          <div>Critical: {metric.threshold.critical}{metric.unit}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export { PerformanceMetricCard };
export default PerformanceMetricCard;
