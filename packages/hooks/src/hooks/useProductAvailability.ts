'use client';

import { useCallback } from 'react';
import type { Product } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

// Product interface is now imported from @rentalshop/types

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
// VIETNAM CIVIL DAYS (kept local, free of the @rentalshop/utils barrel, so unit tests stay light)
// ============================================================================

const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // Vietnam: UTC+7, no DST
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Vietnam day key of a `YYYY-MM-DD` key (kept as written) or an ISO instant; '' when invalid. */
function vnDayKey(value: string | Date | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string' && DATE_KEY.test(value.trim())) return value.trim();
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  if (Number.isNaN(ms)) return '';
  return new Date(Math.floor((ms + VN_OFFSET_MS) / DAY_MS) * DAY_MS).toISOString().slice(0, 10);
}

function nextDayKey(key: string): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

// ============================================================================
// PURE CALCULATION (Vietnam civil days, #578 PKG-8)
// ============================================================================

/**
 * Availability of `product` for the Vietnam days `pickupDate`..`returnDate` (keys or ISO instants).
 * An existing rental conflicts when it shares at least one Vietnam civil day with the request, inclusive on both
 * ends: a same-day pickup and return still occupies that day. Comparing raw instants missed same-day rentals.
 */
export function calculateProductAvailability(
  product: Product,
  pickupDate: string,
  returnDate: string,
  requestedQuantity: number,
  existingOrders: Order[] = []
): AvailabilityStatus {
  const pickupKey = vnDayKey(pickupDate);
  const returnKey = vnDayKey(returnDate);

  // Validate dates - allow same day rental (pickup <= return)
  if (!pickupKey || !returnKey || pickupKey > returnKey) {
    return {
      available: false,
      availableQuantity: 0,
      conflicts: [],
      message: 'Return date cannot be before pickup date'
    };
  }

  // Find conflicting orders for this product
  const conflicts = existingOrders.filter(order => {
    // Only check RENT orders
    if (order.orderType !== 'RENT') return false;

    // Check if order is active (not completed/cancelled)
    const activeStatuses = ['RESERVED', 'PICKUPED'];
    if (!activeStatuses.includes(order.status)) return false;

    // Check if order items contain this product
    const hasProduct = order.orderItems.some(item => item.productId === product.id);
    if (!hasProduct) return false;

    // Same Vietnam day on both sides counts (inclusive)
    const orderPickupKey = vnDayKey(order.pickupPlanAt);
    const orderReturnKey = vnDayKey(order.returnPlanAt);
    if (!orderPickupKey || !orderReturnKey) return false;
    return pickupKey <= orderReturnKey && orderPickupKey <= returnKey;
  });

  // Calculate total quantity needed during the requested period
  const conflictingQuantity = conflicts.reduce((total, order) => {
    const orderItem = order.orderItems.find(item => item.productId === product.id);
    return total + (orderItem?.quantity || 0);
  }, 0);

  // Calculate available quantity
  const availableQuantity = Math.max(0, product.available - conflictingQuantity);
  const available = availableQuantity >= requestedQuantity;

  const message = available
    ? `Available: ${availableQuantity} units`
    : `Only ${availableQuantity} units available (requested: ${requestedQuantity})`;

  return {
    available,
    availableQuantity,
    conflicts,
    message,
  };
}

/** Availability for each Vietnam day from `startDate` to `endDate` (inclusive). */
export function availabilityForDateRange(
  product: Product,
  startDate: string,
  endDate: string,
  existingOrders: Order[] = []
): Array<{ date: string; available: number; conflicts: Order[] }> {
  const startKey = vnDayKey(startDate);
  const endKey = vnDayKey(endDate);
  const results: Array<{ date: string; available: number; conflicts: Order[] }> = [];
  if (!startKey || !endKey) return results;

  for (let dateKey = startKey; dateKey <= endKey; dateKey = nextDayKey(dateKey)) {
    const status = calculateProductAvailability(product, dateKey, dateKey, 1, existingOrders);
    results.push({
      date: dateKey,
      available: status.availableQuantity,
      conflicts: status.conflicts,
    });
  }

  return results;
}

// ============================================================================
// USE PRODUCT AVAILABILITY HOOK
// ============================================================================

export function useProductAvailability() {
  const calculateAvailability = useCallback(calculateProductAvailability, []);

  const isProductAvailable = useCallback((
    product: Product,
    pickupDate: string,
    returnDate: string,
    requestedQuantity: number,
    existingOrders: Order[] = []
  ): boolean => {
    return calculateProductAvailability(product, pickupDate, returnDate, requestedQuantity, existingOrders).available;
  }, []);

  const getAvailabilityForDateRange = useCallback(availabilityForDateRange, []);

  return {
    calculateAvailability,
    isProductAvailable,
    getAvailabilityForDateRange,
  };
}
