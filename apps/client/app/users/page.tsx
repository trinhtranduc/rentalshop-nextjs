'use client';

import React from 'react';
import { Users } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { PAGINATION } from '@rentalshop/constants';
import type { User } from '@rentalshop/types';

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  return (
    <Users
      title="Users"
      subtitle="Manage users in the system"
      showExportButton={true}
      showAddButton={true}
      addButtonText="Add User"
      exportButtonText="Export"
      showStats={false}
      useSearchUsers={false}
      initialLimit={PAGINATION.DEFAULT_PAGE_SIZE}
      currentUser={currentUser}
    />
  );
}
