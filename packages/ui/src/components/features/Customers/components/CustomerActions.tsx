import React from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';

interface CustomerActionsProps {
  onAction: (action: string, customerId?: string) => void;
}

export function CustomerActions({ onAction }: CustomerActionsProps) {
  const actions = [
    {
      id: 'add-customer',
      label: 'Add Customer',
      description: 'Create a new customer account',
      icon: '👤',
      variant: 'default' as const
    },
    {
      id: 'import-customers',
      label: 'Import Customers',
      description: 'Import from CSV/Excel',
      icon: '📥',
      variant: 'secondary' as const
    },
    {
      id: 'export-customers',
      label: 'Export Customers',
      description: 'Export to CSV/Excel',
      icon: '📤',
      variant: 'outline' as const
    },
    {
      id: 'bulk-actions',
      label: 'Bulk Actions',
      description: 'Manage multiple customers',
      icon: '⚡',
      variant: 'outline' as const
    },
    {
      id: 'customer-segments',
      label: 'Customer Segments',
      description: 'Create and manage segments',
      icon: '🎯',
      variant: 'outline' as const
    },
    {
      id: 'loyalty-program',
      label: 'Loyalty Program',
      description: 'Manage rewards and points',
      icon: '🏆',
      variant: 'outline' as const
    }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant}
              className="h-auto p-3 flex flex-col items-start space-y-2 text-left"
              onClick={() => onAction(action.id)}
            >
              <div className="flex items-center space-x-2 w-full">
                <span className="text-lg">{action.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{action.label}</div>
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
