import { PageWrapper, PageHeader, PageTitle, CustomersLoading } from '@rentalshop/ui';

/**
 * Next.js App Router Loading UI
 * 
 * This file is automatically shown by Next.js during:
 * 1. Initial page load
 * 2. Client-side navigation
 * 3. Route transitions
 * 
 * Shows INSTANTLY (0ms) when navigating to /customers
 */
export default function Loading() {
  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <PageTitle>Customers</PageTitle>
        <p className="text-sm text-gray-600">Manage customers in the system</p>
      </PageHeader>
      <div className="flex-1 min-h-0 overflow-auto">
        <CustomersLoading />
      </div>
    </PageWrapper>
  );
}

