"use client";

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
import { useToast, ToastContainer } from '@rentalshop/ui';
import { AddCustomerForm } from '../../features/Customers/components/AddCustomerForm';

import { customersApi, productsApi, handleApiError, formatCurrency, type ProductAvailabilityRequest } from '@rentalshop/utils';
import { useProductAvailability, useOrderTranslations } from '@rentalshop/hooks';
import { VALIDATION, BUSINESS } from '@rentalshop/constants';

// Import our custom hooks and components
import { useCreateOrderForm } from './hooks/useCreateOrderForm';
import { useOrderValidation } from './hooks/useOrderValidation';
import { useProductSearch } from './hooks/useProductSearch';
import { useCustomerSearch } from './hooks/useCustomerSearch';
import { useAuth } from '@rentalshop/hooks';
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
    currency = 'USD', // Default to USD if not provided
    isEditMode = false,
    initialOrder,
    orderNumber,
    onFormReady,
  } = props;

  // Translation hook
  const t = useOrderTranslations();

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
  const { isLoadingProducts, searchProductsForSelect, searchProducts } = useProductSearch(currency as any);
  const { 
    isLoadingCustomers, 
    customerSearchResults, 
    searchCustomers, 
    clearCustomerSearchResults,
    setCustomerResults 
  } = useCustomerSearch();

  // Get merchant data from user context (no API call needed!)
  const { user } = useAuth();
  const merchantData = user?.merchant || null;
  
  // Debug merchant data
  console.log('🔍 CreateOrderForm - Merchant Data:', {
    hasUser: !!user,
    hasMerchant: !!merchantData,
    pricingType: merchantData?.pricingType,
    businessType: merchantData?.businessType,
    fullMerchant: merchantData
  });

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
  const { toastSuccess, toastError, removeToast } = useToast();

  // Handle product search and store results
  const handleProductSearch = useCallback(async (query: string) => {
    try {
      const searchResults = await searchProducts(query);
      setSearchedProducts(searchResults);
      
      // Get the selected outlet ID from form data
      const selectedOutletId = formData.outletId;
      
      return searchResults.map(product => {
        // Find outlet stock for the selected outlet, or use first one if no outlet selected
        const outletStock = selectedOutletId
          ? product.outletStock?.find((os: any) => os.outletId === selectedOutletId)
          : product.outletStock?.[0];
        
        const available = outletStock?.available ?? 0;
        const stock = outletStock?.stock ?? 0;
        
        return {
          value: String(product.id),
          label: product.name,
          image: product.images?.[0],
          subtitle: product.barcode ? `Barcode: ${product.barcode}` : t('messages.noBarcode'),
          details: [
            formatCurrency(product.rentPrice || 0, currency as any),
            `Deposit: ${formatCurrency(product.deposit || 0, currency as any)}`,
            `Available: ${available}`,
            `Total Stock: ${stock}`,
            product.category?.name || t('messages.noCategory')
          ].filter(Boolean),
          type: 'product' as const
        };
      });
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }, [searchProducts, currency, formData.outletId, t]);

  // Create a custom getProductAvailabilityStatus function using new API
  const getProductAvailabilityStatus = useCallback(async (
    product: ProductWithStock, 
    startDate?: string, 
    endDate?: string, 
    requestedQuantity: number = BUSINESS.DEFAULT_QUANTITY
  ): Promise<ProductAvailabilityStatus> => {
    try {
      console.log('🔍 Checking availability for product:', {
        productId: product.id,
        productName: product.name,
        startDate,
        endDate,
        requestedQuantity
      });

      // Prepare API request parameters
      const requestParams: ProductAvailabilityRequest = {
        quantity: requestedQuantity,
        includeTimePrecision: true,
        timeZone: 'UTC',
        outletId: formData.outletId // Required for MERCHANT and ADMIN roles
      };

      // Add rental dates if provided (for RENT mode)
      if (startDate && endDate && formData.orderType === 'RENT') {
        // Convert dates to ISO format for API
        requestParams.startDate = new Date(startDate).toISOString();
        requestParams.endDate = new Date(endDate).toISOString();
      }

      // Call the new availability API
      const availabilityResponse = await productsApi.checkProductAvailability(product.id, requestParams);
      
      if (availabilityResponse.success && availabilityResponse.data) {
        const availabilityData = availabilityResponse.data;
        
        console.log('🔍 Availability API response:', availabilityData);

        // Determine status based on API response
        if (!availabilityData.stockAvailable) {
          return {
            status: 'out-of-stock',
            text: `Out of Stock (need ${requestedQuantity}, have ${availabilityData.totalAvailableStock})`,
            color: 'bg-red-100 text-red-600'
          };
        }

        // Check if any outlet can fulfill the request
        const canFulfill = availabilityData.availabilityByOutlet?.some((outlet: any) => outlet.canFulfillRequest);
        const effectivelyAvailable = availabilityData.availabilityByOutlet?.reduce((sum: number, outlet: any) => 
          sum + outlet.effectivelyAvailable, 0) || availabilityData.totalAvailableStock;

        // Primary check: isAvailable from API (this is the authoritative source)
        if (!availabilityData.isAvailable) {
          const conflictCount = availabilityData.totalConflictsFound || 0;
          return {
            status: 'unavailable',
            text: conflictCount > 0 
              ? `Conflicts detected (${conflictCount} orders)`
              : 'Unavailable for selected dates',
            color: 'bg-orange-100 text-orange-600'
          };
        }

        // Secondary check: canFulfillRequest (even if isAvailable is true, check if outlets can fulfill)
        if (!canFulfill) {
          return {
            status: 'low-stock',
            text: `Low Stock (${effectivelyAvailable}/${requestedQuantity})`,
            color: 'bg-orange-100 text-orange-600'
          };
        }

        // Available: isAvailable is true AND canFulfillRequest is true
        // Note: hasNoConflicts can be false but still available if there's enough stock
        const conflictCount = availabilityData.totalConflictsFound || 0;
        return {
          status: 'available',
          text: conflictCount > 0 
            ? `Available (${effectivelyAvailable} units) - ${conflictCount} conflict(s) but sufficient stock`
            : `Available (${effectivelyAvailable} units)`,
          color: 'bg-green-100 text-green-600'
        };
      } else {
        // API call failed, fallback to basic stock check
        console.warn('Availability API failed, falling back to basic stock check');
        throw new Error('API call failed');
      }
    } catch (error) {
      console.error('Error checking availability via API:', error);
      
      // Fallback to basic stock availability check
      try {
        const outletStock = product.outletStock?.[0];
        const available = outletStock?.available ?? 0;
        const stock = outletStock?.stock ?? 0;

        console.log('🔍 Fallback to basic stock check:', { available, stock, requestedQuantity });

        if (available === 0) {
          return { 
            status: 'out-of-stock', 
            text: t('messages.outOfStock'), 
            color: 'bg-red-100 text-red-600' 
          };
        } else if (available < requestedQuantity) {
          return { 
            status: 'low-stock', 
            text: `Low Stock (${available}/${requestedQuantity})`, 
            color: 'bg-orange-100 text-orange-600' 
          };
        } else {
          return { 
            status: 'available', 
            text: `Available (${available})`, 
            color: 'bg-green-100 text-green-600' 
          };
        }
      } catch (fallbackError) {
        console.error('Fallback availability check also failed:', fallbackError);
        return { 
          status: 'unknown', 
          text: 'Check unavailable', 
          color: 'bg-gray-100 text-gray-600' 
        };
      }
    }
  }, [formData.orderType, t]);

  // Handle adding new customer
  const handleAddNewCustomer = useCallback(async (customerData: any) => {
    try {
      console.log('🔍 handleAddNewCustomer: Starting customer creation...');
      
      // Get merchant ID from props or fallback to first outlet's merchant ID
      const currentMerchantId = merchantId || outlets[0]?.merchantId;
      
      if (!currentMerchantId) {
        const errorMsg = 'Merchant ID is required to create a customer. Please ensure the form has access to merchant information.';
        toastError(t('messages.error'), errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('🔍 handleAddNewCustomer: Merchant ID found:', currentMerchantId);
      
      // Check for duplicate phone number before creating (only if phone is provided)
      if (customerData.phone && customerData.phone.trim()) {
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
          const errorMsg = `A customer with phone number "${customerData.phone}" already exists (${localDuplicate.firstName} ${localDuplicate.lastName || ''}). Please use a different phone number or search for the existing customer.`;
          toastError(t('messages.duplicateCustomer'), errorMsg);
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
                const errorMsg = `A customer with phone number "${customerData.phone}" already exists (${existingCustomer.firstName} ${existingCustomer.lastName || ''}). Please use a different phone number or search for the existing customer.`;
                toastError(t('messages.duplicateCustomer'), errorMsg);
                throw new Error(errorMsg);
              }
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
        toastSuccess(t('messages.customerCreated'), `Customer "${newCustomer.firstName} ${newCustomer.lastName}" ${t('messages.customerCreatedMessage')}`);
        
        console.log('🔍 handleAddNewCustomer: Function completed successfully');
      } else {
        // Extract error message from API response
        const errorMessage = result.message || result.error || t('messages.failedToCreateCustomer');
        console.error('❌ handleAddNewCustomer: API error:', errorMessage);
        console.error('❌ handleAddNewCustomer: Full result:', result);
        toastError(t('messages.error'), errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ handleAddNewCustomer: Error occurred:', error);
      // Re-throw the error so the dialog stays open
      throw error;
    }
  }, [merchantId, outlets, customerSearchResults, setCustomerResults, setFormData, toastSuccess, toastError]);

  // Handle customer selection
  const handleCustomerSelect = useCallback((customer: CustomerSearchResult) => {
    console.log('🔍 handleCustomerSelect: Customer selected:', customer);
    console.log('🔍 handleCustomerSelect: Customer ID:', customer.id);
    console.log('🔍 handleCustomerSelect: Customer ID type:', typeof customer.id);
    console.log('🔍 handleCustomerSelect: Full customer object keys:', Object.keys(customer));
    console.log('🔍 handleCustomerSelect: Customer id:', customer.id);
    
    // Use customer.id (number) - frontend always uses id
    const customerId = customer.id;
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
    <div className="w-full min-h-full bg-bg-secondary">
      <div className="w-full">
        <div className="flex flex-col lg:flex-row gap-4 px-4 py-4">
          {/* Column 1 - Products Section (40%) */}
          <div className="lg:w-[40%] space-y-4">
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
              currency={currency}
            />
          </div>

          {/* Column 2 - Order Information (30%) */}
          <div className="lg:w-[30%] space-y-4">
            <OrderInfoSection
              formData={formData}
              outlets={outlets}
              selectedCustomer={selectedCustomer}
              searchQuery={searchQuery}
              customerSearchResults={customerSearchResults}
              isLoadingCustomers={isLoadingCustomers}
              isEditMode={isEditMode}
              merchantData={merchantData}
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
              currency={currency}
            />
          </div>

          {/* Column 3 - Order Summary & Actions (30%) - Sticky positioning */}
          <div className="lg:w-[30%] space-y-4">
            <div className="lg:sticky lg:top-4">
              <OrderSummarySection
                formData={formData}
                orderItems={orderItems}
                isEditMode={isEditMode}
                loading={loading || isSubmitting}
                isFormValid={isFormValidForUI}
                onPreviewClick={handlePreviewClick}
                onCancel={onCancel}
                currency={currency}
              />
            </div>
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
        confirmText={isEditMode ? t('actions.updateOrder') : t('actions.confirmCreate')}
        editText={t('actions.backToEdit')}
        title={t('actions.orderPreview')}
        subtitle={t('actions.reviewBeforeConfirm')}
      />    </div>
  );
};
