import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@rentalshop/ui/base';
import { Badge } from '@rentalshop/ui/base';
import { CustomerStats as CustomerStatsType, TopCustomer } from '@rentalshop/types';

interface CustomerStatsProps {
  stats: CustomerStatsType;
}

export function CustomerStats({ stats }: CustomerStatsProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate derived stats from available data
  const activeCustomers = stats.topCustomers.length; // Customers with orders
  const totalRevenue = stats.topCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);
  const averageOrderValue = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

  return (
    <div className="space-y-6">
      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Customers with highest lifetime value
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {customer.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {customer.orderCount} orders
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(customer.totalSpent)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Customer ID: {customer.id}
                  </div>
                </div>
              </div>
            ))}
            
            {stats.topCustomers.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No customer data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Customer Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(activeCustomers / stats.totalCustomers) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{activeCustomers}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Inactive</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gray-600 h-2 rounded-full" 
                      style={{ width: `${((stats.totalCustomers - activeCustomers) / stats.totalCustomers) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{stats.totalCustomers - activeCustomers}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">New This Month</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-blue-200 dark:bg-blue-700 rounded-full h-2">
                    <div 
                      className="bg-blue-700 h-2 rounded-full" 
                      style={{ width: `${(stats.newCustomersThisMonth / stats.totalCustomers) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{stats.newCustomersThisMonth}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Order Value</span>
                <span className="font-medium">{formatCurrency(averageOrderValue)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">New This Month</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    +{stats.newCustomersThisMonth}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</span>
                <span className="font-medium text-lg">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
