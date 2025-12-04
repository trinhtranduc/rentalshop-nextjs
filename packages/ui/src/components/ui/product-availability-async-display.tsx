'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { ProductWithStock } from '@rentalshop/types';

interface AvailabilityStatus {
  status: string;
  text: string;
  color: string;
  // Stock information for detailed display
  totalStock?: number;
  totalAvailableStock?: number;
  totalRenting?: number;
  effectivelyAvailable?: number;
}

interface ProductAvailabilityAsyncDisplayProps {
  product: ProductWithStock | undefined;
  pickupDate?: string;
  returnDate?: string;
  requestedQuantity: number;
  getProductAvailabilityStatus: (
    product: ProductWithStock, 
    startDate?: string, 
    endDate?: string, 
    requestedQuantity?: number
  ) => Promise<AvailabilityStatus>;
}

export const ProductAvailabilityAsyncDisplay: React.FC<ProductAvailabilityAsyncDisplayProps> = ({
  product,
  pickupDate,
  returnDate,
  requestedQuantity,
  getProductAvailabilityStatus
}) => {
  const [availability, setAvailability] = useState<AvailabilityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product || !pickupDate || !returnDate) {
      setAvailability(null);
      return;
    }

    const checkAvailability = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const status = await getProductAvailabilityStatus(
          product, 
          pickupDate, 
          returnDate, 
          requestedQuantity
        );
        setAvailability(status);
      } catch (err) {
        setError('Failed to check availability');
        console.error('Availability check error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the availability check
    const timeoutId = setTimeout(checkAvailability, 300);
    return () => clearTimeout(timeoutId);
  }, [product, pickupDate, returnDate, requestedQuantity, getProductAvailabilityStatus]);

  if (!product) return null;

  if (isLoading) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <Loader2 className="w-3 h-3 animate-spin mr-1" />
        Checking...
      </div>
    );
  }

  if (error) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
        ⚠️ Error checking availability
      </div>
    );
  }

  if (!availability) {
    return null;
  }

  // Show detailed stock information when available (single line)
  const showStockInfo = availability.totalStock !== undefined;
  const effectivelyAvailable = availability.effectivelyAvailable ?? availability.totalAvailableStock ?? 0;

  // Get status icon
  const statusIcon = availability.status === 'date-conflict' ? '⚠️' :
                     availability.status === 'out-of-stock' ? '🚫' :
                     availability.status === 'unavailable' ? '⚠️' :
                     availability.status === 'available' ? '✅' : '';

  return (
    <div className="text-sm flex items-center gap-2 flex-wrap">
      {/* Stock Information and Badge on same line */}
      {showStockInfo ? (
        <>
          <span className="text-gray-600"><span className="font-semibold">Kho:</span> {availability.totalStock}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">
            <span className="font-semibold">Có sẵn:</span>{' '}
            <span className={effectivelyAvailable > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {effectivelyAvailable}
            </span>
            {effectivelyAvailable === 0 && <span className="text-red-600 font-semibold"> (Hết)</span>}
          </span>
          <span className="text-gray-400">|</span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full font-semibold text-sm ${availability.color}`}>
            {availability.text}
            {statusIcon && <span className="ml-1">{statusIcon}</span>}
          </span>
        </>
      ) : (
        <span className={`inline-flex items-center px-2 py-1 rounded-full font-semibold text-sm ${availability.color}`}>
          {availability.text}
          {statusIcon && <span className="ml-1">{statusIcon}</span>}
        </span>
      )}
    </div>
  );
};
