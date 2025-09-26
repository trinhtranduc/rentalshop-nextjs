/**
 * Edit Order Page for Admin - Uses CreateOrderForm in edit mode
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
import { getAuthToken } from '@rentalshop/utils';
import { useParams, useRouter } from 'next/navigation';
import { 
  CreateOrderForm, 
  FormSkeleton, 
  PageWrapper, 
  PageHeader,
  PageTitle,
  PageContent, 
  useToasts, 
  ToastContainer,
  Button
} from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import { customersApi, productsApi, outletsApi, ordersApi, categoriesApi } from '@rentalshop/utils';
import type { OrderWithDetails, CustomerSearchResult, ProductWithStock, Category } from '@rentalshop/types';
import type { OrderInput } from '@rentalshop/types';

export default function MerchantOrderEditPage() {
  const params = useParams();
  const router = useRouter();
  
  const merchantId = params.id as string;
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Additional state for form data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<Array<{ id: number; name: string }>>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Toast notifications
  const { toasts, showSuccess, showError, removeToast } = useToasts();

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get auth token from localStorage
        const token = getAuthToken();
        if (!token) {
          setError('Authentication required');
          return;
        }

        // Try to fetch order by order number first (if it starts with ORD-) or by ID
        let orderNumber = orderId;
        if (!orderId.startsWith('ORD-')) {
          // If it's just the order number part, construct the full order number
          orderNumber = `ORD-${orderId}`;
        }

        console.log('🔍 Fetching order details for editing:', orderNumber);

        // Use ordersApi to fetch order by number
        const result = await ordersApi.getOrderByNumber(orderNumber);
        
        if (result.success && result.data) {
          setOrder(result.data);
        } else {
          // If by-number fails, try the direct order ID endpoint
          const fallbackResult = await ordersApi.getOrderById(orderId);
          
          if (fallbackResult.success && fallbackResult.data) {
            setOrder(fallbackResult.data);
          } else {
            setError('Failed to fetch order details');
          }
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('An error occurred while fetching order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // Fetch additional data needed for the form
  useEffect(() => {
    if (!merchantId) {
      return;
    }

    // Prevent multiple fetches
    let isMounted = true;

    // Clear data arrays when merchant changes to refresh inventory
    setCustomers([]);
    setProducts([]);
    setOutlets([]);
    setCategories([]);

    const fetchFormData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          return;
        }

        // Fetch data using existing API modules
        const [customersRes, productsRes, outletsRes, categoriesRes] = await Promise.all([
          customersApi.getCustomers({ merchantId: Number(merchantId), isActive: true, limit: 50 }),
          productsApi.getProducts({ merchantId: Number(merchantId), isActive: true, limit: 100 }),
          outletsApi.getOutlets({ merchantId: Number(merchantId), isActive: true, limit: 50 }),
          categoriesApi.getCategories()
        ]);

        if (customersRes.success && customersRes.data) {
          if (isMounted) {
            setCustomers(customersRes.data);
          }
        } else {
          console.error('Failed to fetch customers:', customersRes.error);
        }

        if (productsRes.success && productsRes.data) {
          if (isMounted) {
            setProducts(productsRes.data);
          }
        } else {
          console.error('Failed to fetch products:', productsRes.error);
        }

        if (outletsRes.success && outletsRes.data?.outlets) {
          const mappedOutlets = outletsRes.data.outlets.map((outlet: { id: number; name: string }) => ({
            id: outlet.id,
            name: outlet.name
          }));
          if (isMounted) {
            setOutlets(mappedOutlets);
          }
        } else {
          console.error('Failed to fetch outlets:', outletsRes.error);
        }

        if (categoriesRes.success && categoriesRes.data) {
          if (isMounted) {
            setCategories(categoriesRes.data);
          }
        } else {
          console.error('Failed to fetch categories:', categoriesRes.error);
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
  }, [merchantId]);

  const handleSubmit = async (orderData: OrderInput) => {
    if (!order) return;

    try {
      setActionLoading(true);

      const token = getAuthToken();
      if (!token) {
        showError('Authentication required');
        return;
      }

      // Ensure we have the order ID for the update
      const orderPublicId = order.id; // In admin context, order.id should be the id
      if (!orderPublicId) {
        throw new Error('Order ID not found');
      }

      // Update order via API
      const result = await ordersApi.updateOrder(orderPublicId, orderData);

      if (result.success) {
        // Show success message
        showSuccess('Order updated successfully!');
        // Navigate back to order detail page after successful update
        router.push(`/merchants/${merchantId}/orders/${orderId}`);
      } else {
        throw new Error(result.error || 'Failed to update order');
      }
    } catch (err) {
      console.error('Error updating order:', err);
      showError('Failed to update order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/merchants/${merchantId}/orders/${orderId}`);
  };

  const handleBackToOrders = () => {
    router.push(`/merchants/${merchantId}/orders`);
  };

  const handleFormReady = (_resetFormFn: () => void) => {
    // Form is ready, but we don't need to store the reset function for now
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Edit Order</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="mb-6">
            <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-bg-tertiary rounded animate-pulse" />
          </div>
          <FormSkeleton />
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Edit Order</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Order</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {error}
            </p>
            <div className="space-x-4">
              <Button
                onClick={handleBackToOrders}
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="default"
              >
                Retry Loading
              </Button>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (!order) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Edit Order</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium mb-2">Order Not Found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              The order you're trying to edit could not be found.
            </p>
            <div className="space-x-4">
              <Button
                onClick={handleBackToOrders}
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
              </Button>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Show loading state while fetching form data, but be more lenient
  // Only require merchantId and order to be present - form can work with empty arrays
  const hasMinimalData = merchantId && order;
  
  if (!hasMinimalData) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Edit Order</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="mb-6">
            <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-bg-tertiary rounded animate-pulse" />
          </div>
          <div className="space-y-4 mb-6">
            <div className="h-6 w-32 bg-bg-tertiary rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 w-24 bg-bg-tertiary rounded animate-pulse" />
              <div className="h-4 w-24 bg-bg-tertiary rounded animate-pulse" />
            </div>
          </div>
          <FormSkeleton />
          <div className="mt-6 text-center">
            <Button 
              onClick={() => window.location.reload()}
              variant="default"
            >
              Retry Loading
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleBackToOrders}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
            <PageTitle>Edit Order - {order.orderNumber}</PageTitle>
          </div>
        </div>
      </PageHeader>
      <PageContent>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        
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
          onFormReady={handleFormReady}
        />
      </PageContent>
    </PageWrapper>
  );
}
