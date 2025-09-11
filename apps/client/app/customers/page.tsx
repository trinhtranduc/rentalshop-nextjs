'use client';

import React from 'react';
import { Customers } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { PAGINATION } from '@rentalshop/constants';
import type { Customer } from '@rentalshop/types';

export default function CustomersPage() {
  const { user: currentUser } = useAuth();

  // Client page configuration
  return (
    <Customers
      title="Customers"
      subtitle="Manage customers in the system"
      showExportButton={true}
      showAddButton={true} // Based on canCreateUsers logic in hook
      addButtonText="Add Customer"
      exportButtonText="Export"
      showStats={false} // Client page typically doesn't show stats overview
      useSearchCustomers={false} // Client page uses getCustomersPaginated
      initialLimit={PAGINATION.DEFAULT_PAGE_SIZE}
      currentUser={currentUser}
    />
  );
} 