'use client'

import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../../../ui/dialog';
import { 
  Card,
  CardContent
} from '../../../ui/card';
import { CustomerForm } from '../../../forms/CustomerForm';
import { customerApi } from '../utils/customerApi';
import type { CustomerInput } from '@rentalshop/database';
import type { CustomerWithMerchant } from '@rentalshop/database';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerWithMerchant | null; // null for create, CustomerWithMerchant for edit
  merchantId: string;
  onSuccess?: (customer: CustomerWithMerchant) => void;
  onError?: (error: string) => void;
}

export const CustomerFormDialog: React.FC<CustomerFormDialogProps> = ({
  open,
  onOpenChange,
  customer,
  merchantId,
  onSuccess,
  onError
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isEditMode = !!customer;
  const title = isEditMode ? 'Edit Customer' : 'Add New Customer';
  const description = isEditMode 
    ? 'Update customer information and contact details.'
    : 'Create a new customer account with personal and contact information.';

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  const handleSubmit = async (data: CustomerInput) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let result: CustomerWithMerchant;

      if (isEditMode) {
        // Update existing customer
        result = await customerApi.updateCustomer(customer!.id, data);
        setSuccess('Customer updated successfully!');
      } else {
        // Create new customer
        result = await customerApi.createCustomer({
          ...data,
          merchantId: merchantId
        });
        setSuccess('Customer created successfully!');
      }
      
      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  // Transform customer data for form if editing
  const getInitialData = () => {
    if (!customer) return { merchantId };

    return {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zipCode: customer.zipCode || '',
      country: customer.country || '',
      dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.toISOString().split('T')[0] : '',
      idNumber: customer.idNumber || '',
      idType: customer.idType,
      notes: customer.notes || '',
      merchantId: customer.merchantId
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div>
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {/* Error Alert */}
          {error && (
            <Card className="mb-4 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Success Alert */}
          {success && (
            <Card className="mb-4 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <p className="text-green-800 text-sm">{success}</p>
              </CardContent>
            </Card>
          )}

          {/* Customer Form */}
          <CustomerForm
            initialData={getInitialData()}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={isSubmitting}
            title=""
            submitText={isSubmitting ? 
              (isEditMode ? 'Updating...' : 'Creating...') : 
              (isEditMode ? 'Update Customer' : 'Create Customer')
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
