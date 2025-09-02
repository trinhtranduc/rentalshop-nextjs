import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@rentalshop/ui';
import { OrderStats } from '@rentalshop/types';

interface OrderHeaderProps {
  totalOrders: number;
  stats?: OrderStats;
}

export function OrderHeader({ totalOrders, stats }: OrderHeaderProps) {
  const formatCurrency = (amount: number | undefined): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount ?? 0);
  };

  // Safety checks for stats with proper null coalescing
  const safeStats = {
    totalOrders: stats?.totalOrders ?? 0,
    totalRevenue: stats?.totalRevenue ?? 0,
    totalDeposits: stats?.totalDeposits ?? 0,
    activeRentals: stats?.activeRentals ?? 0,
    overdueRentals: stats?.overdueRentals ?? 0,
    completedOrders: stats?.completedOrders ?? 0,
    cancelledOrders: stats?.cancelledOrders ?? 0,
    averageOrderValue: stats?.averageOrderValue ?? 0
  };

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {(safeStats.totalOrders || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              All time orders
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Rentals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {(safeStats.activeRentals || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Currently pickuped
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(safeStats.totalRevenue || 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Lifetime revenue
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Completed Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {(safeStats.completedOrders || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatCurrency(safeStats.averageOrderValue || 0)} avg order
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
