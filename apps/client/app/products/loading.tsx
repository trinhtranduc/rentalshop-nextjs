import { PageWrapper, PageHeader, PageTitle, ProductsLoading } from '@rentalshop/ui';

/**
 * Next.js App Router Loading UI for Products
 * Shows instantly during navigation to /products
 */
export default function Loading() {
  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <PageTitle>Products</PageTitle>
        <p className="text-sm text-gray-600">Manage your product catalog</p>
      </PageHeader>
      <div className="flex-1 min-h-0 overflow-auto">
        <ProductsLoading />
      </div>
    </PageWrapper>
  );
}

