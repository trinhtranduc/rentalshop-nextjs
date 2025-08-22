'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddCustomerForm, CustomerPageHeader, ToastContainer } from '@rentalshop/ui';
import { customersApi } from "@rentalshop/utils";
import { useAuth } from '@rentalshop/hooks';
import type { CustomerInput } from '@rentalshop/database';
import type { CustomerCreateInput } from '@rentalshop/ui';
import { useToasts } from '@rentalshop/ui';

export default function AddCustomerPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, showSuccess, removeToast } = useToasts();

  // Get merchantId from current user
  const merchantId = user?.merchant?.id;

  const handleSave = async (customerData: CustomerCreateInput) => {
    try {
      if (!merchantId) {
        throw new Error('Merchant ID not found. Please log in again.');
      }

      setIsSubmitting(true);
      
      // Convert UI form data to database format
      const customerWithMerchant: CustomerInput = {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email?.trim() || '', // Provide empty string for optional email
        phone: customerData.phone!, // Required, use non-null assertion since validation ensures it exists
        address: customerData.address,
        city: customerData.city,
        state: customerData.state,
        zipCode: customerData.zipCode,
        country: customerData.country,
        notes: `Status: ${customerData.status}, Level: ${customerData.membershipLevel}`,
        merchantId
      };
      
      console.log('🔍 AddCustomerPage: Creating customer:', customerWithMerchant);
      
      // Use the real API
      const response = await customersApi.createCustomer(customerWithMerchant);
      
      if (response.success) {
        console.log('✅ AddCustomerPage: Customer created successfully:', response.data);
        
        // Show success toast
        showSuccess('Customer Created', 'Customer has been created successfully!');
        
        // Navigate back to customers list after a short delay to show the toast
        setTimeout(() => {
          router.push('/customers');
        }, 1500);
      } else {
        console.error('❌ AddCustomerPage: API error:', response.error);
        throw new Error(response.error || 'Failed to create customer');
      }
      
    } catch (error) {
      console.error('❌ AddCustomerPage: Error creating customer:', error);
      throw error; // Re-throw so the form can handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/customers');
  };

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-600 text-lg font-medium">
              Loading...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no merchant ID after loading
  if (!merchantId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-medium">
              Unable to create customer. Please log in again.
            </div>
            <button
              onClick={handleCancel}
              className="mt-4 text-blue-600 hover:text-blue-800 underline"
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
          title="Add New Customer"
          subtitle="Create a new customer account with basic information"
          onBack={handleCancel}
          backText="Back to Customers"
        />

        {/* Add Customer Form - Direct form without wrapper */}
        <div className="mt-8">
          <AddCustomerForm
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
