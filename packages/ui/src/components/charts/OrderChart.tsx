import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { useCommonTranslations } from '@rentalshop/hooks';
import { useFormattedDaily, useFormattedMonthOnly } from '@rentalshop/utils/client';
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
  [key: string]: any; // Allow dynamic outlet keys like "Outlet1", "Outlet2"
}

interface OutletInfo {
  id: number;
  name: string;
  color?: string;
}

interface OrderChartProps {
  data: RevenueData[];
  loading?: boolean;
  legendLabel?: string;
  tooltipLabel?: string;
  timePeriod?: 'month' | 'year';
  outlets?: OutletInfo[]; // Optional outlet info for comparison mode
}

export const OrderChart: React.FC<OrderChartProps> = ({ 
  data, 
  loading = false, 
  legendLabel = "Rental Orders",
  tooltipLabel = "orders",
  timePeriod = 'month',
  outlets = []
}) => {
  const tc = useCommonTranslations();
  
  // Color palette for multiple outlets
  const outletColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
    '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  
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

  // Check if data has outlet comparison (dynamic keys with outlet names)
  const hasOutletComparison = outlets && outlets.length > 0;
  const outletKeys = hasOutletComparison 
    ? outlets.map(outlet => outlet.name)
    : [];

  // Transform data for Recharts with localized formatting based on time period
  const chartData = data.map(item => {
    // Use different formatting based on time period
    const formattedPeriod = timePeriod === 'year' 
      ? useFormattedMonthOnly(item.period)  // For yearly: 01/25, 02/25, etc.
      : useFormattedDaily(item.period);     // For monthly: 01/10, 02/10, etc.
    
    const result: any = { period: formattedPeriod };
    
    if (hasOutletComparison && outletKeys.length > 0) {
      // Outlet comparison mode: use outlet-specific keys
      outletKeys.forEach((outletName) => {
        result[outletName] = item[outletName] || 0;
      });
    } else {
      // Default mode: use standard label
      result[legendLabel] = item.actual || 0;
    }
    
    return result;
  });

  // Custom tooltip formatter
  const formatTooltip = (value: number, name: string) => {
    return [`${value.toLocaleString()} ${tooltipLabel}`, name];
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
        {hasOutletComparison && outletKeys.length > 0 ? (
          // Render lines for each outlet
          outletKeys.map((outletName, index) => {
            const color = outletColors[index % outletColors.length];
            return (
              <Line 
                key={outletName}
                type="monotone" 
                dataKey={outletName}
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name={outletName}
              />
            );
          })
        ) : (
          // Default: single aggregated series
        <Line 
          type="monotone" 
          dataKey={legendLabel} 
          stroke="#3B82F6" 
          strokeWidth={2}
          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}; 