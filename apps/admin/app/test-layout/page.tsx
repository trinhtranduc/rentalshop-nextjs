'use client';

/**
 * Test Layout Page - Simple test page to verify equal height columns
 */

import React from 'react';
import { TestEqualHeightColumns } from '@rentalshop/ui';
import { PageWrapper } from '@rentalshop/ui';

export default function TestLayoutPage() {
  return (
    <PageWrapper>
      <TestEqualHeightColumns />
    </PageWrapper>
  );
}

