'use client';

import React, { useState, useEffect } from 'react';
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
import type { OrderWithDetails } from '@rentalshop/types';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the orderId as-is - API endpoint handles both with and without ORD- prefix
        // Order numbers in database are like "025-0004" but URLs may have "ORD-025-0004"
        // API will try both formats automatically
        const orderNumber = orderId;

        console.log('🔍 Admin: Fetching order details for:', {
          originalOrderId: orderId,
          orderNumber: orderNumber
        });

        // Use ordersApi to fetch order by number (API handles ORD- prefix automatically)
        const result = await ordersApi.getOrderByNumber(orderNumber);
        
        console.log('🔍 Admin: API response:', {
          success: result.success,
          hasData: !!result.data,
          error: result.error,
          message: result.message
        });
        
        if (result.success && result.data) {
          console.log('✅ Admin: Order found:', result.data);
          const orderData = result.data as any;
          setOrder({
            ...orderData,
            itemCount: orderData.orderItems?.length || 0,
            paymentCount: orderData.payments?.length || 0,
            totalPaid: orderData.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
          } as OrderWithDetails);
        } else {
          console.log('⚠️ Admin: Order not found by number, trying numeric ID fallback');
          // If by-number fails, try to parse as numeric ID
          const numericId = parseInt(orderId);
          if (!isNaN(numericId)) {
            console.log('🔍 Admin: Trying numeric ID:', numericId);
            const fallbackResult = await ordersApi.getOrder(numericId);
            
            console.log('🔍 Admin: Fallback API response:', {
              success: fallbackResult.success,
              hasData: !!fallbackResult.data,
              error: fallbackResult.error
            });
            
            if (fallbackResult.success && fallbackResult.data) {
              console.log('✅ Admin: Order found by numeric ID');
              const orderData = fallbackResult.data as any;
              setOrder({
                ...orderData,
                itemCount: orderData.orderItems?.length || 0,
                paymentCount: orderData.payments?.length || 0,
                totalPaid: orderData.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
              } as OrderWithDetails);
            } else {
              console.error('❌ Admin: Order not found by numeric ID either');
              setError(result.error || result.message || 'Order not found');
            }
          } else {
            console.error('❌ Admin: Invalid order ID format');
            setError(result.error || result.message || 'Order not found');
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
    router.push('/orders');
  };

  const handleEditOrder = () => {
    router.push(`/orders/${orderId}/edit`);
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    try {
      setActionLoading(true);

      const result = await ordersApi.cancelOrder(order.id);

      if (result.success) {
        router.refresh();
        toastSuccess('Order cancelled successfully');
        // Refresh order data
        const refreshResult = await ordersApi.getOrder(order.id);
        if (refreshResult.success && refreshResult.data) {
          const orderData = refreshResult.data as any;
          setOrder({
            ...orderData,
            itemCount: orderData.orderItems?.length || 0,
            paymentCount: orderData.payments?.length || 0,
            totalPaid: orderData.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
          } as OrderWithDetails);
        }
      } else {
        toastError(result.error || 'Failed to cancel order');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      toastError('An error occurred while cancelling order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    if (!order) return;

    try {
      setActionLoading(true);

      const result = await ordersApi.updateOrderStatus(orderId, newStatus);

      if (result.success) {
        router.refresh();
        toastSuccess('Order status updated successfully');
        // Refresh order data
        const refreshResult = await ordersApi.getOrder(orderId);
        if (refreshResult.success && refreshResult.data) {
          const orderData = refreshResult.data as any;
          setOrder({
            ...orderData,
            itemCount: orderData.orderItems?.length || 0,
            paymentCount: orderData.payments?.length || 0,
            totalPaid: orderData.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
          } as OrderWithDetails);
        }
      } else {
        toastError(result.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      toastError('An error occurred while updating order status');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickupOrder = async (orderId: number, data: any) => {
    if (!order) return;

    try {
      setActionLoading(true);

      const result = await ordersApi.pickupOrder(orderId);

      if (result.success) {
        router.refresh();
        toastSuccess('Order picked up successfully');
        // Refresh order data
        const refreshResult = await ordersApi.getOrder(orderId);
        if (refreshResult.success && refreshResult.data) {
          const orderData = refreshResult.data as any;
          setOrder({
            ...orderData,
            itemCount: orderData.orderItems?.length || 0,
            paymentCount: orderData.payments?.length || 0,
            totalPaid: orderData.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
          } as OrderWithDetails);
        }
      } else {
        toastError(result.error || 'Failed to pickup order');
      }
    } catch (err) {
      console.error('Error picking up order:', err);
      toastError('An error occurred while picking up order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnOrder = async (orderId: number, data: any) => {
    if (!order) return;

    try {
      setActionLoading(true);

      const result = await ordersApi.returnOrder(orderId);

      if (result.success) {
        router.refresh();
        toastSuccess('Order returned successfully');
        // Refresh order data
        const refreshResult = await ordersApi.getOrder(orderId);
        if (refreshResult.success && refreshResult.data) {
          const orderData = refreshResult.data as any;
          setOrder({
            ...orderData,
            itemCount: orderData.orderItems?.length || 0,
            paymentCount: orderData.payments?.length || 0,
            totalPaid: orderData.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
          } as OrderWithDetails);
        }
      } else {
        toastError(result.error || 'Failed to return order');
      }
    } catch (err) {
      console.error('Error returning order:', err);
      toastError('An error occurred while returning order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (settings: {
    damageFee: number;
    securityDeposit: number;
    collateralType: string;
    collateralDetails: string;
    notes: string;
  }) => {
    if (!order) {
      toastError('No order available');
      return;
    }

    try {
      setActionLoading(true);

      const result = await ordersApi.updateOrderSettings(order.id, settings);

      if (result.success) {
        router.refresh();
        toastSuccess('Order settings saved successfully');
        // Refresh order data
        const refreshResult = await ordersApi.getOrder(order.id);
        if (refreshResult.success && refreshResult.data) {
          const orderData = refreshResult.data as any;
          setOrder({
            ...orderData,
            itemCount: orderData.orderItems?.length || 0,
            paymentCount: orderData.payments?.length || 0,
            totalPaid: orderData.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
          } as OrderWithDetails);
        }
      } else {
        toastError(result.error || 'Failed to save order settings');
      }
    } catch (err) {
      console.error('Error saving order settings:', err);
      toastError('An error occurred while saving order settings');
    } finally {
      setActionLoading(false);
    }
  };

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Orders', href: '/orders' },
    { label: order ? `Order ${order.orderNumber}` : orderId }
  ];

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
        </PageHeader>
        <PageContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Order Not Found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={handleBackToOrders} variant="outline">
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
          <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <p className="text-gray-500">No order data available</p>
            <Button onClick={handleBackToOrders} variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBackToOrders}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleEditOrder}
            >
              Edit Order
            </Button>
          </div>
        </div>
      </PageHeader>
      <PageContent>
        <OrderDetail
          order={order}
          onStatusChange={handleStatusChange}
          onCancel={handleCancelOrder}
          onPickup={handlePickupOrder}
          onReturn={handleReturnOrder}
          onSaveSettings={handleSaveSettings}
          loading={actionLoading}
        />
      </PageContent>
    </PageWrapper>
  );
}

