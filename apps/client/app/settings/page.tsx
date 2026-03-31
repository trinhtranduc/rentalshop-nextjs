'use client';

import React from 'react';
import { Settings, PageWrapper } from '@rentalshop/ui';
import { SettingsSubscriptionMerchantActions } from '../components/SettingsSubscriptionMerchantActions';

// ============================================================================
// CLIENT SETTINGS PAGE
// ============================================================================

export default function SettingsPage() {
  return (
    <PageWrapper>
      <Settings
        renderSubscriptionPanel={(props) => (
          <SettingsSubscriptionMerchantActions {...props} />
        )}
      />
    </PageWrapper>
  );
}
