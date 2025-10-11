'use client';

import React, { useState, useEffect } from 'react';
import { getAuthToken } from '@rentalshop/utils';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  Breadcrumb,
  OrderDetail,
  useToast } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import { ordersApi } from '@rentalshop/utils';
import type { OrderDetailData } from '@rentalshop/types';

export default function MerchantOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toastSuccess, showError } = useToast();
  
  const merchantId = params.id as string;
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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

        console.log('🔍 Fetching order details for:', orderNumber);

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

  const handleBackToOrders = () => {
    router.push(`/merchants/${merchantId}/orders`);
  };

  const handleEditOrder = () => {
    router.push(`/merchants/${merchantId}/orders/${orderId}/edit`);
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    try {
      setActionLoading(true);

      const token = getAuthToken();
      if (!token) {
        toastError('Authentication required');
        return;
      }

      const result = await ordersApi.updateOrder(order.id, {
        status: 'CANCELLED'
      });

      if (result.success) {
        setOrder(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
        toastSuccess('Order cancelled successfully');
      } else {
        toastError(result.error || 'Failed to cancel order');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      toastError('An error occurred while cancelling the order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;

    try {
      setActionLoading(true);

      const token = getAuthToken();
      if (!token) {
        toastError('Authentication required');
        return;
      }

      const result = await ordersApi.updateOrder(order.id, {
        status: newStatus
      });

      if (result.success) {
        setOrder(prev => prev ? { ...prev, status: newStatus } : null);
        toastSuccess(`Order status updated to ${newStatus}`);
      } else {
        toastError(result.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      toastError('An error occurred while updating the order status');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickup = async () => {
    if (!order) return;

    try {
      setActionLoading(true);

      const token = getAuthToken();
      if (!token) {
        toastError('Authentication required');
        return;
      }

      const result = await ordersApi.updateOrder(order.id, {
        status: 'PICKUPED',
        pickedUpAt: new Date().toISOString()
      });

      if (result.success) {
        setOrder(prev => prev ? { 
          ...prev, 
          status: 'PICKUPED',
          pickedUpAt: new Date().toISOString()
        } : null);
        toastSuccess('Order marked as picked up');
      } else {
        toastError(result.error || 'Failed to mark order as picked up');
      }
    } catch (err) {
      console.error('Error marking order as picked up:', err);
      toastError('An error occurred while marking the order as picked up');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!order) return;

    try {
      setActionLoading(true);

      const token = getAuthToken();
      if (!token) {
        toastError('Authentication required');
        return;
      }

      const result = await ordersApi.updateOrder(order.id, {
        status: 'RETURNED',
        returnedAt: new Date().toISOString()
      });

      if (result.success) {
        setOrder(prev => prev ? { 
          ...prev, 
          status: 'RETURNED',
          returnedAt: new Date().toISOString()
        } : null);
        toastSuccess('Order marked as returned');
      } else {
        toastError(result.error || 'Failed to mark order as returned');
      }
    } catch (err) {
      console.error('Error marking order as returned:', err);
      toastError('An error occurred while marking the order as returned');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = () => {
    // Settings save functionality could be implemented here
    toastSuccess('Settings saved successfully');
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Order Details</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-bg-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Order Details</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Order</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {error}
            </p>
            <Button
              onClick={handleBackToOrders}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (!order) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Order Details</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium mb-2">Order Not Found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              The requested order could not be found.
            </p>
            <Button
              onClick={handleBackToOrders}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Merchants', href: '/merchants' },
    { label: `Merchant ${merchantId}`, href: `/merchants/${merchantId}` },
    { label: 'Orders', href: `/merchants/${merchantId}/orders` },
    { label: order.orderNumber }
  ];

  return (
    <PageWrapper>
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/dashboard" className="mb-4" />
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <PageTitle>Order Details - {order.orderNumber}</PageTitle>
          </div>
        </div>
      </PageHeader>
      <PageContent>
        <OrderDetail
          order={order}
          onEdit={handleEditOrder}
          onCancel={handleCancelOrder}
          onStatusChange={handleStatusChange}
          onPickup={handlePickup}
          onReturn={handleReturn}
          onSaveSettings={handleSaveSettings}
          loading={actionLoading}
          showActions={true}
        />
      </PageContent>
    </PageWrapper>
  );
}
