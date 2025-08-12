import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { ProductSearchResult } from '@rentalshop/database';

interface AvailabilityStatus {
  status: string;
  text: string;
  color: string;
}

interface ProductAvailabilityAsyncDisplayProps {
  product: ProductSearchResult | undefined;
  pickupDate?: string;
  returnDate?: string;
  requestedQuantity: number;
  getProductAvailabilityStatus: (
    product: ProductSearchResult, 
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

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${availability.color}`}>
      {availability.text}
      {availability.status === 'date-conflict' && (
        <span className="ml-1">⚠️</span>
      )}
      {availability.status === 'out-of-stock' && (
        <span className="ml-1">🚫</span>
      )}
      {availability.status === 'unavailable' && (
        <span className="ml-1">⚠️</span>
      )}
      {availability.status === 'available' && (
        <span className="ml-1">✅</span>
      )}
    </div>
  );
};
