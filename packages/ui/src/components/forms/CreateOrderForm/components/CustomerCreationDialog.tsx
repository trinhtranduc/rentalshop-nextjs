/**
 * CustomerCreationDialog - Dialog component for creating new customers
 */

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@rentalshop/ui/base';
import { AddCustomerForm } from '../../../features/Customers/components/AddCustomerForm';
import type { CustomerCreateInput, CustomerSearchResult } from '@rentalshop/types';

interface CustomerCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customerData: CustomerCreateInput) => void;
  merchantId?: number;
}

export const CustomerCreationDialog: React.FC<CustomerCreationDialogProps> = ({
  open,
  onOpenChange,
  onCustomerCreated,
  merchantId
}) => {
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Add New Customer
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <AddCustomerForm
            onSave={async (customerData: CustomerCreateInput) => {
              try {
                console.log('🔍 CustomerCreationDialog: Starting customer creation...');
                setIsCreatingCustomer(true);
                
                // Get merchant ID from props
                if (!merchantId) {
                  throw new Error('Merchant ID is required to create a customer. Please ensure the form has access to merchant information.');
                }
                
                console.log('🔍 CustomerCreationDialog: Calling onCustomerCreated...');
                // Call the parent callback to create the customer
                // The parent will handle the API call and show toasts
                await onCustomerCreated(customerData);
                
                console.log('🔍 CustomerCreationDialog: Customer created successfully, closing dialog...');
                // If we reach here, the customer was created successfully
                // Close dialog on success
                onOpenChange(false);
                
              } catch (error) {
                console.error('❌ CustomerCreationDialog: Error occurred:', error);
                // Don't close the dialog on error - let the user fix the issue
                // The error will be displayed in the AddCustomerForm
                setIsCreatingCustomer(false);
                // Re-throw the error so the AddCustomerForm can handle it
                throw error;
              } finally {
                console.log('🔍 CustomerCreationDialog: Finally block executed');
                setIsCreatingCustomer(false);
              }
            }}
            onCancel={() => {
              onOpenChange(false);
            }}
            isSubmitting={isCreatingCustomer}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
