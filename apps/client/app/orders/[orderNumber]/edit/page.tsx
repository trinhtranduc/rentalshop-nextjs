'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = params.orderNumber as string;

  useEffect(() => {
    if (!orderNumber) return;

    // Extract numeric part from order number (e.g., "2110" from "ORD-2110")
    const numericOrderNumber = orderNumber.replace(/^ORD-/, '');
    
    // For now, redirect to the main order detail page
    // TODO: Implement edit functionality
    router.push(`/orders/${numericOrderNumber}`);
  }, [orderNumber, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to order details...</p>
      </div>
    </div>
  );
}
