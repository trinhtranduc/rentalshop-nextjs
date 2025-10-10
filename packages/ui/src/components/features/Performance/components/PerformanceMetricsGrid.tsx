import React from 'react';
import { PerformanceMetricCard, PerformanceMetric } from './PerformanceMetricCard';

interface PerformanceMetricsGridProps {
  metrics: PerformanceMetric[];
  onMetricClick?: (metric: PerformanceMetric) => void;
  loading?: boolean;
}

export default function PerformanceMetricsGrid({ 
  metrics, 
  onMetricClick, 
  loading = false 
}: PerformanceMetricsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-tertiary">No performance metrics available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <PerformanceMetricCard
          key={metric.id}
          metric={metric}
          onClick={onMetricClick}
        />
      ))}
    </div>
  );
}
