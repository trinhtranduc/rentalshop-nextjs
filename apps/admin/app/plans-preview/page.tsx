// ============================================================================
// PLANS PREVIEW PAGE - STANDALONE PREVIEW
// ============================================================================

'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

// Disable prerendering to avoid module resolution issues

import React from 'react';
import { SubscriptionPreviewPage, PageWrapper, Breadcrumb } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';

export default function PlansPreviewPage() {
  const handlePlanSelect = (plan: any, duration: number) => {
    console.log('Plan selected:', plan, 'Duration:', duration);
    // Here you could redirect to a subscription creation page
    // or show a modal with plan details
  };

  return (
    <PageWrapper>
      <SubscriptionPreviewPage
        onSelectPlan={handlePlanSelect}
        showSelectButton={true}
      />
    </PageWrapper>
  );
}
