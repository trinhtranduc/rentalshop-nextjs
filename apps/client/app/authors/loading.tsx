import { PageWrapper, PageHeader, PageTitle } from '@rentalshop/ui';

/**
 * Next.js App Router Loading UI for Authors
 * Shows instantly during navigation to /authors
 */
export default function Loading() {
  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Quản lý tác giả</PageTitle>
        <p className="text-sm text-gray-600">Đang tải danh sách tác giả...</p>
      </PageHeader>
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    </PageWrapper>
  );
}
