import { PageWrapper, PageHeader, PageTitle, UsersLoading } from '@rentalshop/ui';

/**
 * Next.js App Router Loading UI for Users
 * Shows instantly during navigation to /users
 */
export default function Loading() {
  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <PageTitle>Users</PageTitle>
        <p className="text-sm text-gray-600">Manage users in the system</p>
      </PageHeader>
      <div className="flex-1 min-h-0 overflow-auto">
        <UsersLoading />
      </div>
    </PageWrapper>
  );
}

