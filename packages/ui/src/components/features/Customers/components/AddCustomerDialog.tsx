'use client'

import React from 'react';
import { CustomerFormDialog } from './CustomerFormDialog';
import type { CustomerCreateInput } from '@rentalshop/types';

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated?: (customerData: CustomerCreateInput) => Promise<void>;
  onError?: (error: any) => void;
  merchantId?: number;
  initialSearchQuery?: string;
}

/**
 * AddCustomerDialog - Wrapper for CustomerFormDialog in create mode
 * Uses shared CustomerFormDialog component to follow DRY principle
 */
export const AddCustomerDialog: React.FC<AddCustomerDialogProps> = ({
  open,
  onOpenChange,
  onCustomerCreated,
  onError,
  merchantId,
  initialSearchQuery
}) => {
  const handleSave = async (customerData: CustomerCreateInput | any) => {
    try {
      if (onCustomerCreated) {
        await onCustomerCreated(customerData as CustomerCreateInput);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('❌ AddCustomerDialog: Error occurred:', error);
      // ✅ Pass error object (not string) so onError can extract code for translation
      // onCustomerCreated already shows toast, so onError is only for additional handling if needed
      if (onError) {
        onError(error); // Pass full error object to preserve code field
      }
      throw error; // Re-throw to let CustomerFormDialog handle it
    }
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
