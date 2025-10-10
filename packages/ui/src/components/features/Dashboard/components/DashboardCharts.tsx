import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { OrderChart, IncomeChart } from '../../../charts';
import { OrderDataPoint, IncomeData } from '@rentalshop/types';

// Transform data to match chart component expectations
interface RevenueData {
  period: string;
  actual: number;
  projected: number;
}

interface DashboardChartsProps {
  orderData: OrderDataPoint[];
  incomeData: IncomeData[];
}

export function DashboardCharts({ orderData, incomeData }: DashboardChartsProps) {
  // Transform order data to match chart expectations
  const transformedOrderData: RevenueData[] = orderData.map((order, index) => ({
    period: order.date,
    actual: order.revenue,
    projected: order.revenue * 1.1 // Simple projection
  }));

  // Transform income data to match chart expectations
  const transformedIncomeData: RevenueData[] = incomeData.map((income, index) => ({
    period: income.date,
    actual: income.income,
    projected: income.income * 1.1 // Simple projection
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderChart data={transformedOrderData} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeChart data={transformedIncomeData} />
        </CardContent>
      </Card>
    </div>
  );
}
