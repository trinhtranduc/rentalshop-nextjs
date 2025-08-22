import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { DashboardStats as DashboardStatsType } from '@rentalshop/types';

interface DashboardStatsProps {
  stats: DashboardStatsType;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      change: '+12%',
      changeType: 'positive' as const,
      description: 'Total orders this period'
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      change: '+8%',
      changeType: 'positive' as const,
      description: 'Total revenue this period'
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      change: '+5%',
      changeType: 'positive' as const,
      description: 'Active customers'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      change: '+2%',
      changeType: 'positive' as const,
      description: 'Available products'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      change: '-3%',
      changeType: 'negative' as const,
      description: 'Orders awaiting processing'
    },
    {
      title: 'Completed Orders',
      value: stats.completedOrders,
      change: '+15%',
      changeType: 'positive' as const,
      description: 'Successfully completed orders'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statCards.map((card, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {card.title}
            </CardTitle>
            <span className={`text-xs font-medium ${
              card.changeType === 'positive' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {card.change}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {card.value}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
