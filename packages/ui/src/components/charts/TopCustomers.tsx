import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface TopCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  orderCount: number;
  totalSpent: number;
}

interface TopCustomersProps {
  data: TopCustomer[];
  loading?: boolean;
}

export const TopCustomers: React.FC<TopCustomersProps> = ({ data, loading = false }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No customer data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Customers</CardTitle>
        <p className="text-sm text-gray-600">
          Highest spending customers in the last 30 days
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.slice(0, 10).map((customer, index) => (
            <div key={customer.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              {/* Rank */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              
              {/* Customer Avatar */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center text-white font-medium">
                {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              
              {/* Customer Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {customer.name}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {customer.orderCount} orders
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <span className="truncate">{customer.email}</span>
                  <span className="truncate">{customer.phone}</span>
                  <span className="font-medium text-blue-600">
                    ${customer.totalSpent.toLocaleString()}
                  </span>
                </div>
                {customer.location && (
                  <div className="text-xs text-gray-400 mt-1 truncate">
                    📍 {customer.location}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}; 