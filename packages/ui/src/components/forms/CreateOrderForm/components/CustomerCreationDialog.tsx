/**
 * CustomerCreationDialog - Dialog component for creating new customers
 */

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@rentalshop/ui';
// import { AddCustomerForm } from '../../features/Customers/components/AddCustomerForm';
import type { CustomerSearchResult } from '../types';

interface CustomerCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customer: CustomerSearchResult) => void;
  merchantId?: string;
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isCreatingCustomer ? 'Creating Customer...' : 'Add New Customer'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {/* <AddCustomerForm
            onSave={async (customerData) => {
              try {
                setIsCreatingCustomer(true);
                
                // Get merchant ID from props
                if (!merchantId) {
                  throw new Error('Merchant ID is required to create a customer. Please ensure the form has access to merchant information.');
                }
                
                // Create customer with merchant ID
                const result = await fetch('/api/customers', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    ...customerData,
                    merchantId,
                    isActive: true
                  }),
                });

                if (!result.ok) {
                  const errorData = await result.json();
                  throw new Error(errorData.message || 'Failed to create customer');
                }

                const newCustomer = await result.json();
                
                // Call the callback with the new customer
                onCustomerCreated(newCustomer.data.customer);
                
                // Close dialog
                onOpenChange(false);
                
              } catch (error) {
                console.error('Error creating customer:', error);
                throw error;
              } finally {
                setIsCreatingCustomer(false);
              }
            }}
            onCancel={() => {
              onOpenChange(false);
            }}
            isSubmitting={isCreatingCustomer}
          /> */}
        </div>
      </DialogContent>
    </Dialog>
  );
};
