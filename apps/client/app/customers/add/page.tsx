'use client'
import { 
  useToast, 
  Button,
  PageWrapper,
  PageHeader,
  PageContent,
  ProductsLoading,
  CustomerPageHeader,
  AddCustomerForm,
  LoadingIndicator
} from '@rentalshop/ui';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { customersApi } from "@rentalshop/utils";
import { useAuth, useCommonTranslations } from '@rentalshop/hooks';
import type { CustomerInput, CustomerCreateInput } from '@rentalshop/types';

export default function AddCustomerPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toastSuccess, removeToast } = useToast();
  const tc = useCommonTranslations();

  // Get merchantId from current user
  const merchantId = user?.merchant?.id ? Number(user.merchant.id) : undefined;

  const handleSave = async (customerData: CustomerCreateInput) => {
    try {
      if (!merchantId) {
        throw new Error(tc('messages.sessionExpired'));
      }

      setIsSubmitting(true);
      
      // Convert UI form data to database format
      // Clean customer data: remove empty strings, only send fields with actual values
      const cleanedData: any = {};
      const rawData = {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email?.trim(),
        phone: customerData.phone,
        address: customerData.address,
        city: customerData.city,
        state: customerData.state,
        zipCode: customerData.zipCode,
        country: customerData.country,
        notes: 'Customer created via admin interface',
        merchantId
      };
      
      Object.entries(rawData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'string' && value.trim() !== '') {
            cleanedData[key] = value;
          } else if (typeof value !== 'string') {
            cleanedData[key] = value;
          }
        }
      });
      
      const customerWithMerchant = cleanedData;
      
      console.log('🔍 AddCustomerPage: Creating customer:', customerWithMerchant);
      
      // Use the real API
      const response = await customersApi.createCustomer(customerWithMerchant);
      
      if (response.success) {
        console.log('✅ AddCustomerPage: Customer created successfully:', response.data);
        
        // Navigate back to customers list immediately
        // Toast will be handled by Customers component when the page loads
        router.push('/customers');
      } else {
        console.error('❌ AddCustomerPage: API error:', response.error);
        console.log('🔍 AddCustomerPage: Full API response:', response);
        console.log('🔍 AddCustomerPage: Response error field:', response.error);
        console.log('🔍 AddCustomerPage: Response errorCode field:', (response as any).errorCode);
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
  // Show error if no merchant ID after loading
  if (!merchantId) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-medium">
              Unable to create customer. Please log in again.
            </div>
            <Button
              onClick={handleCancel}
              variant="link"
              className="mt-4"
            >
              {tc('buttons.back')}
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Center Loading Indicator - Shows when waiting for API */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
          <LoadingIndicator 
            variant="circular" 
            size="lg"
            message={tc('labels.loading') || 'Loading form...'}
          />
        </div>
      )}
      <PageHeader>
        <CustomerPageHeader
          title="Add New Customer"
          subtitle="Create a new customer account with basic information"
          onBack={handleCancel}
          backText={tc('buttons.back')}
        />
      </PageHeader>

      <PageContent>
        <AddCustomerForm
          onSave={handleSave}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </PageContent>
      
    </PageWrapper>
  );
}
