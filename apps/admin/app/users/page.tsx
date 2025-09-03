'use client';

import React from 'react';
import { Users } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import type { User } from '@rentalshop/types';

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  return (
    <Users
      title="User Management"
      subtitle="Manage all users across the platform"
      showExportButton={true}
      showAddButton={true}
      addButtonText="Add User"
      exportButtonText="Export Users"
      showStats={true}
      useSearchUsers={true}
      initialLimit={10}
      currentUser={currentUser}
    />
  );
}
