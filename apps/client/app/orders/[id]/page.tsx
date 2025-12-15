'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Breadcrumb, OrderDetail, PageWrapper, useToast, ReceiptPreviewModal, LoadingIndicator } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { orderBreadcrumbs } from '@rentalshop/utils';

import { ArrowLeft } from 'lucide-react';
import { ordersApi } from '@rentalshop/utils';
import { useAuth, useOrderTranslations, useCommonTranslations } from '@rentalshop/hooks';

import type { Order } from '@rentalshop/types';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toastSuccess } = useToast();
  const { user } = useAuth();
  const t = useOrderTranslations();
  const tc = useCommonTranslations();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Receipt preview state
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [outlet, setOutlet] = useState<any>(null);

  const orderId = params.id as string;
  
  // Extract numeric part from order ID (e.g., "2110" from "ORD-2110")
  const numericOrderId = orderId;//.replace(/^ORD-/, '');

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await ordersApi.getOrderByNumber(`${numericOrderId}`);

        if (result.success && result.data) {
          const orderData = result.data;
          setOrder(orderData);
          
          // Use outlet data from order response (already included in API response)
          // No need to fetch separately - order API already includes outlet data
          if (orderData.outlet) {
            setOutlet(orderData.outlet);
          }
        } else {
          setError(result.error || tc('messages.errorLoadingData'));
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError(tc('messages.errorLoadingData'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const handleEditOrder = () => {
    // Navigate to edit page or open edit dialog
    router.push(`/orders/${numericOrderId}/edit`);
  };

  const handleCancelOrder = async (orderToCancel: Order) => {
    if (!orderToCancel) return;

    // ✅ No need for confirm() - OrderDetail component already has ConfirmationDialog
    try {
      setActionLoading(true);

      const result = await ordersApi.cancelOrder(orderToCancel.id);

      if (result.success && result.data) {
        // Update order state directly from API response (better UX - no need to refetch)
        setOrder(result.data);
        toastSuccess(tc('messages.updateSuccess'), t('messages.updateSuccess'));
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (err) {
      console.error('Error cancelling order:', err);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrder = async (orderToDelete: Order) => {
    if (!orderToDelete) return;

    try {
      setActionLoading(true);

      const result = await ordersApi.deleteOrder(orderToDelete.id);

      if (result.success) {
        toastSuccess(tc('messages.deleteSuccess') || 'Order deleted successfully', t('messages.deleteSuccess') || 'Order deleted successfully');
        // Navigate back to orders list after successful deletion
        router.push('/orders');
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (err) {
      console.error('Error deleting order:', err);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order || !newStatus) return;

    try {
      setActionLoading(true);

      const result = await ordersApi.updateOrderStatus(order.id, newStatus);

      if (result.success && result.data) {
        // Update order state directly from API response (better UX - no need to refetch)
        setOrder(result.data);
        toastSuccess(tc('messages.updateSuccess'), t('messages.updateSuccess'));
      } else {
        throw new Error(result.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickupOrder = async (orderId: string, data: {
    order_status: string;
    bail_amount: number;
    material: string;
    notes: string;
  }) => {
    try {
      setActionLoading(true);

      const result = await ordersApi.pickupOrder(parseInt(orderId));

      if (result.success && result.data) {
        // Update order state directly from API response (better UX - no need to refetch)
        setOrder(result.data);
        toastSuccess(tc('messages.updateSuccess'), t('messages.updateSuccess'));
      } else {
        throw new Error(result.error || 'Failed to pickup order');
      }
    } catch (err) {
      console.error('Error picking up order:', err);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnOrder = async (orderId: string, data: {
    order_status: string;
    notes: string;
    damage_fee: number;
  }) => {
    try {
      setActionLoading(true);

      const result = await ordersApi.returnOrder(parseInt(orderId));

      if (result.success && result.data) {
        // Update order state directly from API response (better UX - no need to refetch)
        setOrder(result.data);
        toastSuccess(tc('messages.updateSuccess'), t('messages.updateSuccess'));
      } else {
        throw new Error(result.error || 'Failed to return order');
      }
    } catch (err) {
      console.error('Error returning order:', err);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (data: {
    damageFee: number;
    securityDeposit: number;
    collateralType: string;
    collateralDetails: string;
    notes: string;
  }) => {
    if (!order) {
      // Error automatically handled by useGlobalErrorHandler
      return;
    }

    try {
      setActionLoading(true);

      // Only send the fields that need to be updated
      const updateData = {
        damageFee: data.damageFee,
        securityDeposit: data.securityDeposit,
        collateralType: data.collateralType,
        collateralDetails: data.collateralDetails,
        notes: data.notes
      };

      const result = await ordersApi.updateOrderSettings(order.id, updateData);

      console.log('🔍 OrderDetailPage: Update settings result:', {
        success: result.success,
        hasData: !!result.data,
        orderItems: result.data?.orderItems,
        firstItem: result.data?.orderItems?.[0],
        firstItemProduct: result.data?.orderItems?.[0]?.product,
        firstItemProductName: (result.data?.orderItems?.[0] as any)?.productName
      });

      if (result.success && result.data) {
        // Update order state directly from API response (better UX - no need to refetch)
        setOrder(result.data);
        // Single toast notification - success only
        toastSuccess(t('detail.settingsSaved'), t('detail.settingsSavedMessage'));
      } else {
        throw new Error(result.error || 'Failed to save order settings');
      }
    } catch (err) {
      console.error('Error saving order settings:', err);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setActionLoading(false);
    }
  };

  // Wrapper functions to match OrderDetail component interface
  // OrderDetail expects: onPickup?: (orderId: number, data: any) => void
  const handlePickupWrapper = async (orderId: number, data: any) => {
    await handlePickupOrder(orderId.toString(), data);
  };

  // OrderDetail expects: onReturn?: (orderId: number, data: any) => void
  const handleReturnWrapper = async (orderId: number, data: any) => {
    await handleReturnOrder(orderId.toString(), data);
  };

  // Show loading state while fetching order data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator 
          variant="circular" 
          size="lg"
          message={tc('labels.loading') || 'Loading order...'}
        />
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Order</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={() => router.back()} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button variant="outline" onClick={() => router.push('/orders')} className="w-full">
                View All Orders
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show "Order Not Found" only after loading is complete and order is still null
  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">The order you're looking for could not be found.</p>
            <div className="space-y-3">
              <Button onClick={() => router.back()} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button variant="outline" onClick={() => router.push('/orders')} className="w-full">
                View All Orders
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Breadcrumb items - temporary fix
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Orders', href: '/orders' },
    { label: order.orderNumber }
  ];

  return (
    <PageWrapper>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} showHome={false} className="mb-6" />

      {/* Order Detail Component */}
      <OrderDetail
        order={order}
        onEdit={handleEditOrder}
        onCancel={handleCancelOrder}
        onDelete={handleDeleteOrder}
        onStatusChange={handleStatusChange}
        onPickup={handlePickupWrapper}
        onReturn={handleReturnWrapper}
        onSaveSettings={handleSaveSettings}
        onPrint={() => setShowReceiptPreview(true)}
        loading={actionLoading}
        showActions={true}
      />

      {/* Receipt Preview Modal */}
      <ReceiptPreviewModal
        isOpen={showReceiptPreview}
        onClose={() => setShowReceiptPreview(false)}
        order={order}
        outlet={outlet}
        merchant={user?.merchant || null}
      />
    </PageWrapper>
  );
}
