import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtitle?: string;
}

export const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  trendValue,
  subtitle
}) => {
  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '→';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={`flex items-center text-sm ${getTrendColor(trend)}`}>
                <span className="mr-1">{getTrendIcon(trend)}</span>
                <span>{trendValue}</span>
                {trend !== 'neutral' && (
                  <Badge 
                    variant={trend === 'up' ? 'default' : 'destructive'} 
                    className="ml-2 text-xs"
                  >
                    {trend === 'up' ? 'Good' : 'Needs Attention'}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${color} flex-shrink-0`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 