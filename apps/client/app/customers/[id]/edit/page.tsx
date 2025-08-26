'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { EditCustomerForm, CustomerPageHeader, ToastContainer } from '@rentalshop/ui';
import { customersApi } from "@rentalshop/utils";
import type { Customer, CustomerUpdateInput } from '@rentalshop/ui';
import { useToasts } from '@rentalshop/ui';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const publicId = params.publicId as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, showSuccess, removeToast } = useToasts();

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setIsLoading(true);
        
        console.log('🔍 EditCustomerPage: Fetching customer with public ID:', publicId);
        
        // Validate public ID format (should be numeric)
        const numericId = parseInt(publicId);
        if (isNaN(numericId) || numericId <= 0) {
          console.error('❌ EditCustomerPage: Invalid public ID format:', publicId);
          setCustomer(null);
          return;
        }
        
        console.log('🔍 EditCustomerPage: Making API call to /api/customers/' + publicId);
        
        // Use the real API to fetch customer data by public ID
        const response = await customersApi.getCustomerByPublicId(publicId);
        
        console.log('🔍 EditCustomerPage: API response received:', response);
        
        if (response.success && response.data) {
          console.log('✅ EditCustomerPage: Customer fetched successfully:', response.data);
          setCustomer(response.data);
        } else {
          console.error('❌ EditCustomerPage: API error:', response.error);
          throw new Error(response.error || 'Failed to fetch customer');
        }
        
      } catch (error) {
        console.error('❌ EditCustomerPage: Error fetching customer:', error);
        // Show error state
        setCustomer(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (publicId) {
      fetchCustomer();
    }
  }, [publicId]);

  // Handle customer update
  const handleSave = async (customerData: CustomerUpdateInput) => {
    if (!customer) return;
    
    try {
      setIsSubmitting(true);
      
      console.log('🔍 EditCustomerPage: Updating customer:', customerData);
      
      const response = await customersApi.updateCustomer(customer.id, customerData);
      
      if (response.success) {
        console.log('✅ EditCustomerPage: Customer updated successfully');
        
        // Show success toast
        showSuccess('Customer Updated', 'Customer information has been updated successfully!');
        
        // Navigate back to customers list after a short delay to show the toast
        setTimeout(() => {
          router.push('/customers');
        }, 1500);
      } else {
        console.error('❌ EditCustomerPage: API error:', response.error);
        throw new Error(response.error || 'Failed to update customer');
      }
      
    } catch (error) {
      console.error('❌ EditCustomerPage: Error updating customer:', error);
      throw error; // Re-throw so the form can handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/customers');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Customer Not Found</h1>
            <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist or has been removed.</p>
            <button 
              onClick={() => router.push('/customers')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <CustomerPageHeader
          title={`Edit ${customer.firstName} ${customer.lastName}`}
          subtitle="Update customer information and contact details"
          onBack={handleCancel}
          backText="Back to Customer"
        />

        {/* Edit Customer Form */}
        <div className="mt-8">
          <EditCustomerForm
            customer={customer}
            onSave={handleSave}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
      
      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
