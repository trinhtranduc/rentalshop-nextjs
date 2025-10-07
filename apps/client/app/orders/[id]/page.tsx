'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, OrderDetail, useToast } from '@rentalshop/ui';

import { ArrowLeft } from 'lucide-react';
import { ordersApi } from '@rentalshop/utils';

import type { Order } from '@rentalshop/types';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const orderId = params.id as string;
  
  // Extract numeric part from order ID (e.g., "2110" from "ORD-2110")
  const numericOrderId = orderId.replace(/^ORD-/, '');

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await ordersApi.getOrderByNumber(`ORD-${numericOrderId}`);

        if (result.success && result.data) {
          setOrder(result.data);
        } else {
          setError(result.error || 'Failed to fetch order details');
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

  const handleEditOrder = () => {
    // Navigate to edit page or open edit dialog
    router.push(`/orders/${numericOrderId}/edit`);
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);

      const result = await ordersApi.cancelOrder(order.id);

      if (result.success) {
        // Refresh the order data
        router.refresh();
        toastSuccess('Order Cancelled', 'Order has been cancelled successfully');
      } else {
        throw new Error(result.error || 'Failed to cancel order');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      toastError('Cancellation Failed', 'Failed to cancel order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order || !newStatus) return;

    try {
      setActionLoading(true);

      const result = await ordersApi.updateOrderStatus(order.id, newStatus);

      if (result.success) {
        // Refresh the order data
        router.refresh();
        toastSuccess('Status Updated', `Order status has been updated to ${newStatus}`);
      } else {
        throw new Error(result.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      toastError('Status Update Failed', 'Failed to update order status: ' + (err instanceof Error ? err.message : 'Unknown error'));
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

      if (result.success) {
        // Refresh the order data
        router.refresh();
        toastSuccess('Order Pickup', 'Order has been picked up successfully!');
      } else {
        throw new Error(result.error || 'Failed to pickup order');
      }
    } catch (err) {
      console.error('Error picking up order:', err);
      toastError('Pickup Failed', 'Failed to pickup order: ' + (err instanceof Error ? err.message : 'Unknown error'));
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

      if (result.success) {
        // Refresh the order data
        router.refresh();
        toastSuccess('Order Return', 'Order has been returned successfully!');
      } else {
        throw new Error(result.error || 'Failed to return order');
      }
    } catch (err) {
      console.error('Error returning order:', err);
      toastError('Return Failed', 'Failed to return order: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
      toastError('Save Failed', 'Order not found');
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

      if (result.success) {
        // Refresh the order data
        router.refresh();
        toastSuccess('Settings Saved', 'Order settings saved successfully!');
      } else {
        throw new Error(result.error || 'Failed to save order settings');
      }
    } catch (err) {
      console.error('Error saving order settings:', err);
      toastError('Save Failed', 'Failed to save order settings: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Wrapper functions to match OrderDetail component interface
  const handlePickupWrapper = (orderId: string) => {
    handlePickupOrder(orderId, {
      order_status: 'PICKUPED',
      bail_amount: 0,
      material: '',
      notes: ''
    });
  };

  const handleReturnWrapper = (orderId: string) => {
    handleReturnOrder(orderId, {
      order_status: 'RETURNED',
      notes: '',
      damage_fee: 0
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Back Button Skeleton */}
          <div className="mb-6">
            <div className="w-32 h-10 bg-gray-200 rounded-md animate-pulse"></div>
          </div>
          
          {/* Order Detail Skeleton */}
          <OrderDetail
            order={{} as Order}
            loading={true}
            showActions={false}
          />
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mb-4 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>

        {/* Order Detail Component */}
        <OrderDetail
          order={order}
          onEdit={handleEditOrder}
          onCancel={handleCancelOrder}
          onStatusChange={handleStatusChange}
          onPickup={handlePickupWrapper}
          onReturn={handleReturnWrapper}
          onSaveSettings={handleSaveSettings}
          loading={actionLoading}
          showActions={true}
        />
      </div>
    </div>
  );
}
