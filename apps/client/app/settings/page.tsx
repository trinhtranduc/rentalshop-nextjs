'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

import React from 'react';
import { Settings, PageWrapper, Breadcrumb } from '@rentalshop/ui';

// ============================================================================
// CLIENT SETTINGS PAGE
// ============================================================================

export default function SettingsPage() {
  return (
    <PageWrapper>
      <Settings />
    </PageWrapper>
  );
}
