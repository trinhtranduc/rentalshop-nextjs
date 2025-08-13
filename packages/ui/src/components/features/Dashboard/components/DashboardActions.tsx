import React from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';

interface DashboardActionsProps {
  onActionClick: (action: string) => void;
}

export function DashboardActions({ onActionClick }: DashboardActionsProps) {
  const actions = [
    {
      id: 'create-order',
      label: 'Create Order',
      description: 'Start a new rental or sale order',
      icon: '📋',
      variant: 'default' as const
    },
    {
      id: 'add-product',
      label: 'Add Product',
      description: 'Add new product to inventory',
      icon: '📦',
      variant: 'secondary' as const
    },
    {
      id: 'add-customer',
      label: 'Add Customer',
      description: 'Register new customer',
      icon: '👤',
      variant: 'outline' as const
    },
    {
      id: 'view-reports',
      label: 'View Reports',
      description: 'Generate business reports',
      icon: '📊',
      variant: 'outline' as const
    },
    {
      id: 'manage-inventory',
      label: 'Manage Inventory',
      description: 'Check stock levels and availability',
      icon: '🏪',
      variant: 'outline' as const
    },
    {
      id: 'customer-support',
      label: 'Customer Support',
      description: 'Handle customer inquiries',
      icon: '💬',
      variant: 'outline' as const
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Common tasks and shortcuts
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant}
              className="h-auto p-4 flex flex-col items-start space-y-2 text-left"
              onClick={() => onActionClick(action.id)}
            >
              <div className="flex items-center space-x-2 w-full">
                <span className="text-xl">{action.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs opacity-80">{action.description}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
