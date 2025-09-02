'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Plus, Users, Filter } from 'lucide-react';

interface CustomerActionsProps {
  onAction: (action: string, customerId: number) => void;
  merchantId: number;
  onCustomerCreated?: (customer: any) => void;
  onCustomerUpdated?: (customer: any) => void;
  onError?: (error: string) => void;
  onViewOrders?: (customerId: number) => void;
}

export function CustomerActions({ 
  onAction, 
  merchantId,
  onCustomerCreated,
  onCustomerUpdated,
  onError,
  onViewOrders
}: CustomerActionsProps) {
  const router = useRouter();

  // Listen for actions from the table and handle navigation
  useEffect(() => {
    const handleCustomerAction = (event: CustomEvent) => {
      const { action, customer } = event.detail;
      
      if (!customer) return;
      
      switch (action) {
        case 'view':
          // Navigate to customer detail page
          if (customer.id) {
            router.push(`/customers/${customer.id}`);
          } else {
            console.error('Customer missing id for navigation:', customer);
          }
          break;
          
        case 'edit':
          // Navigate to customer edit page
          if (customer.id) {
            router.push(`/customers/${customer.id}/edit`);
          } else {
            console.error('Customer missing id for navigation:', customer);
          }
          break;
          
        default:
          console.log('Unknown customer action:', action);
      }
    };

    const handleViewOrdersAction = (event: CustomEvent) => {
      const { customerId, customer } = event.detail;
      
      if (customer && customer.id) {
        // Navigate to customer orders page
        router.push(`/customers/${customer.id}/orders`);
      } else if (onViewOrders) {
        // Fallback to callback if no id
        onViewOrders(customerId);
      }
    };

    window.addEventListener('customer-action', handleCustomerAction as EventListener);
    window.addEventListener('customer-view-orders', handleViewOrdersAction as EventListener);
    
    return () => {
      window.removeEventListener('customer-action', handleCustomerAction as EventListener);
      window.removeEventListener('customer-view-orders', handleViewOrdersAction as EventListener);
    };
  }, [router, onViewOrders]);

  const handleAddCustomer = () => {
    // Navigate to add customer page
    router.push('/customers/add');
  };

  const actions = [
    {
      id: 'add-customer',
      label: 'Add Customer',
      icon: Plus,
      onClick: handleAddCustomer,
      variant: 'default' as const
    },
    {
      id: 'bulk-actions',
      label: 'Bulk Actions',
      icon: Filter,
      onClick: () => onAction('bulk-actions', 0),
      variant: 'outline' as const
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <Button
            key={action.id}
            onClick={action.onClick}
            variant={action.variant}
            className="flex items-center space-x-2"
          >
            <action.icon className="w-4 h-4" />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
