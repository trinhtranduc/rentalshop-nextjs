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

interface IncomeData {
  month: string;
  year: number;
  realIncome: number;
  futureIncome: number;
}

interface IncomeChartProps {
  data: IncomeData[];
  loading?: boolean;
}

export const IncomeChart: React.FC<IncomeChartProps> = ({ data, loading = false }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-500">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-500">No data available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for Recharts
  const chartData = data.map(item => ({
    month: `${item.month} ${item.year}`,
    'Real Income': item.realIncome,
    'Future Income': item.futureIncome,
  }));

  // Custom tooltip formatter
  const formatTooltip = (value: number, name: string) => [
    `$${value.toLocaleString()}`,
    name
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Analytics</CardTitle>
        <p className="text-sm text-gray-600">
          Real vs Future Income by Month
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
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
              dataKey="Real Income" 
              fill="#3B82F6" 
              radius={[4, 4, 0, 0]}
              name="Real Income"
            />
            <Bar 
              dataKey="Future Income" 
              fill="#10B981" 
              radius={[4, 4, 0, 0]}
              name="Future Income"
            />

          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}; 