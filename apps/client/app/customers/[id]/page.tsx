'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Button, 
  EditCustomerForm,
  CustomerPageHeader, 
  CustomerInfoCard, 
  ConfirmationDialog,
  PageWrapper,
  PageHeader,
  PageContent
} from '@rentalshop/ui';
import { 
  ArrowLeft,
  Edit,
  ShoppingBag,
  UserCheck,
  UserX,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  X
} from 'lucide-react';
import { customersApi } from "@rentalshop/utils";
import { useAuth, useSimpleErrorHandler } from '@rentalshop/hooks';
import type { Customer } from '@rentalshop/types';
import type { EditCustomerFormRef } from '@rentalshop/ui';
export default function CustomerPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { handleError } = useSimpleErrorHandler();
  const customerId = params.id as string;
  
  console.log('🔍 CustomerPage: Component rendered with params:', params);
  console.log('🔍 CustomerPage: Customer ID extracted:', customerId);
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  
  // Section visibility states
  const [showEditSection, setShowEditSection] = useState(false);
  const [showOrdersSection, setShowOrdersSection] = useState(false);
  
  const editCustomerFormRef = React.useRef<EditCustomerFormRef>(null);

  
  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setIsLoading(true);
        
        console.log('🔍 CustomerPage: Fetching customer with ID:', customerId);
        
        // Validate ID format (should be numeric)
        const numericId = parseInt(customerId);
        if (isNaN(numericId) || numericId <= 0) {
          console.error('❌ CustomerPage: Invalid ID format:', customerId);
          setCustomer(null);
          return;
        }
        
        console.log('🔍 CustomerPage: Making API call to /api/customers/' + customerId);
        
        // Use the real API to fetch customer data by ID
        const response = await customersApi.getCustomerByPublicId(numericId);
        
        console.log('🔍 CustomerPage: API response received:', response);
        
        if (response.success && response.data) {
          console.log('✅ CustomerPage: Customer fetched successfully:', response.data);
          setCustomer(response.data);
        } else {
          console.error('❌ CustomerPage: API error:', response.error);
          throw new Error(response.error || 'Failed to fetch customer');
        }
        
      } catch (error) {
        console.error('❌ CustomerPage: Error fetching customer:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer details';
        showError('Error', errorMessage);
        // Show error state
        setCustomer(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  // Refresh customer data after updates
  const refreshCustomerData = async () => {
    if (!customerId) return;
    
    try {
      setIsLoading(true);
      const numericId = parseInt(customerId);
      if (isNaN(numericId) || numericId <= 0) return;
      
      const response = await customersApi.getCustomerByPublicId(numericId);
      
      if (response.success && response.data) {
        setCustomer(response.data);
      }
    } catch (error) {
      console.error('❌ CustomerPage: Error refreshing customer data:', error);
    } finally {
      setIsLoading(false);
    }
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
        console.error('❌ CustomerPage: API error:', response.error);
        throw new Error(response.error || 'Failed to delete customer');
      }
      
    } catch (error) {
      console.error('❌ CustomerPage: Error deleting customer:', error);
      showError('Delete Failed', 'Failed to delete customer: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
        showSuccess('Customer Updated', 'Customer information has been updated successfully!');
      } else {
        console.error('❌ CustomerPage: API error:', response.error);
        throw new Error(response.error || 'Failed to update customer');
      }
      
    } catch (error) {
      console.error('❌ CustomerPage: Error updating customer:', error);
      // Note: Error handling is done by the form component, so no toast needed here
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
      
      const response = await customersApi.updateCustomer(customer.id, { isActive: newStatus });
      
      if (response.success) {
        console.log('✅ CustomerPage: Customer status updated successfully');
        
        // Refresh customer data
        await refreshCustomerData();
        
        // Hide confirmation dialog
        setShowDeactivateConfirm(false);
        
        // Show success message
        showSuccess('Status Updated', `Customer ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      } else {
        console.error('❌ CustomerPage: API error:', response.error);
        throw new Error(response.error || 'Failed to update customer status');
      }
      
    } catch (error) {
      console.error('❌ CustomerPage: Error updating customer status:', error);
      showError('Status Update Failed', 'Failed to update customer status: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Customer Not Found</h1>
            <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push('/customers')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <CustomerPageHeader
          title={`${customer.firstName} ${customer.lastName}`}
          subtitle={showEditSection ? "Edit Customer Information" : "Customer Information & Management"}
          onBack={() => router.push('/customers')}
          backText="Back to Customers"
        >
          {/* Header buttons - show different buttons based on edit mode */}
          {showEditSection ? (
            // Edit mode buttons
            <div className="flex gap-2">
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel Edit</span>
              </Button>
            </div>
          ) : (
            // View mode buttons
            <div className="flex gap-2">
              <Button
                onClick={handleEditCustomer}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Customer</span>
              </Button>
              <Button
                onClick={() => router.push(`/customers/${customerId}/orders`)}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>View Orders</span>
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Customer</span>
              </Button>
            </div>
          )}
        </CustomerPageHeader>
      </PageHeader>

      <PageContent>
        {/* Customer Information - Show only when NOT editing */}
        {!showEditSection && (
          <CustomerInfoCard 
            customer={customer}
            showActions={false}
          />
        )}

        {/* Edit Customer Section - Show only when editing */}
        {showEditSection && (
          <EditCustomerForm
            ref={editCustomerFormRef}
            customer={customer}
            onSave={handleCustomerUpdate}
            onCancel={handleCancelEdit}
            isSubmitting={isUpdating}
          />
        )}
      </PageContent>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title="Delete Customer"
        description={`Are you sure you want to delete ${customer.firstName} ${customer.lastName}? This action cannot be undone.`}
        confirmText="Delete Customer"
        onConfirm={handleDeleteCustomer}
      />

      <ConfirmationDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        type={customer.isActive ? 'warning' : 'info'}
        title={customer.isActive ? 'Deactivate Customer' : 'Activate Customer'}
        description={`Are you sure you want to ${customer.isActive ? 'deactivate' : 'activate'} ${customer.firstName} ${customer.lastName}?`}
        confirmText={customer.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={handleToggleCustomerStatus}
      />
    </PageWrapper>
  );
}
