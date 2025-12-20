'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { customersApi } from "@rentalshop/utils";
import type { Customer, CustomerUpdateInput } from '@rentalshop/types';
import { 
  useToast,
  PageWrapper,
  PageContent,
  PageHeader,
  PageTitle,
  CustomerPageHeader,
  EditCustomerForm,
  Button
} from '@rentalshop/ui';
import { useDedupedApi } from '@rentalshop/hooks';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toastSuccess, removeToast } = useToast();

  // ============================================================================
  // FETCH CUSTOMER DETAILS - Using Official useDedupedApi Hook
  // ============================================================================
  // ✅ OFFICIAL PATTERN: useDedupedApi hook (inspired by TanStack Query & SWR)
  const { 
    data: customerData, 
    loading: customerLoading, 
    error: customerError 
  } = useDedupedApi({
    filters: { customerId: id },
    fetchFn: async () => {
      // Validate public ID format (should be numeric)
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Invalid customer ID format');
      }
      
      const response = await customersApi.getCustomerById(numericId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch customer');
      }
      
      return response.data;
    },
    enabled: !!id,
    staleTime: 60000, // 60 seconds cache
    cacheTime: 300000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Sync customer data to local state
  const customer = customerData || null;
  const isLoading = customerLoading;

  // Handle customer update
  const handleSave = async (customerData: CustomerUpdateInput) => {
    if (!customer) return;
    
    try {
      setIsSubmitting(true);
      
      console.log('🔍 EditCustomerPage: Updating customer:', customerData);
      
      const response = await customersApi.updateCustomer(customer.id, customerData);
      
      if (response.success) {
        console.log('✅ EditCustomerPage: Customer updated successfully');
        
        // Navigate back to customers list immediately
        // Toast will be handled by Customers component when the page loads
        router.push('/customers');
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
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Error state
  if (!customer) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Customer Not Found</h1>
            <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist or has been removed.</p>
            <Button 
              onClick={() => router.push('/customers')}
              variant="default"
              size="sm"
            >
              Back to Customers
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <CustomerPageHeader
          title={`Edit ${[customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Customer'}`}
          subtitle="Update customer information and contact details"
          onBack={handleCancel}
          backText="Back to Customer"
        />
      </PageHeader>

      <PageContent>
        <EditCustomerForm
          customer={customer}
          onSave={handleSave}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </PageContent>
      
    </PageWrapper>
  );
}
