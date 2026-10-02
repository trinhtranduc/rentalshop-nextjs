'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, 
  Breadcrumb,
  EditCustomerDialog,
  CustomerContactCard,
  CustomerRecentOrders,
  CustomerSummaryPanel,
  CustomerLoyaltyFold,
  CustomerLoyaltyTab,
  ConfirmationDialog,
  PageWrapper,
  useToast } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { customerBreadcrumbs } from '@rentalshop/utils';
import { ArrowLeft, Edit, ShoppingBag } from 'lucide-react';
import { customersApi } from "@rentalshop/utils";
import { useAuth, useCustomerTranslations, useCommonTranslations, useDedupedApi } from '@rentalshop/hooks';
import type { Customer } from '@rentalshop/types';
export default function CustomerPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { toastSuccess } = useToast();
  const t = useCustomerTranslations();
  const tc = useCommonTranslations();
  const customerId = params.id as string;
  
  console.log('🔍 CustomerPage: Component rendered with params:', params);
  console.log('🔍 CustomerPage: Customer ID extracted:', customerId);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  
  // Section visibility states
  const [showEditSection, setShowEditSection] = useState(false);
  const [showOrdersSection, setShowOrdersSection] = useState(false);
  const [showLoyaltySection, setShowLoyaltySection] = useState(false);
  

  // ============================================================================
  // FETCH CUSTOMER DETAILS - Using Official useDedupedApi Hook
  // ============================================================================
  // ✅ OFFICIAL PATTERN: useDedupedApi hook (inspired by TanStack Query & SWR)
  const { 
    data: customerData, 
    loading: customerLoading, 
    error: customerError,
    refetch: refetchCustomer
  } = useDedupedApi({
    filters: { customerId },
    fetchFn: async () => {
      // Validate ID format (should be numeric)
      const numericId = parseInt(customerId);
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Invalid customer ID format');
      }
      
      const response = await customersApi.getCustomerById(numericId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || t('messages.loadingCustomers'));
      }
      
      return response.data;
    },
    enabled: !!customerId,
    staleTime: 60000, // 60 seconds cache
    cacheTime: 300000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Sync customer data to local state
  const customer = customerData || null;
  const isLoading = customerLoading;

  // Refresh customer data after updates
  const refreshCustomerData = async () => {
    if (!customerId) return;
    await refetchCustomer();
  };



  // Handle customer deletion
  const handleDeleteCustomer = async () => {
    if (!customer) return;
    
    try {
      setIsUpdating(true);
      
      console.log('🔍 CustomerPage: Deleting customer:', customer.id);
      
      const response = await customersApi.deleteCustomer(customer.id);
      
      if (response.success) {
        console.log('✅ CustomerPage: Customer deleted successfully');
        
        // Navigate back to customers list
        router.push('/customers');
      } else {
        console.error('❌ CustomerPage: API showError:', response.error);
        throw new Error(response.error || t('messages.deleteFailed'));
      }
      
    } catch (error) {
      console.error('❌ CustomerPage: Error deleting customer:', error);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  // Handle customer update
  const handleCustomerUpdate = async (customerData: any) => {
    if (!customer) return;
    
    try {
      setIsUpdating(true);
      
      console.log('🔍 CustomerPage: Updating customer:', customerData);
      
      const response = await customersApi.updateCustomer(customer.id, customerData);
      
      if (response.success) {
        console.log('✅ CustomerPage: Customer updated successfully');
        
        // Refresh customer data
        await refreshCustomerData();
        
        // Hide edit section
        setShowEditSection(false);
        
        // Show success toast
        toastSuccess(t('messages.updateSuccess'), t('messages.updateSuccess'));
      } else {
        console.error('❌ CustomerPage: API showError:', response.error);
        throw new Error(response.error || t('messages.updateFailed'));
      }
      
    } catch (error) {
      console.error('❌ CustomerPage: Error updating customer:', error);
      throw error; // the dialog shows it and stays open
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle customer deactivation/activation
  const handleToggleCustomerStatus = async () => {
    if (!customer) return;
    
    try {
      setIsUpdating(true);
      
      const newStatus = !customer.isActive;
      console.log('🔍 CustomerPage: Toggling customer status to:', newStatus);
      
      const response = await customersApi.updateCustomer(customer.id, { 
        id: customer.id,
        isActive: newStatus 
      });
      
      if (response.success) {
        console.log('✅ CustomerPage: Customer status updated successfully');
        
        // Refresh customer data
        await refreshCustomerData();
        
        // Hide confirmation dialog
        setShowDeactivateConfirm(false);
        
        // Show success message
        toastSuccess(tc('messages.updateSuccess'), tc('messages.updateSuccess'));
      } else {
        console.error('❌ CustomerPage: API showError:', response.error);
        throw new Error(response.error || t('messages.updateFailed'));
      }
      
    } catch (error) {
      console.error('❌ CustomerPage: Error updating customer status:', error);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle edit customer
  const handleEditCustomer = () => {
    setShowEditSection(true);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setShowEditSection(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('messages.noCustomers')}</h1>
            <p className="text-gray-600 mb-6">{tc('messages.notFound')}</p>
            <Button onClick={() => router.push('/customers')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {tc('buttons.back')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || customer.phone || '—';
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t('title'), href: '/customers' },
    { label: name }
  ];

  return (
    <PageWrapper>
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/" className="mb-4" />

      {/* Header: who, and the everyday actions */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="ghost" onClick={() => router.push('/customers')} size="sm" className="h-9 w-9 shrink-0 p-0" aria-label={tc('buttons.back')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{name}</h1>
            {customer.phone && <p className="text-sm tabular-nums text-gray-600">{customer.phone}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push(`/customers/${customerId}/orders`)} variant="outline">
            <ShoppingBag className="mr-2 h-4 w-4" />
            {t('actions.orders')}
          </Button>
          <Button onClick={handleEditCustomer}>
            <Edit className="mr-2 h-4 w-4" />
            {t('actions.edit')}
          </Button>
        </div>
      </div>

      {/* Same two columns as product and user pages */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          <CustomerContactCard customer={customer} />
          <CustomerRecentOrders customer={customer} />
          <CustomerLoyaltyFold label="Loyalty">
            <CustomerLoyaltyTab customerId={customer.id} />
          </CustomerLoyaltyFold>
        </div>
        <aside className="min-w-0 lg:sticky lg:top-4">
          <CustomerSummaryPanel customer={customer} onDelete={() => setShowDeleteConfirm(true)} isUpdating={isUpdating} />
        </aside>
      </div>

      {/* Edit in a dialog, as on the customer list */}
      <EditCustomerDialog
        open={showEditSection}
        onOpenChange={setShowEditSection}
        customer={customer}
        onCustomerUpdated={handleCustomerUpdate}
      />

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title={t('actions.deleteCustomer')}
        description={t('messages.confirmDeleteDetails', { name: [customer.firstName, customer.lastName].filter(Boolean).join(' ') })}
        confirmText={t('actions.deleteCustomer')}
        onConfirm={handleDeleteCustomer}
      />

      <ConfirmationDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        type={customer.isActive ? 'warning' : 'info'}
        title={customer.isActive ? t('actions.deactivate') : t('actions.activate')}
        description={tc('messages.confirmAction')}
        confirmText={customer.isActive ? t('actions.deactivate') : t('actions.activate')}
        onConfirm={handleToggleCustomerStatus}
      />
    </PageWrapper>
  );
}
