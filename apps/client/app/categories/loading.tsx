import { PageWrapper, PageHeader, PageTitle, CategoriesLoading } from '@rentalshop/ui';

/**
 * Next.js App Router Loading UI for Categories
 * Shows instantly during navigation to /categories
 */
export default function Loading() {
  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <PageTitle>Categories</PageTitle>
        <p className="text-sm text-gray-600">Manage your product categories</p>
      </PageHeader>
      <div className="flex-1 min-h-0 overflow-auto">
        <CategoriesLoading />
      </div>
    </PageWrapper>
  );
}

