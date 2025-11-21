import React from 'react';
import { useFormattedDaily, useFormattedMonthOnly } from '@rentalshop/utils';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { useCurrency } from '../../contexts/CurrencyContext';
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
  [key: string]: any; // Allow dynamic outlet keys like "Outlet1_actual", "Outlet2_projected"
}

interface OutletInfo {
  id: number;
  name: string;
  color?: string;
}

interface IncomeChartProps {
  data: RevenueData[];
  loading?: boolean;
  actualLabel?: string;
  projectedLabel?: string;
  noDataText?: string;
  loadingText?: string;
  timePeriod?: 'month' | 'year';
  outlets?: OutletInfo[]; // Optional outlet info for comparison mode
}

export const IncomeChart: React.FC<IncomeChartProps> = ({ 
  data, 
  loading = false,
  actualLabel = "Actual Revenue",
  projectedLabel = "Projected Revenue",
  noDataText = "No data available",
  loadingText = "Loading chart data...",
  timePeriod = 'month',
  outlets = []
}) => {
  const formatMoney = useFormatCurrency();
  const { symbol, currency } = useCurrency();
  
  // Chart colors
  const ACTUAL_COLOR = '#3B82F6'; // Blue
  const PROJECTED_COLOR = '#F59E0B'; // Orange
  
  // Color palette for multiple outlets
  const outletColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
    '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  
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

  // Detect outlet comparison mode
  const detectMode = () => {
    const firstItem = data[0] || {};
    const outletKeys = outlets?.length > 0
      ? outlets.map(outlet => ({
          actual: `${outlet.name}_actual`,
          projected: `${outlet.name}_projected`,
          outletName: outlet.name
        }))
      : [];
    
    const hasOutletKeys = outletKeys.length > 0 && 
      outletKeys.some(key => 
        firstItem.hasOwnProperty(key.actual) || 
        firstItem.hasOwnProperty(key.projected)
      );
    
    return { hasOutletComparison: hasOutletKeys, outletKeys };
  };
  
  const { hasOutletComparison, outletKeys } = detectMode();

  // Transform data for chart
  const chartData = data.map((item) => {
    const formattedPeriod = timePeriod === 'year' 
      ? useFormattedMonthOnly(item.period)
      : useFormattedDaily(item.period);
    
    const result: any = { period: formattedPeriod };
    
    if (hasOutletComparison && outletKeys.length > 0) {
      outletKeys.forEach((key) => {
        result[`${key.outletName} (Actual)`] = item[key.actual] || 0;
        result[`${key.outletName} (Projected)`] = item[key.projected] || 0;
      });
    } else {
      result[actualLabel] = item.actual || 0;
      result[projectedLabel] = item.projected || 0;
    }
    
    return result;
  });

  // Format helpers
  const formatTooltip = (value: number, name: string) => [formatMoney(value), name];
  
  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      const kValue = (value / 1000).toFixed(0);
      return currency === 'VND' ? `${kValue}k${symbol}` : `${symbol}${kValue}k`;
    }
    return formatMoney(value);
  };

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
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={formatTooltip}
          labelStyle={{ color: '#374151' }}
        />
        <Legend />
        {hasOutletComparison && outletKeys.length > 0 ? (
          outletKeys.map((key, index) => {
            const color = outletColors[index % outletColors.length];
            return (
              <React.Fragment key={key.outletName}>
                <Bar 
                  dataKey={`${key.outletName} (Actual)`}
                  fill={color}
                  radius={[4, 4, 0, 0]}
                  name={`${key.outletName} (Actual)`}
                />
                <Bar 
                  dataKey={`${key.outletName} (Projected)`}
                  fill={`${color}80`}
                  radius={[4, 4, 0, 0]}
                  name={`${key.outletName} (Projected)`}
                />
              </React.Fragment>
            );
          })
        ) : (
          <>
            <Bar 
              dataKey={actualLabel} 
              fill={ACTUAL_COLOR}
              radius={[4, 4, 0, 0]}
              name={actualLabel}
            />
            <Bar 
              dataKey={projectedLabel} 
              fill={PROJECTED_COLOR}
              radius={[4, 4, 0, 0]}
              name={projectedLabel}
            />
          </>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}; 