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
  const hasOutletComparison = outlets && outlets.length > 0;
  const outletKeys = hasOutletComparison 
    ? outlets.map(outlet => ({
        actual: `${outlet.name}_actual`,
        projected: `${outlet.name}_projected`,
        outletName: outlet.name
      }))
    : [];

  // Transform data for Recharts with localized formatting based on time period
  const chartData = data.map((item, index) => {
    // Use different formatting based on time period
    const formattedPeriod = timePeriod === 'year' 
      ? useFormattedMonthOnly(item.period)  // For yearly: 01/25, 02/25, etc.
      : useFormattedDaily(item.period);     // For monthly: 01/10, 02/10, etc.
    
    const result: any = { period: formattedPeriod };
    
    // Debug: check which branch we're taking
    if (item.actual > 0 || item.projected > 0) {
      console.log(`🔍 Transform branch check item ${index}:`, {
        hasOutletComparison,
        outletKeysLength: outletKeys.length,
        willUseOutletComparison: hasOutletComparison && outletKeys.length > 0,
        actualLabel,
        projectedLabel,
        itemActual: item.actual,
        itemProjected: item.projected
      });
    }
    
    if (hasOutletComparison && outletKeys.length > 0) {
      // Outlet comparison mode: use outlet-specific keys
      outletKeys.forEach((outletKey) => {
        result[`${outletKey.outletName} (Actual)`] = item[outletKey.actual] || 0;
        result[`${outletKey.outletName} (Projected)`] = item[outletKey.projected] || 0;
      });
    } else {
      // Default mode: use standard labels
      // Debug before setting
      if (item.actual > 0 || item.projected > 0) {
        console.log(`🔧 Before transform item ${index}:`, {
          actualLabel: actualLabel,
          projectedLabel: projectedLabel,
          actualLabelType: typeof actualLabel,
          projectedLabelType: typeof projectedLabel,
          itemActual: item.actual,
          itemProjected: item.projected,
          resultBefore: { ...result }
        });
      }
      
      result[actualLabel] = item.actual || 0;
      result[projectedLabel] = item.projected || 0;
      
      // Debug after setting
      if (item.actual > 0 || item.projected > 0) {
        console.log(`✅ After transform item ${index}:`, {
          resultAfter: { ...result },
          resultActualLabel: result[actualLabel],
          resultProjectedLabel: result[projectedLabel],
          resultKeys: Object.keys(result),
          hasActualLabel: actualLabel in result,
          hasProjectedLabel: projectedLabel in result,
          directAccess: result['Doanh thu thực tế'],
          directAccessProjected: result['Doanh thu dự kiến']
        });
      }
    }
    
    // Debug: log transform for items with data
    if (item.actual > 0 || item.projected > 0) {
      console.log(`🔄 Transform item ${index} FINAL:`, {
        input: { period: item.period, actual: item.actual, projected: item.projected },
        output: result,
        outputActualLabel: result[actualLabel],
        outputProjectedLabel: result[projectedLabel],
        actualLabel: actualLabel,
        projectedLabel: projectedLabel,
        resultKeys: Object.keys(result),
        resultValues: Object.entries(result).map(([key, value]) => ({ key, value, type: typeof value }))
      });
    }
    
    return result;
  });

  // Debug: log chart data with detailed inspection
  if (chartData.length > 0) {
    // Find raw data item with actual data
    const rawItemWithData = data.find(d => d.actual > 0 || d.projected > 0);
    
    // Find corresponding chartData item (by period)
    const chartItemWithData = rawItemWithData 
      ? chartData.find(item => {
          // Match by period - need to check both original period and formatted period
          const rawPeriod = rawItemWithData.period;
          const formattedRawPeriod = timePeriod === 'year' 
            ? useFormattedMonthOnly(rawPeriod)
            : useFormattedDaily(rawPeriod);
          return item.period === formattedRawPeriod || item.period === rawPeriod;
        })
      : null;
    
    // Filter items with data using actualLabel and projectedLabel
    const itemsWithData = chartData.filter(item => (item[actualLabel] || 0) > 0 || (item[projectedLabel] || 0) > 0);
    
    // Also check if any item has the raw 'actual' or 'projected' keys (in case transform failed)
    const itemsWithRawKeys = chartData.filter(item => (item.actual || 0) > 0 || (item.projected || 0) > 0);
    
    console.log('📈 IncomeChart data - DETAILED DEBUG:', {
      totalItems: chartData.length,
      itemsWithData: itemsWithData.length,
      itemsWithRawKeys: itemsWithRawKeys.length,
      actualLabel: actualLabel,
      projectedLabel: projectedLabel,
      firstItemKeys: Object.keys(chartData[0] || {}),
      firstItem: chartData[0],
      firstItemActual: chartData[0]?.[actualLabel],
      firstItemProjected: chartData[0]?.[projectedLabel],
      rawDataFirst: data[0],
      rawDataWithActual: rawItemWithData,
      chartItemWithData: chartItemWithData,
      chartItemWithDataKeys: chartItemWithData ? Object.keys(chartItemWithData) : null,
      chartItemWithDataActual: chartItemWithData?.[actualLabel],
      chartItemWithDataProjected: chartItemWithData?.[projectedLabel],
      chartItemWithDataRawActual: chartItemWithData?.actual,
      chartItemWithDataRawProjected: chartItemWithData?.projected,
      allItemsSample: chartData.slice(0, 5).map(item => ({
        period: item.period,
        actualValue: item[actualLabel],
        projectedValue: item[projectedLabel],
        rawActual: item.actual,
        rawProjected: item.projected,
        allKeys: Object.keys(item),
        allValues: Object.entries(item).reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as any)
      })),
      itemWithData2025_11_21: chartData.find(item => item.period?.includes('21') || item.period === '2025-11-21')
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