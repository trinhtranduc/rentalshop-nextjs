/**
 * Edit Order Page - Uses CreateOrderForm in edit mode
 * 
 * This page demonstrates the DRY principle by reusing CreateOrderForm
 * instead of maintaining a separate EditOrderForm component.
 * 
 * The CreateOrderForm automatically handles:
 * - Pre-populating form fields with existing order data
 * - Switching to edit mode UI and behavior
 * - Different button text and validation
 * - All form functionality for editing orders
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CreateOrderForm, Breadcrumb, FormSkeleton, PageWrapper, useToast } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { orderBreadcrumbs } from '@rentalshop/utils';
import { 
  ordersApi, 
  customersApi, 
  productsApi, 
  outletsApi, 
  categoriesApi 
} from '@rentalshop/utils';
import { useAuth } from '@rentalshop/hooks';
import type { OrderWithDetails, CustomerSearchResult, ProductWithStock, Category, Customer, Product } from '@rentalshop/types';
import type { OrderInput } from '@rentalshop/types';

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Additional state for form data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<Array<{ id: number; name: string }>>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [merchantId, setMerchantId] = useState<string>('');

  // Toast notifications
  const { toastSuccess, toastError, removeToast } = useToast();

  const orderId = params.id as string;
  
  // Extract numeric part from order ID (e.g., "123" from "123" or "ORD-123")
  // Add null check to prevent error when orderId is undefined during initial render
  const numericOrderId = orderId ? orderId.replace(/^ORD-/, '') : '';
  
  // Extract numeric order number from order data for navigation
  const numericOrderNumber = order?.orderNumber ? order.orderNumber.replace(/^ORD-/, '') : numericOrderId;

  useEffect(() => {
    if (!orderId || !numericOrderId) return;

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await ordersApi.getOrderByNumber(`ORD-${numericOrderId}`);

        if (result.success && result.data) {
          setOrder(result.data as OrderWithDetails);
          
          // Extract merchant id from order - API expects id (number), not database CUID (string)
          let foundMerchantPublicId: number | null = null;
          const orderData = result.data as OrderWithDetails;
          
          // Priority order for finding merchant id:
          // 1. outlet.merchant.id (this is what we need for API calls)
          // 2. Fallback to user's merchant id
          if (orderData.outlet?.merchant?.id) {
            foundMerchantPublicId = orderData.outlet.merchant.id;
          } else {
            // Fallback to user's merchant id
            // Note: user.merchant.id is actually the id (number) from auth.ts
            if (user?.merchant?.id) {
              foundMerchantPublicId = user.merchant.id as number;
            } else {
              foundMerchantPublicId = null;
            }
          }
          
          if (foundMerchantPublicId && typeof foundMerchantPublicId === 'number') {
            setMerchantId(foundMerchantPublicId.toString());
          } else {
            setMerchantId('');
          }
        } else {
          setError('Failed to fetch order details');
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('An error occurred while fetching order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, numericOrderId]);

  // Fetch additional data needed for the form
  useEffect(() => {
    if (!merchantId) {
      return;
    }

    // Prevent multiple fetches
    let isMounted = true;

    // Clear data arrays when merchant changes to refresh inventory
    // The form will use initialOrder to preserve selected items
    setCustomers([]);
    setProducts([]);
    setOutlets([]);
    setCategories([]);

    const fetchFormData = async () => {
      try {
        // Fetch customers - get all and filter by merchant
        const customersResult = await customersApi.getCustomers();
        if (customersResult.success && customersResult.data) {
          // Handle both possible API response structures:
          // 1. { data: { customers: [...] } } - paginated response
          // 2. { data: [...] } - direct array response
          let customersArray: Customer[] = [];
          const data = customersResult.data;
          
          if (data && typeof data === 'object' && 'customers' in data && Array.isArray(data.customers)) {
            customersArray = data.customers;
          } else if (Array.isArray(data)) {
            customersArray = data;
          } else {
            customersArray = [];
          }
          
          if (isMounted) {
            setCustomers(customersArray);
          }
        } else {
          // Don't clear if we already have data
          if (customers.length === 0) {
            setCustomers([]);
          }
        }



        // Fetch outlets by merchant
        const outletsResult = await outletsApi.getOutletsByMerchant(Number(merchantId));
        if (outletsResult.success && outletsResult.data?.outlets) {
          const mappedOutlets = outletsResult.data.outlets.map((outlet: { id: number; name: string }) => ({
            id: outlet.id, // API already returns id as 'id'
            name: outlet.name
          }));
          setOutlets(mappedOutlets);
        } else {
          // Clear outlets when merchant changes to refresh data
          setOutlets([]);
        }

        // Fetch categories - get all and filter by merchant if needed
        const categoriesResult = await categoriesApi.getCategories();
        if (categoriesResult.success && categoriesResult.data) {
          // Handle both possible API response structures:
          // 1. { data: { categories: [...] } } - paginated response
          // 2. { data: [...] } - direct array response
          let categoriesArray: Category[] = [];
          const data = categoriesResult.data;
          
          if (data && typeof data === 'object' && 'categories' in data && Array.isArray(data.categories)) {
            categoriesArray = data.categories;
          } else if (Array.isArray(data)) {
            categoriesArray = data;
          } else {
            categoriesArray = [];
          }
          
          const mappedCategories = categoriesArray.map((category: Category) => ({
            id: category.id, // API should return id as 'id'
            name: category.name
          }));
          setCategories(mappedCategories);
        } else {
          // Clear categories when merchant changes to refresh data
          setCategories([]);
        }
      } catch (err) {
        console.error('Error fetching form data:', err);
        // Don't show error for form data, just log it
      }
    };

    fetchFormData();

    return () => {
      isMounted = false;
    };
  }, [merchantId]); // Only depend on merchantId to prevent infinite re-renders

  // Fetch products when outlet changes to get outlet-specific inventory
  useEffect(() => {
    if (!merchantId || !order?.outletId) {
      return;
    }

    // Prevent multiple fetches
    let isMounted = true;

    const fetchOutletProducts = async () => {
      try {
        // Fetch products for the specific outlet to get accurate inventory
        const productsResult = await productsApi.getProducts();
        if (productsResult.success && productsResult.data) {
          // Handle both possible API response structures:
          // 1. { data: { products: [...] } } - paginated response
          // 2. { data: [...] } - direct array response
          let productsArray: Product[] = [];
          const data = productsResult.data;
          
          if (data && typeof data === 'object' && 'products' in data && Array.isArray(data.products)) {
            productsArray = data.products;
          } else if (Array.isArray(data)) {
            productsArray = data;
          } else {
            productsArray = [];
          }
          
          // In edit mode, show all products for the merchant to preserve selections
          // But prioritize products from the current outlet for accurate inventory
          const outletProducts = productsArray;
          
          if (isMounted) {
            setProducts(productsArray);
          }
        } else {
          if (isMounted) {
            setProducts([]);
          }
        }
      } catch (err) {
        console.error('Error fetching outlet products:', err);
        if (isMounted) {
          setProducts([]);
        }
      }
    };

    fetchOutletProducts();

    return () => {
      isMounted = false;
    };
  }, [merchantId, order?.outletId]); // Depend on both merchantId and outletId

  const handleSubmit = async (orderData: OrderInput) => {
    if (!order) return;

    try {
      setActionLoading(true);

      // Ensure we have the order id for the update
      const orderPublicId = order.id;
      if (!orderPublicId) {
        throw new Error('Order id not found');
      }

      // Add the order ID to the update data
      const updateData = {
        ...orderData,
        id: orderPublicId
      };

      const result = await ordersApi.updateOrder(orderPublicId, updateData);

      if (result.success) {
        // Show success message
        toastSuccess('Order updated successfully!');
        // Navigate back to orders list after successful update
        router.push('/orders');
      } else {
        throw new Error(result.error || 'Failed to update order');
      }
    } catch (err) {
      console.error('Error updating order:', err);
      toastError('Failed to update order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/orders/${numericOrderNumber}`);
  };

  const handleFormReady = (_resetFormFn: () => void) => {
    // Form is ready, but we don't need to store the reset function for now
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <FormSkeleton />
      </PageWrapper>
    );
  }

  // Show loading state while fetching form data
  if (!merchantId) {
    return (
      <PageWrapper>
        <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
          <FormSkeleton />
      </PageWrapper>
    );
  }

  // Show loading state while fetching form data, but be more lenient
  // Only require merchantId and order to be present - form can work with empty arrays
  const hasMinimalData = merchantId && order;
  
  if (!hasMinimalData) {
    return (
      <PageWrapper>
        <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-4 mb-6">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <FormSkeleton />
          <div className="mt-6 text-center">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Retry Loading
            </button>
          </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Order</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button 
                onClick={() => router.back()} 
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={() => router.push('/orders')} 
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                View All Orders
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">The order you're looking for could not be found.</p>
            <div className="space-y-3">
              <button 
                onClick={() => router.back()} 
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={() => router.push('/orders')} 
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                View All Orders
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Breadcrumb items - inline
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Orders', href: '/orders' },
    { label: order.orderNumber, href: `/orders/${numericOrderNumber}` },
    { label: 'Edit' }
  ];

  return (
    <PageWrapper>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/" className="mb-6" />
      
      <CreateOrderForm
          isEditMode={true}
          initialOrder={order}
          orderNumber={order.orderNumber}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={actionLoading}
          customers={customers}
          products={products}
          outlets={outlets}
          categories={categories}
          merchantId={Number(merchantId)}
          onFormReady={handleFormReady          }
        />
    </PageWrapper>
  );
}
