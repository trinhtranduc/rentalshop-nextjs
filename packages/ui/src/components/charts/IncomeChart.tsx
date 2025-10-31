import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { useCommonTranslations } from '@rentalshop/hooks';
import { useFormattedDaily, useFormattedMonthOnly } from '@rentalshop/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface RevenueData {
  period: string;
  actual: number;
  projected: number;
}

interface IncomeChartProps {
  data: RevenueData[];
  loading?: boolean;
  actualLabel?: string;
  projectedLabel?: string;
  noDataText?: string;
  loadingText?: string;
  timePeriod?: 'month' | 'year';
}

export const IncomeChart: React.FC<IncomeChartProps> = ({ 
  data, 
  loading = false,
  actualLabel = "Actual Revenue",
  projectedLabel = "Projected Revenue",
  noDataText = "No data available",
  loadingText = "Loading chart data...",
  timePeriod = 'month'
}) => {
  const tc = useCommonTranslations();
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">{loadingText}</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">{noDataText}</div>
      </div>
    );
  }

  // Transform data for Recharts with localized formatting based on time period
  const chartData = data.map(item => {
    // Use different formatting based on time period
    const formattedPeriod = timePeriod === 'year' 
      ? useFormattedMonthOnly(item.period)  // For yearly: 01/25, 02/25, etc.
      : useFormattedDaily(item.period);     // For monthly: 01/10, 02/10, etc.
    
    return {
      period: formattedPeriod,
      [actualLabel]: item.actual,
      [projectedLabel]: item.projected,
    };
  });

  // Custom tooltip formatter
  const formatTooltip = (value: number, name: string) => [
    `$${value.toLocaleString()}`,
    name
  ];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="period" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={formatTooltip}
          labelStyle={{ color: '#374151' }}
        />
        <Legend />
        <Bar 
          dataKey={actualLabel} 
          fill="#3B82F6" 
          radius={[4, 4, 0, 0]}
          name={actualLabel}
        />
        <Bar 
          dataKey={projectedLabel} 
          fill="#10B981" 
          radius={[4, 4, 0, 0]}
          name={projectedLabel}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}; 