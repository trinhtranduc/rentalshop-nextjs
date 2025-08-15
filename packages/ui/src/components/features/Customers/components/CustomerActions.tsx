import React, { useState, useEffect } from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { CustomerFormDialog } from './CustomerFormDialog';
import { CustomerDetailDialog } from './CustomerDetailDialog';
import { CustomerOrdersDialog } from './CustomerOrdersDialog';
import type { CustomerWithMerchant } from '@rentalshop/database';
import { Plus, Users, Filter } from 'lucide-react';

interface CustomerActionsProps {
  onAction: (action: string, customerId: string) => void;
  merchantId: string;
  onCustomerCreated?: (customer: CustomerWithMerchant) => void;
  onCustomerUpdated?: (customer: CustomerWithMerchant) => void;
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isOrdersDialogOpen, setIsOrdersDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithMerchant | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<CustomerWithMerchant | null>(null);
  const [selectedCustomerForOrders, setSelectedCustomerForOrders] = useState<CustomerWithMerchant | null>(null);

  const convertCustomerToDatabaseType = (customer: any): CustomerWithMerchant => {
    return {
      ...customer,
      merchantId: merchantId,
      merchant: {
        id: merchantId,
        name: 'Current Merchant' // This would ideally be fetched from the merchant service
      },
      // Add any other required fields here
      // This would need to be fetched or passed in
    };
  };

  // Listen for edit actions from the table
  useEffect(() => {
    const handleEditAction = (event: CustomEvent) => {
      if (event.detail.action === 'edit' && event.detail.customer) {
        const customerData = convertCustomerToDatabaseType(event.detail.customer);
        setEditingCustomer(customerData);
        setIsAddDialogOpen(true);
      } else if (event.detail.action === 'view' && event.detail.customer) {
        const customerData = convertCustomerToDatabaseType(event.detail.customer);
        setViewingCustomer(customerData);
        setIsViewDialogOpen(true);
      }
    };

    const handleViewOrdersAction = (event: CustomEvent) => {
      console.log('CustomerActions: Received customer-view-orders event:', event.detail);
      if (event.detail.customerId && event.detail.customer) {
        const customerData = convertCustomerToDatabaseType(event.detail.customer);
        console.log('CustomerActions: Converting customer data:', customerData);
        setSelectedCustomerForOrders(customerData);
        setIsOrdersDialogOpen(true);
        console.log('CustomerActions: Orders dialog should now be open');
      }
    };

    window.addEventListener('customer-action', handleEditAction as EventListener);
    window.addEventListener('customer-view-orders', handleViewOrdersAction as EventListener);
    
    return () => {
      window.removeEventListener('customer-action', handleEditAction as EventListener);
      window.removeEventListener('customer-view-orders', handleViewOrdersAction as EventListener);
    };
  }, [merchantId]);

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setIsAddDialogOpen(true);
  };

  const handleEditCustomer = (customer: CustomerWithMerchant) => {
    setEditingCustomer(customer);
    setIsAddDialogOpen(true);
  };

  const handleViewCustomer = (customer: CustomerWithMerchant) => {
    setViewingCustomer(customer);
    setIsViewDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingCustomer(null);
  };

  const handleViewDialogClose = () => {
    setIsViewDialogOpen(false);
    setViewingCustomer(null);
  };

  const handleSuccess = (customer: CustomerWithMerchant) => {
    if (editingCustomer) {
      onCustomerUpdated?.(customer);
    } else {
      onCustomerCreated?.(customer);
    }
    setIsAddDialogOpen(false);
  };

  const handleError = (error: string) => {
    onError?.(error);
  };

  const handleViewOrders = (customerId: string) => {
    // Find the customer data to show in orders dialog
    if (viewingCustomer && viewingCustomer.id === customerId) {
      setSelectedCustomerForOrders(viewingCustomer);
      setIsOrdersDialogOpen(true);
      setIsViewDialogOpen(false);
    } else if (editingCustomer && editingCustomer.id === customerId) {
      setSelectedCustomerForOrders(editingCustomer);
      setIsOrdersDialogOpen(true);
      setIsAddDialogOpen(false);
    } else {
      // If we don't have the customer data, call the callback
      onViewOrders?.(customerId);
    }
  };

  const handleOrdersDialogClose = () => {
    setIsOrdersDialogOpen(false);
    setSelectedCustomerForOrders(null);
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
    <>
      {/* Add/Edit Customer Dialog */}
      <CustomerFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        customer={editingCustomer}
        merchantId={merchantId}
        onSuccess={handleSuccess}
        onError={handleError}
      />

      {/* View Customer Details Dialog */}
      <CustomerDetailDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        customer={viewingCustomer}
        onEdit={() => {
          if (viewingCustomer) {
            handleEditCustomer(viewingCustomer);
          }
        }}
        onViewOrders={handleViewOrders}
      />

      {/* Customer Orders Dialog */}
      <CustomerOrdersDialog
        open={isOrdersDialogOpen}
        onOpenChange={handleOrdersDialogClose}
        customer={selectedCustomerForOrders}
      />
    </>
  );
}
