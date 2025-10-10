import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
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
}

export const IncomeChart: React.FC<IncomeChartProps> = ({ data, loading = false }) => {
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

  // Transform data for Recharts
  const chartData = data.map(item => ({
    period: item.period,
    'Actual Revenue': item.actual,
    'Projected Revenue': item.projected,
  }));

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
          dataKey="Actual Revenue" 
          fill="#3B82F6" 
          radius={[4, 4, 0, 0]}
          name="Actual Revenue"
        />
        <Bar 
          dataKey="Projected Revenue" 
          fill="#10B981" 
          radius={[4, 4, 0, 0]}
          name="Projected Revenue"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}; 