'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendars } from '@rentalshop/ui';
import { useAuth, useSimpleErrorHandler } from '@rentalshop/hooks';
import { ordersApi } from "@rentalshop/utils";
import type { PickupOrder } from '@rentalshop/ui';

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const authenticated = !!user;
  const { handleError } = useSimpleErrorHandler();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickupOrders, setPickupOrders] = useState<PickupOrder[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch pickup orders for the current month
  const fetchPickupOrders = useCallback(async () => {
    if (!authenticated) {
      // Don't show error for unauthenticated users - just show empty calendar
      setPickupOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Calculate start and end of month
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      
      console.log('📅 Fetching orders for month:', { currentMonth, currentYear });
      console.log('📅 Date range:', { startOfMonth, endOfMonth });
      
      const result = await ordersApi.searchOrders({
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString(),
        orderType: 'RENT',
        status: ['RESERVED', 'PICKUPED'],
        limit: 100
      });
      
      if (result.success) {
        const orders = result.data?.orders || [];
        // Map Order[] to PickupOrder[]
        const pickupOrders = orders.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber || '',
          customerName: order.customer?.firstName ? `${order.customer.firstName} ${order.customer.lastName || ''}`.trim() : 'Unknown Customer',
          productName: order.orderItems?.[0]?.product?.name || 'Unknown Product',
          pickupDate: order.pickupPlanAt || order.createdAt,
          returnDate: order.returnPlanAt || order.pickupPlanAt,
          status: order.status,
          notes: order.notes || ''
        }));
        setPickupOrders(pickupOrders);
        
        if (orders.length === 0) {
          // Only show error for authenticated users with no data
          if (authenticated) {
            setError('No pickup orders found for this month. This could mean:\n• No orders have been created yet\n• All orders are for different months\n• The API is not returning data properly');
          }
        } else {
          console.log(`✅ Successfully fetched ${orders.length} orders for ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
        }
      } else {
        const errorMessage = result.error || 'Failed to fetch orders';
        setError(errorMessage);
        handleError(new Error(errorMessage));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to fetch pickup orders. Please try again.');
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, authenticated]);

  // Fetch orders when month changes or authentication changes
  useEffect(() => {
    if (authenticated) {
      fetchPickupOrders();
    } else {
      // When not authenticated, show empty calendar with demo data
      setPickupOrders([]);
      setError(null);
      setLoading(false);
    }
  }, [authenticated, fetchPickupOrders]);

  // Handle retry with better error handling
  const handleRetry = useCallback(() => {
    setError(null);
    fetchPickupOrders();
  }, [fetchPickupOrders]);
  return (
    <div className="space-y-8">
      {/* Calendar Component - Always Visible */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <Calendars
          orders={pickupOrders}
          loading={loading}
          error={authenticated ? error : null} // Only show errors for authenticated users
          authenticated={authenticated}
          onDateSelect={(date) => {
            console.log('Date selected:', date);
          }}
          onOrderClick={(order) => {
            if (authenticated) {
              console.log('Order clicked:', order);
            } else {
              console.log('Please log in to view order details');
            }
          }}
          onRetry={authenticated ? handleRetry : undefined} // Only show retry for authenticated users
        />
      </div>
    </div>
  );
}
