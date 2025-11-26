'use client';

import React from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  Button,
} from '@rentalshop/ui';
import { PermissionRoleView } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * Role Permissions View Page
 * Displays default permissions for OUTLET_ADMIN and OUTLET_STAFF roles
 * View-only page - no editing capabilities
 */
export default function RolePermissionsPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  // Check if user can view permissions
  const canViewPermissions =
    currentUser?.role === USER_ROLE.OUTLET_ADMIN ||
    currentUser?.role === USER_ROLE.MERCHANT ||
    currentUser?.role === USER_ROLE.ADMIN;

  if (!canViewPermissions) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Access Denied</PageTitle>
        </PageHeader>
        <div className="mt-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-800">You don't have permission to access this page.</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Role Permissions</PageTitle>
            <p className="text-sm text-gray-600 mt-1">
              View default permissions for OUTLET_ADMIN and OUTLET_STAFF roles. All permissions shown are read-only.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/users/permissions')}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Manage User Permissions
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="mt-6">
        <PermissionRoleView />
      </div>
    </PageWrapper>
  );
}

