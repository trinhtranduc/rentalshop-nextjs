'use client'

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '../../../ui';
import { AddCustomerForm } from './AddCustomerForm';
import type { Customer, CustomerCreateInput } from '@rentalshop/types';

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated?: (customer: Customer) => void;
  onError?: (error: string) => void;
}

export const AddCustomerDialog: React.FC<AddCustomerDialogProps> = ({
  open,
  onOpenChange,
  onCustomerCreated,
  onError
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (customerData: CustomerCreateInput) => {
    try {
      setIsSubmitting(true);
      
      // Call the parent callback to create the customer
      // The parent will handle the API call and show toasts
      if (onCustomerCreated) {
        await onCustomerCreated(customerData);
      }
      
      // Close dialog on success
      onOpenChange(false);
      
    } catch (error) {
      console.error('❌ AddCustomerDialog: Error occurred:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Failed to create customer');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return; // Prevent cancellation while submitting
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Add New Customer
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <AddCustomerForm
            onSave={handleSave}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
