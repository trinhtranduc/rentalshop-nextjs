import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@rentalshop/ui';
import { Badge } from '@rentalshop/ui';
import { OrderStats as OrderStatsType } from '@rentalshop/types';

interface OrderStatsProps {
  stats: OrderStatsType;
}

export function OrderStats({ stats }: OrderStatsProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusDistribution = () => {
    const total = stats.totalOrders;
    if (total === 0) return [];
    
    return [
      { label: 'Pending', count: stats.pendingOrders, percentage: (stats.pendingOrders / total) * 100, color: 'bg-yellow-500' },
      { label: 'Active', count: stats.activeOrders, percentage: (stats.activeOrders / total) * 100, color: 'bg-blue-500' },
      { label: 'Completed', count: stats.completedOrders, percentage: (stats.completedOrders / total) * 100, color: 'bg-green-500' },
      { label: 'Cancelled', count: stats.cancelledOrders, percentage: (stats.cancelledOrders / total) * 100, color: 'bg-red-500' }
    ];
  };

  return (
    <div className="space-y-6">
      {/* Order Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status Distribution</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Breakdown of orders by current status
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getStatusDistribution().map((status) => (
              <div key={status.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {status.label}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {status.count} orders
                    </span>
                    <span className="text-sm font-medium">
                      {status.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${status.color}`}
                    style={{ width: `${status.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</span>
                <span className="font-medium text-lg text-green-600 dark:text-green-400">
                  {formatCurrency(stats.totalRevenue)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Deposits</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {formatCurrency(stats.totalDeposits)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Order Value</span>
                <span className="font-medium">
                  {formatCurrency(stats.averageOrderValue)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">This Month Revenue</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {formatCurrency(stats.revenueThisMonth)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Order Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Orders</span>
                <span className="font-medium text-lg">
                  {stats.totalOrders.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {stats.ordersThisMonth} orders
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Orders</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {stats.activeOrders}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending Orders</span>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">
                  {stats.pendingOrders}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalOrders > 0 ? ((stats.activeOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Active Order Rate
              </div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Completion Rate
              </div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalOrders > 0 ? ((stats.cancelledOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Cancellation Rate
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
