'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@rentalshop/ui';
import { 
  ShoppingBag, 
  DollarSign, 
  Calendar,
  TrendingUp
} from 'lucide-react';
import type { CustomerWithMerchant } from '@rentalshop/types';
import type { Customer } from '@rentalshop/types';

// Union type to handle both local and database customer types
type CustomerData = Customer | CustomerWithMerchant;

interface CustomerOrdersSummaryCardProps {
  customer?: CustomerData | null;
  orderStats?: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastOrderDate?: Date | string;
  };
  isLoading?: boolean;
}

export const CustomerOrdersSummaryCard: React.FC<CustomerOrdersSummaryCardProps> = ({ 
  customer,
  orderStats,
  isLoading = false
}) => {
  const formatDate = (date: Date | string) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Customer Orders Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state if no customer data
  if (!customer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Customer Orders Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No customer data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {(orderStats?.totalOrders || 0).toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            All time orders
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
            {formatCurrency(orderStats?.totalRevenue || 0)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Lifetime revenue
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
