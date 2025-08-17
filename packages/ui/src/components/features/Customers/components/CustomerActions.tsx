import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Plus, Users, Filter } from 'lucide-react';

interface CustomerActionsProps {
  onAction: (action: string, customerId: string) => void;
  merchantId: string;
  onCustomerCreated?: (customer: any) => void;
  onCustomerUpdated?: (customer: any) => void;
  onError?: (error: string) => void;
  onViewOrders?: (customerId: string) => void;
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
          if (customer.publicId) {
            router.push(`/customers/${customer.publicId}`);
          } else {
            console.error('Customer missing publicId for navigation:', customer);
          }
          break;
          
        case 'edit':
          // Navigate to customer edit page
          if (customer.publicId) {
            router.push(`/customers/${customer.publicId}/edit`);
          } else {
            console.error('Customer missing publicId for navigation:', customer);
          }
          break;
          
        default:
          console.log('Unknown customer action:', action);
      }
    };

    const handleViewOrdersAction = (event: CustomEvent) => {
      const { customerId, customer } = event.detail;
      
      if (customer && customer.publicId) {
        // Navigate to customer orders page
        router.push(`/customers/${customer.publicId}/orders`);
      } else if (onViewOrders) {
        // Fallback to callback if no publicId
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
      onClick: () => onAction('bulk-actions', ''),
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
