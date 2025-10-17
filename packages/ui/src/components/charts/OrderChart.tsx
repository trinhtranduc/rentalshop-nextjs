import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { useCommonTranslations } from '@rentalshop/hooks';
import { useFormattedDaily, useFormattedMonthOnly } from '@rentalshop/utils';
import { 
  LineChart, 
  Line, 
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

interface OrderChartProps {
  data: RevenueData[];
  loading?: boolean;
  legendLabel?: string;
  tooltipLabel?: string;
  timePeriod?: 'month' | 'year';
}

export const OrderChart: React.FC<OrderChartProps> = ({ 
  data, 
  loading = false, 
  legendLabel = "Rental Orders",
  tooltipLabel = "orders",
  timePeriod = 'month'
}) => {
  const tc = useCommonTranslations();
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">No data available</div>
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
      [legendLabel]: item.actual,
    };
  });

  // Custom tooltip formatter
  const formatTooltip = (value: number, name: string) => {
    return [`${value.toLocaleString()} ${tooltipLabel}`, legendLabel];
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="period" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tickFormatter={(value) => `${value}`}
          tick={{ fontSize: 12 }}
          domain={[0, 'dataMax']}
          allowDecimals={false}
          tickCount={6}
        />
        <Tooltip 
          formatter={formatTooltip}
          labelStyle={{ color: '#374151' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey={legendLabel} 
          stroke="#3B82F6" 
          strokeWidth={2}
          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}; 