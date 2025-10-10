// ============================================================================
// PLANS PREVIEW PAGE - STANDALONE PREVIEW
// ============================================================================

'use client';

import React from 'react';
import { SubscriptionPreviewPage } from '@rentalshop/ui';

export default function PlansPreviewPage() {
  const handlePlanSelect = (plan: any, duration: number) => {
    console.log('Plan selected:', plan, 'Duration:', duration);
    // Here you could redirect to a subscription creation page
    // or show a modal with plan details
  };

  return (
    <SubscriptionPreviewPage
      onSelectPlan={handlePlanSelect}
      showSelectButton={true}
    />
  );
}
