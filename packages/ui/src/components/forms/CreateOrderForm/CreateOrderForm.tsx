/**
 * CreateOrderForm - Main refactored component using smaller components and hooks
 * 
 * This component has been broken down into smaller, more maintainable pieces:
 * - Custom hooks for state management and business logic
 * - Smaller UI components for different sections
 * - Better separation of concerns
 * 
 * USAGE EXAMPLES:
 * 
 * 1. CREATE MODE (default):
 * <CreateOrderForm
 *   customers={customers}
 *   products={products}
 *   outlets={outlets}
 *   onSubmit={handleCreateOrder}
 *   onCancel={handleCancel}
 * />
 * 
 * 2. EDIT MODE:
 * <CreateOrderForm
 *   isEditMode={true}
 *   initialOrder={existingOrder}
 *   orderNumber={existingOrder.orderNumber}
 *   customers={customers}
 *   products={products}
 *   outlets={outlets}
 *   onSubmit={handleUpdateOrder}
 *   onCancel={handleCancel}
 * />
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useToasts, ToastContainer } from '@rentalshop/ui';
import { AddCustomerForm } from '../../features/Customers/components/AddCustomerForm';

import { customersApi, handleApiError } from '@rentalshop/utils';
import { useProductAvailability } from '@rentalshop/hooks';
import { VALIDATION, BUSINESS } from '@rentalshop/constants';

// Import our custom hooks and components
import { useCreateOrderForm } from './hooks/useCreateOrderForm';
import { useOrderValidation } from './hooks/useOrderValidation';
import { useProductSearch } from './hooks/useProductSearch';
import { useCustomerSearch } from './hooks/useCustomerSearch';
import { OrderFormHeader } from './components/OrderFormHeader';
import { ProductsSection } from './components/ProductsSection';
import { OrderInfoSection } from './components/OrderInfoSection';
import { OrderSummarySection } from './components/OrderSummarySection';
import { CustomerCreationDialog } from './components/CustomerCreationDialog';
import { OrderPreviewDialog } from './components/OrderPreviewDialog';

import type { 
  CreateOrderFormProps, 
  CustomerSearchResult,
  ProductWithStock,
  ProductAvailabilityStatus 
} from './types';

export const CreateOrderForm: React.FC<CreateOrderFormProps> = (props) => {
  const {
    customers = [],
    products = [],
    outlets = [],
    categories = [],
    onSubmit,
    onCancel,
    loading = false,
    layout = 'split',
    merchantId,
    isEditMode = false,
    initialOrder,
    orderNumber,
    onFormReady,
  } = props;

  // Custom hooks for state management
  const {
    formData,
    setFormData,
    orderItems,
    setOrderItems,
    isSubmitting,
    showOrderPreview,
    setShowOrderPreview,
    addProductToOrder,
    removeProductFromOrder,
    updateOrderItem,
    updateRentalDates,
    handlePreviewClick,
    handleOrderConfirm,
    handleSubmit,
    resetForm,
    calculateRentalDays,
  } = useCreateOrderForm(props);

  const { validationErrors, validateForm, isFormValid } = useOrderValidation();
  const { isLoadingProducts, searchProductsForSelect, searchProducts } = useProductSearch();
  const { 
    isLoadingCustomers, 
    customerSearchResults, 
    searchCustomers, 
    clearCustomerSearchResults,
    setCustomerResults 
  } = useCustomerSearch();

  // Local state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(() => {
    // Initialize with existing customer if in edit mode
    if (isEditMode && initialOrder?.customer) {
      return {
        id: parseInt(initialOrder.customerId) || 0,
        firstName: initialOrder.customer.firstName,
        lastName: initialOrder.customer.lastName,
        phone: initialOrder.customer.phone,
        email: initialOrder.customer.email || '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        merchantId: parseInt(initialOrder.customer.merchantId) || 0,
        merchant: { 
          id: parseInt(initialOrder.customer.merchantId) || 0, 
          name: initialOrder.customer.merchant?.name || '' 
        }
      };
    }
    return null;
  });

  // Product search state - store searched products for selection
  const [searchedProducts, setSearchedProducts] = useState<ProductWithStock[]>([]);

  const [searchQuery, setSearchQuery] = useState(() => {
    // Initialize with selected customer info if in edit mode
    if (isEditMode && initialOrder?.customer) {
      return `${initialOrder.customer.firstName} ${initialOrder.customer.lastName} - ${initialOrder.customer.phone}`;
    }
    return '';
  });

  // Expose resetForm function to parent component
  useEffect(() => {
    if (onFormReady) {
      onFormReady(resetForm);
    }
  }, [onFormReady, resetForm]);

  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);

  // Product availability hook
  const { calculateAvailability } = useProductAvailability();
  
  // Toast notifications
  const { toasts, showSuccess, showError, removeToast } = useToasts();

  // Handle product search and store results
  const handleProductSearch = useCallback(async (query: string) => {
    try {
      const searchResults = await searchProducts(query);
      setSearchedProducts(searchResults);
      return searchResults.map(product => ({
        value: String(product.id),
        label: product.name,
        image: product.images?.[0],
        subtitle: product.barcode ? `Barcode: ${product.barcode}` : 'No Barcode',
        details: [
          `$${(product.rentPrice || 0).toFixed(2)}`,
          `Deposit: $${(product.deposit || 0).toFixed(2)}`,
          `Available: ${product.outletStock?.[0]?.available || 0}`,
          `Total Stock: ${product.outletStock?.[0]?.stock || 0}`,
          product.category?.name || 'No Category'
        ].filter(Boolean),
        type: 'product' as const
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }, [searchProducts]);

  // Create a custom getProductAvailabilityStatus function
  const getProductAvailabilityStatus = useCallback(async (
    product: ProductWithStock, 
    startDate?: string, 
    endDate?: string, 
    requestedQuantity: number = BUSINESS.DEFAULT_QUANTITY
  ): Promise<ProductAvailabilityStatus> => {
    try {
      // Get stock information from outletStock array
      const outletStock = product.outletStock?.[0];
      const available = outletStock?.available ?? 0;
      const stock = outletStock?.stock ?? 0;
      const renting = outletStock?.renting ?? 0;
      const totalStock = stock;

      if (!startDate || !endDate) {
        // Return basic availability status
        if (available === 0) {
          return { 
            status: 'out-of-stock', 
            text: 'Out of Stock', 
            color: 'bg-red-100 text-red-600' 
          };
        } else if (available <= VALIDATION.LOW_STOCK_THRESHOLD) {
          return { 
            status: 'low-stock', 
            text: `Low Stock (${available})`, 
            color: 'bg-orange-100 text-orange-600' 
          };
        } else {
          return { 
            status: 'available', 
            text: `Available (${available})`, 
            color: 'bg-green-100 text-green-600' 
          };
        }
      }

      // Use the hook's calculateAvailability function
      const availability = calculateAvailability(
        {
          id: product.id,
          name: product.name,
          stock: stock,
          renting: renting,
          available: available
        },
        startDate,
        endDate,
        requestedQuantity
      );

      // Ensure we have valid numeric values from the hook response
      const availableQuantity = availability?.availableQuantity ?? 0;
      const isAvailable = availability?.available ?? false;

      // Return formatted status for display
      if (isAvailable) {
        return { 
          status: 'available', 
          text: `Available (${availableQuantity})`, 
          color: 'bg-green-100 text-green-600' 
        };
      } else {
        return { 
          status: 'unavailable', 
          text: `Unavailable (${availableQuantity}/${stock})`, 
          color: 'bg-red-100 text-red-600' 
        };
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      // Fallback to basic status with safe defaults
      const outletStock = product.outletStock?.[0];
      const available = outletStock?.available ?? 0;
      if (available === 0) {
        return { status: 'unknown', text: 'Out of Stock', color: 'bg-red-100 text-red-600' };
      } else if (available <= VALIDATION.LOW_STOCK_THRESHOLD) {
        return { status: 'unknown', text: 'Low Stock', color: 'bg-orange-100 text-orange-600' };
      } else {
        return { status: 'unknown', text: 'In Stock', color: 'bg-green-100 text-green-600' };
      }
    }
  }, [calculateAvailability]);

  // Handle adding new customer
  const handleAddNewCustomer = useCallback(async (customerData: any) => {
    try {
      console.log('🔍 handleAddNewCustomer: Starting customer creation...');
      
      // Get merchant ID from props or fallback to first outlet's merchant ID
      const currentMerchantId = merchantId || outlets[0]?.merchantId;
      
      if (!currentMerchantId) {
        const errorMsg = 'Merchant ID is required to create a customer. Please ensure the form has access to merchant information.';
        showError("Error", errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('🔍 handleAddNewCustomer: Merchant ID found:', currentMerchantId);
      
      // Check for duplicate phone number before creating
      const normalizedPhone = customerData.phone.replace(/[\s\-\(\)\+]/g, '');
      
      // First, check in the already loaded search results for immediate feedback
      const localDuplicate = customerSearchResults.find(customer => {
        if (customer.phone) {
          const existingNormalizedPhone = customer.phone.replace(/[\s\-\(\)\+]/g, '');
          return normalizedPhone === existingNormalizedPhone;
        }
        return false;
      });
      
      if (localDuplicate) {
        const errorMsg = `A customer with phone number "${customerData.phone}" already exists (${localDuplicate.firstName} ${localDuplicate.lastName}). Please use a different phone number or search for the existing customer.`;
        showError("Duplicate Customer", errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('🔍 handleAddNewCustomer: No local duplicates found, checking API...');
      
      // Then check with the API for a more comprehensive check
      const duplicateCheck = await customersApi.getCustomerByPhone(customerData.phone);
      
      if (duplicateCheck.success && duplicateCheck.data) {
        const existingCustomers = duplicateCheck.data.customers || duplicateCheck.data.customer || [];
        const customersArray = Array.isArray(existingCustomers) ? existingCustomers : [existingCustomers];
        
        for (const existingCustomer of customersArray) {
          if (existingCustomer.phone) {
            const existingNormalizedPhone = existingCustomer.phone.replace(/[\s\-\(\)\+]/g, '');
            if (normalizedPhone === existingNormalizedPhone) {
              const errorMsg = `A customer with phone number "${customerData.phone}" already exists (${existingCustomer.firstName} ${existingCustomer.lastName}). Please use a different phone number or search for the existing customer.`;
              showError("Duplicate Customer", errorMsg);
              throw new Error(errorMsg);
            }
          }
        }
      }
      
      console.log('🔍 handleAddNewCustomer: No API duplicates found, creating customer...');
      
      const result = await customersApi.createCustomer({
        ...customerData,
        merchantId: currentMerchantId,
        isActive: true
      });
      
      console.log('🔍 handleAddNewCustomer: API response:', result);
      console.log('🔍 handleAddNewCustomer: result.success:', result.success);
      console.log('🔍 handleAddNewCustomer: result.data:', result.data);
      console.log('🔍 handleAddNewCustomer: result.data?.customer:', result.data?.customer);
      
      if (result.success && result.data && (result.data.customer || result.data.firstName)) {
        // The customer data might be directly in result.data or nested under result.data.customer
        const newCustomer = result.data.customer || result.data;
        
        console.log('🔍 handleAddNewCustomer: Customer created successfully:', newCustomer);
        
        // Add to search results
        setCustomerResults([newCustomer, ...customerSearchResults]);
        
        // Auto-select the new customer
        setFormData(prev => ({
          ...prev,
          customerId: Number(newCustomer.id),
        }));
        setSelectedCustomer(newCustomer);
        
        // Update search query to show the new customer
        setSearchQuery(`${newCustomer.firstName} ${newCustomer.lastName} - ${newCustomer.phone}`);
        
        // Show success message
        showSuccess("Customer Created", `Customer "${newCustomer.firstName} ${newCustomer.lastName}" has been created and selected.`);
        
        console.log('🔍 handleAddNewCustomer: Function completed successfully');
      } else {
        // Extract error message from API response
        const errorMessage = result.message || result.error || 'Failed to create customer';
        console.error('❌ handleAddNewCustomer: API error:', errorMessage);
        console.error('❌ handleAddNewCustomer: Full result:', result);
        showError("Error", errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ handleAddNewCustomer: Error occurred:', error);
      // Re-throw the error so the dialog stays open
      throw error;
    }
  }, [merchantId, outlets, customerSearchResults, setCustomerResults, setFormData, showSuccess, showError]);

  // Handle customer selection
  const handleCustomerSelect = useCallback((customer: CustomerSearchResult) => {
    console.log('🔍 handleCustomerSelect: Customer selected:', customer);
    console.log('🔍 handleCustomerSelect: Customer ID:', customer.id);
    console.log('🔍 handleCustomerSelect: Customer ID type:', typeof customer.id);
    console.log('🔍 handleCustomerSelect: Full customer object keys:', Object.keys(customer));
    console.log('🔍 handleCustomerSelect: Customer publicId:', (customer as any).publicId);
    console.log('🔍 handleCustomerSelect: Customer _id:', (customer as any)._id);
    
    // Try to find the ID field
    const customerId = customer.id || (customer as any).publicId || (customer as any)._id;
    console.log('🔍 handleCustomerSelect: Resolved customer ID:', customerId);
    
    setSelectedCustomer(customer);
    // Update form data with the customer's numeric ID
    setFormData(prev => {
      console.log('🔍 handleCustomerSelect: Previous formData:', prev);
      const newFormData = { ...prev, customerId: customerId };
      console.log('🔍 handleCustomerSelect: New formData:', newFormData);
      return newFormData;
    });
    setSearchQuery(`${customer.firstName} ${customer.lastName} - ${customer.phone}`);
  }, []);

  // Initialize form data when initialOrder changes (for edit mode)
  useEffect(() => {
    if (isEditMode && initialOrder) {
      // Update selected customer and search query
      if (initialOrder.customer) {
        const customer = {
          id: parseInt(initialOrder.customerId) || 0,
          publicId: parseInt(initialOrder.customerId) || 0, // Required by CustomerSearchResult type
          firstName: initialOrder.customer.firstName,
          lastName: initialOrder.customer.lastName,
          phone: initialOrder.customer.phone,
          email: initialOrder.customer.email || '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          merchantId: parseInt(initialOrder.customer.merchantId) || 0,
          merchant: { id: parseInt(initialOrder.customer.merchantId) || 0, name: '' }
        };
        setSelectedCustomer(customer);
        setSearchQuery(`${customer.firstName} ${customer.lastName} - ${customer.phone}`);
      }
    }
  }, [isEditMode, initialOrder]);

  // Form validation
  const validateFormAndSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate form
    if (!validateForm(formData, orderItems)) {
      return;
    }
    
    await handleSubmit(e);
  }, [isSubmitting, validateForm, formData, orderItems, handleSubmit]);

  // Check if form is valid for UI
  const isFormValidForUI = isFormValid(formData, orderItems);

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="w-full">
        {/* Header for edit mode */}
        <OrderFormHeader 
          orderNumber={orderNumber} 
          isEditMode={isEditMode} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Left Column - Products Section (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <ProductsSection
              orderItems={orderItems}
              products={[...products, ...searchedProducts]} // Combine initial products with searched products
              onAddProduct={addProductToOrder}
              onRemoveProduct={removeProductFromOrder}
              onUpdateOrderItem={updateOrderItem}
              onSearchProducts={handleProductSearch} // Use our custom search function
              isLoadingProducts={isLoadingProducts}
              orderType={formData.orderType}
              pickupDate={formData.pickupPlanAt}
              returnDate={formData.returnPlanAt}
              getProductAvailabilityStatus={getProductAvailabilityStatus}
            />
          </div>

          {/* Right Column - Order Info & Summary (1/3) */}
          <div className="space-y-6">
            <OrderInfoSection
              formData={formData}
              outlets={outlets}
              selectedCustomer={selectedCustomer}
              searchQuery={searchQuery}
              customerSearchResults={customerSearchResults}
              isLoadingCustomers={isLoadingCustomers}
              isEditMode={isEditMode}
              onFormDataChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
              onCustomerSelect={handleCustomerSelect}
              onCustomerClear={() => {
                setSelectedCustomer(null);
                setSearchQuery('');
                setFormData(prev => ({ ...prev, customerId: undefined }));
              }}
              onSearchQueryChange={setSearchQuery}
              onCustomerSearch={searchCustomers}
              onShowAddCustomerDialog={() => setShowAddCustomerDialog(true)}
              onUpdateRentalDates={updateRentalDates}
            />

            <OrderSummarySection
              formData={formData}
              orderItems={orderItems}
              isEditMode={isEditMode}
              loading={loading || isSubmitting}
              isFormValid={isFormValidForUI}
              onPreviewClick={handlePreviewClick}
              onCancel={onCancel}
            />
          </div>
        </div>
      </div>

      {/* Customer Creation Dialog */}
      <CustomerCreationDialog
        open={showAddCustomerDialog}
        onOpenChange={setShowAddCustomerDialog}
        onCustomerCreated={handleAddNewCustomer}
        merchantId={merchantId}
      />

      {/* Order Preview Dialog */}
      <OrderPreviewDialog
        open={showOrderPreview}
        onOpenChange={setShowOrderPreview}
        orderData={{
          orderType: formData.orderType,
          customerId: formData.customerId || 0,
          customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : undefined,
          customerPhone: selectedCustomer?.phone,
          customerEmail: selectedCustomer?.email,
          outletId: formData.outletId || 0,
          outletName: outlets.find(o => o.id === formData.outletId)?.name,
          pickupPlanAt: formData.pickupPlanAt,
          returnPlanAt: formData.returnPlanAt,
          subtotal: formData.subtotal,
          taxAmount: formData.taxAmount,
          discountAmount: formData.discountAmount,
          totalAmount: formData.totalAmount,
          depositAmount: formData.depositAmount,
          securityDeposit: formData.securityDeposit,
          lateFee: formData.lateFee,
          damageFee: formData.damageFee,
          notes: formData.notes,
          orderItems: (() => {
            console.log('🔍 Creating preview data - orderItems from state:', orderItems);
            console.log('🔍 Creating preview data - orderItems length:', orderItems.length);
            return orderItems.map(item => ({
              productId: item.productId,
              product: item.product, // Include the full product information
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              deposit: item.deposit ?? 0, // Ensure deposit is always a number
              notes: item.notes || ''
            }));
          })()
        }}
        products={products}
        onConfirm={handleOrderConfirm}
        onEdit={() => setShowOrderPreview(false)}
        loading={loading || isSubmitting}
        confirmText={isEditMode ? 'Update Order' : 'Confirm & Create Order'}
        editText="Back to Edit"
        title="Order Preview"
        subtitle="Review your order details before confirming"
      />

      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};
