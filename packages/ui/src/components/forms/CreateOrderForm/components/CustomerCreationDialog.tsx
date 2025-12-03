"use client";

/**
 * CustomerCreationDialog - Wrapper for CustomerFormDialog in create mode
 * Used in CreateOrderForm - uses shared CustomerFormDialog to follow DRY principle
 */

import React from 'react';
import { CustomerFormDialog } from '../../../features/Customers/components/CustomerFormDialog';
import type { CustomerCreateInput, CustomerUpdateInput } from '@rentalshop/types';

interface CustomerCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customerData: CustomerCreateInput) => Promise<void>;
  merchantId?: number;
  initialSearchQuery?: string; // Pre-fill from search query
}

export const CustomerCreationDialog: React.FC<CustomerCreationDialogProps> = ({
  open,
  onOpenChange,
  onCustomerCreated,
  merchantId,
  initialSearchQuery = ''
}) => {
  const handleSave = async (customerData: CustomerCreateInput | CustomerUpdateInput) => {
    // In create mode, we know it's CustomerCreateInput
    await onCustomerCreated(customerData as CustomerCreateInput);
  };

  return (
    <CustomerFormDialog
      open={open}
      onOpenChange={onOpenChange}
      onSave={handleSave}
      merchantId={merchantId}
      initialSearchQuery={initialSearchQuery}
      mode="create"
    />
  );
};
