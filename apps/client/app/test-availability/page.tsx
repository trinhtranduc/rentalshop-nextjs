'use client';

import React from 'react';
import { ProductAvailabilityTest } from '@rentalshop/ui';

export default function TestAvailabilityPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Product Availability Test
          </h1>
          <p className="text-gray-600">
            Test the advanced product availability logic with rental date conflicts
          </p>
        </div>
        
        <ProductAvailabilityTest />
      </div>
    </div>
  );
}
