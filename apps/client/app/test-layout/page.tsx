'use client';

/**
 * Test Layout Page - Simple test page to verify equal height columns
 * 
 * Path: /test-layout
 */

import React from 'react';
import { TestEqualHeightColumns } from '@rentalshop/ui';

export default function TestLayoutPage() {
  return (
    <div className="min-h-screen bg-bg-secondary">
      <TestEqualHeightColumns />
    </div>
  );
}

