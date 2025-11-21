import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { useCommonTranslations } from '@rentalshop/hooks';
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
  const tc = useCommonTranslations();
  const formatMoney = useFormatCurrency();
  const { symbol, currency } = useCurrency();
  
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

  // Check if data has outlet comparison (dynamic keys with outlet names)
  const firstItem = data[0] || {};
  const firstItemKeys = Object.keys(firstItem);
  
  // Check if outlets prop is provided and create outlet keys
  const outletKeys = outlets && outlets.length > 0
    ? outlets.map(outlet => ({
        actual: `${outlet.name}_actual`,
        projected: `${outlet.name}_projected`,
        outletName: outlet.name
      }))
    : [];
  
  // Only use outlet comparison if:
  // 1. Outlets are provided
  // 2. Data actually has outlet-specific keys (not just 'actual' and 'projected')
  const hasOutletSpecificKeys = outletKeys.length > 0 && 
    outletKeys.some(outletKey => 
      firstItem.hasOwnProperty(outletKey.actual) || 
      firstItem.hasOwnProperty(outletKey.projected)
    );
  
  // Check if data has standard keys (total mode)
  const hasStandardKeys = firstItem.hasOwnProperty('actual') || firstItem.hasOwnProperty('projected');
  
  // Determine mode: outlet comparison only if outlet-specific keys exist
  // If data has outlet-specific keys, use outlet comparison mode
  // Otherwise, fallback to default mode (total with actual/projected)
  const hasOutletComparison = hasOutletSpecificKeys;
  
  // Debug: log detection logic (simplified)
  if (hasOutletComparison) {
    console.log('📊 IncomeChart: Using outlet comparison mode', {
      outlets: outletKeys.length,
      mode: 'outlet-comparison'
    });
  } else {
    console.log('📊 IncomeChart: Using total mode', {
      mode: 'total',
      hasStandardKeys
    });
  }

  // Transform data for Recharts with localized formatting based on time period
  const chartData = data.map((item, index) => {
    // Use different formatting based on time period
    const formattedPeriod = timePeriod === 'year' 
      ? useFormattedMonthOnly(item.period)  // For yearly: 01/25, 02/25, etc.
      : useFormattedDaily(item.period);     // For monthly: 01/10, 02/10, etc.
    
    const result: any = { period: formattedPeriod };
    
    
    if (hasOutletComparison && outletKeys.length > 0) {
      // Outlet comparison mode: use outlet-specific keys
      outletKeys.forEach((outletKey) => {
        result[`${outletKey.outletName} (Actual)`] = item[outletKey.actual] || 0;
        result[`${outletKey.outletName} (Projected)`] = item[outletKey.projected] || 0;
      });
    } else {
      // Default mode: use standard labels
      result[actualLabel] = item.actual || 0;
      result[projectedLabel] = item.projected || 0;
    }
    
    return result;
  });

  // Debug: log chart data summary (simplified)
  if (chartData.length > 0) {
    const itemsWithData = chartData.filter(item => (item[actualLabel] || 0) > 0 || (item[projectedLabel] || 0) > 0);
    console.log('📈 IncomeChart:', {
      totalItems: chartData.length,
      itemsWithData: itemsWithData.length,
      mode: hasOutletComparison ? 'outlet-comparison' : 'total'
    });
  }

  // Custom tooltip formatter with currency
  const formatTooltip = (value: number, name: string) => [
    formatMoney(value),
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
          tickFormatter={(value) => {
            // For large numbers, show abbreviated format
            if (value >= 1000) {
              const kValue = (value / 1000).toFixed(0);
              // Format based on currency: USD has symbol before, VND has symbol after
              if (currency === 'VND') {
                return `${kValue}k${symbol}`;
              } else {
                return `${symbol}${kValue}k`;
              }
            }
            return formatMoney(value);
          }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={formatTooltip}
          labelStyle={{ color: '#374151' }}
        />
        <Legend />
        {hasOutletComparison && outletKeys.length > 0 ? (
          // Render bars for each outlet (both actual and projected)
          <>
            {outletKeys.map((outletKey, index) => {
              const actualColor = outletColors[index % outletColors.length];
              const projectedColor = outletColors[(index + outletKeys.length) % outletColors.length];
              return (
                <React.Fragment key={outletKey.outletName}>
                  <Bar 
                    dataKey={`${outletKey.outletName} (Actual)`}
                    fill={actualColor}
                    radius={[4, 4, 0, 0]}
                    name={`${outletKey.outletName} (Actual)`}
                  />
                  <Bar 
                    dataKey={`${outletKey.outletName} (Projected)`}
                    fill={`${actualColor}80`}
                    radius={[4, 4, 0, 0]}
                    name={`${outletKey.outletName} (Projected)`}
                  />
                </React.Fragment>
              );
            })}
          </>
        ) : (
          // Default: single aggregated series
          <>
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
          </>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}; 