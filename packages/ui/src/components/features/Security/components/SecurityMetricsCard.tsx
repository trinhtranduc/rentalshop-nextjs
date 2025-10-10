import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';

interface SecurityMetric {
  title: string;
  value: number | string;
  change?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

interface SecurityMetricsCardProps {
  metrics: SecurityMetric[];
}

export default function SecurityMetricsCard({ metrics }: SecurityMetricsCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const ChangeIcon = metric.change?.isPositive ? TrendingUp : TrendingDown;
        
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-text-primary">
                  {metric.value}
                </div>
                {metric.change && (
                  <div className="flex items-center space-x-1">
                    <ChangeIcon className={`h-3 w-3 ${
                      metric.change.isPositive ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <span className={`text-xs ${
                      metric.change.isPositive ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {metric.change.isPositive ? '+' : ''}{metric.change.value}%
                    </span>
                  </div>
                )}
              </div>
              {metric.change && (
                <p className="text-xs text-text-tertiary mt-1">
                  {metric.change.period}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
