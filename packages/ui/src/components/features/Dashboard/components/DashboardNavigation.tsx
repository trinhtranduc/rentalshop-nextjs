import React from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';

interface DashboardNavigationProps {
  activeTab: string;
}

export function DashboardNavigation({ activeTab }: DashboardNavigationProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', description: 'General business metrics' },
    { id: 'orders', label: 'Orders', description: 'Order management and tracking' },
    { id: 'customers', label: 'Customers', description: 'Customer insights and data' },
    { id: 'products', label: 'Products', description: 'Inventory and product analytics' },
    { id: 'financial', label: 'Financial', description: 'Revenue and expense tracking' },
    { id: 'reports', label: 'Reports', description: 'Detailed business reports' }
  ];

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              className={`flex-1 min-w-0 px-4 py-3 rounded-none border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="text-left">
                <div className="font-medium">{tab.label}</div>
                <div className="text-xs opacity-70">{tab.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
