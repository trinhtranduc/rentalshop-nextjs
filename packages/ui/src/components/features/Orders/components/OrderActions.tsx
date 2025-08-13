import React from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';

interface OrderActionsProps {
  onAction: (action: string, orderId?: string) => void;
}

export function OrderActions({ onAction }: OrderActionsProps) {
  const actions = [
    {
      id: 'create-order',
      label: 'Create Order',
      description: 'Start a new rental or sale order',
      icon: '📋',
      variant: 'default' as const
    },
    {
      id: 'import-orders',
      label: 'Import Orders',
      description: 'Import from CSV/Excel',
      icon: '📥',
      variant: 'secondary' as const
    },
    {
      id: 'export-orders',
      label: 'Export Orders',
      description: 'Export to CSV/Excel',
      icon: '📤',
      variant: 'outline' as const
    },
    {
      id: 'bulk-actions',
      label: 'Bulk Actions',
      description: 'Manage multiple orders',
      icon: '⚡',
      variant: 'outline' as const
    },
    {
      id: 'order-templates',
      label: 'Order Templates',
      description: 'Use predefined order templates',
      icon: '📝',
      variant: 'outline' as const
    },
    {
      id: 'schedule-pickups',
      label: 'Schedule Pickups',
      description: 'Manage pickup schedules',
      icon: '🚚',
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
