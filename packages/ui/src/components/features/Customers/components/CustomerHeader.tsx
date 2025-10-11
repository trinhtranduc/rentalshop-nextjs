import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@rentalshop/ui';
import { CustomerStats } from '@rentalshop/types';

interface CustomerHeaderProps {
  totalCustomers: number;
  stats: CustomerStats;
}

export function CustomerHeader({ totalCustomers, stats }: CustomerHeaderProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate derived stats from available data
  const activeCustomers = stats.topCustomers.length; // Customers with orders
  const totalRevenue = stats.topCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalCustomers.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              All time customers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activeCustomers.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {((activeCustomers / stats.totalCustomers) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              New This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.newCustomersThisMonth.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Recent signups
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
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              From all customers
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
