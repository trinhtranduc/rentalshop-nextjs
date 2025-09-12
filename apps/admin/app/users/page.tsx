'use client';

import React, { useMemo } from 'react';
import { Users } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { PAGINATION } from '@rentalshop/constants';
import type { User } from '@rentalshop/types';

export default function UsersPage() {
  console.log('🔄 UsersPage component re-rendered');
  const { user: currentUser } = useAuth();
  console.log('🔄 currentUser from useAuth:', currentUser);

  // Memoize the currentUser to prevent unnecessary re-renders
  const memoizedCurrentUser = useMemo(() => {
    console.log('🔄 memoizedCurrentUser recalculated');
    return currentUser;
  }, [currentUser?.id, currentUser?.email]);

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
      initialLimit={PAGINATION.DEFAULT_PAGE_SIZE}
      currentUser={memoizedCurrentUser}
    />
  );
}
