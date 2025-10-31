import { PageWrapper, PageHeader, PageTitle, OrdersLoading } from '@rentalshop/ui';

/**
 * Next.js App Router Loading UI for Orders
 * Shows instantly during navigation to /orders
 */
export default function Loading() {
  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <PageTitle>Orders</PageTitle>
        <p className="text-sm text-gray-600">Manage orders and transactions</p>
      </PageHeader>
      <div className="flex-1 min-h-0 overflow-auto">
        <OrdersLoading />
      </div>
    </PageWrapper>
  );
}

