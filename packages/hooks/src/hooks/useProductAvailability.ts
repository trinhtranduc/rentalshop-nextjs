'use client';

import { useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Product {
  id: number;
  name: string;
  stock: number;
  renting: number;
  available: number;
}

export interface Order {
  id: number;
  orderType: string;
  status: string;
  pickupPlanAt: string;
  returnPlanAt: string;
  orderItems: Array<{
    productId: number;
    quantity: number;
    name: string;
  }>;
}

export interface AvailabilityStatus {
  available: boolean;
  availableQuantity: number;
  conflicts: Order[];
  message: string;
}

// ============================================================================
// USE PRODUCT AVAILABILITY HOOK
// ============================================================================

export function useProductAvailability() {
  // ============================================================================
  // AVAILABILITY CALCULATION
  // ============================================================================

  const calculateAvailability = useCallback((
    product: Product,
    pickupDate: string,
    returnDate: string,
    requestedQuantity: number,
    existingOrders: Order[] = []
  ): AvailabilityStatus => {
    // Convert dates to Date objects
    const pickup = new Date(pickupDate);
    const return_ = new Date(returnDate);
    
    // Validate dates
    if (pickup >= return_) {
      return {
        available: false,
        availableQuantity: 0,
        conflicts: [],
        message: 'Return date must be after pickup date'
      };
    }

    // Find conflicting orders for this product
    const conflicts = existingOrders.filter(order => {
      // Only check RENT orders
      if (order.orderType !== 'RENT') return false;
      
      // Check if order is active (not completed/cancelled)
      const activeStatuses = ['PENDING', 'BOOKED', 'PICKUP', 'ACTIVE'];
      if (!activeStatuses.includes(order.status)) return false;
      
      // Check if order items contain this product
      const hasProduct = order.orderItems.some(item => item.productId === product.id);
      if (!hasProduct) return false;
      
      // Check date overlap
      const orderPickup = new Date(order.pickupPlanAt);
      const orderReturn = new Date(order.returnPlanAt);
      
      // Check if dates overlap
      return (
        (pickup <= orderReturn && return_ >= orderPickup) ||
        (orderPickup <= return_ && orderReturn >= pickup)
      );
    });

    // Calculate total quantity needed during the requested period
    const conflictingQuantity = conflicts.reduce((total, order) => {
      const orderItem = order.orderItems.find(item => item.productId === product.id);
      return total + (orderItem?.quantity || 0);
    }, 0);

    // Calculate available quantity
    const availableQuantity = Math.max(0, product.available - conflictingQuantity);
    const available = availableQuantity >= requestedQuantity;

    // Generate message
    let message = '';
    if (available) {
      message = `Available: ${availableQuantity} units`;
    } else {
      message = `Only ${availableQuantity} units available (requested: ${requestedQuantity})`;
    }

    return {
      available,
      availableQuantity,
      conflicts,
      message,
    };
  }, []);

  // ============================================================================
  // QUICK AVAILABILITY CHECK
  // ============================================================================

  const isProductAvailable = useCallback((
    product: Product,
    pickupDate: string,
    returnDate: string,
    requestedQuantity: number,
    existingOrders: Order[] = []
  ): boolean => {
    const status = calculateAvailability(product, pickupDate, returnDate, requestedQuantity, existingOrders);
    return status.available;
  }, [calculateAvailability]);

  // ============================================================================
  // AVAILABILITY FOR DATE RANGE
  // ============================================================================

  const getAvailabilityForDateRange = useCallback((
    product: Product,
    startDate: string,
    endDate: string,
    existingOrders: Order[] = []
  ): Array<{ date: string; available: number; conflicts: Order[] }> => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results = [];
    
    // Check availability for each day in the range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const status = calculateAvailability(
        product, 
        dateStr, 
        dateStr, 
        1, 
        existingOrders
      );
      
      results.push({
        date: dateStr,
        available: status.availableQuantity,
        conflicts: status.conflicts,
      });
    }
    
    return results;
  }, [calculateAvailability]);

  // ============================================================================
  // RETURN VALUES
  // ============================================================================

  return {
    calculateAvailability,
    isProductAvailable,
    getAvailabilityForDateRange,
  };
}
