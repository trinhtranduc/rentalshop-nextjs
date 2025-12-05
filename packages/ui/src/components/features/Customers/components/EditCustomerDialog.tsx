'use client'

import React from 'react';
import { CustomerFormDialog } from './CustomerFormDialog';
import type { Customer, CustomerUpdateInput } from '@rentalshop/types';

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onCustomerUpdated?: (customerData: CustomerUpdateInput) => Promise<void>;
  onError?: (error: string) => void;
}

/**
 * EditCustomerDialog - Wrapper for CustomerFormDialog in edit mode
 * Uses shared CustomerFormDialog component to follow DRY principle
 */
export const EditCustomerDialog: React.FC<EditCustomerDialogProps> = ({
  open,
  onOpenChange,
  customer,
  onCustomerUpdated,
  onError
}) => {
  const handleSave = async (customerData: CustomerUpdateInput | any) => {
    try {
      if (onCustomerUpdated) {
        await onCustomerUpdated(customerData as CustomerUpdateInput);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('❌ EditCustomerDialog: Error occurred:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Failed to update customer');
      }
      throw error; // Re-throw to let CustomerFormDialog handle it
    }
  };

  return (
    <CustomerFormDialog
      open={open}
      onOpenChange={onOpenChange}
      onSave={handleSave}
      customer={customer}
      mode="edit"
    />
  );
};

