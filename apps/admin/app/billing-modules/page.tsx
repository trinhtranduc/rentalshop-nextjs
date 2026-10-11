'use client';

import React from 'react';
import { PageWrapper, PageHeader, PageTitle, PageContent, BillingModulesCatalog } from '@rentalshop/ui';

export default function BillingModulesPage() {
  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Module</PageTitle>
      </PageHeader>
      <PageContent>
        <BillingModulesCatalog />
      </PageContent>
    </PageWrapper>
  );
}
