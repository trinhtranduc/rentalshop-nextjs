'use client';

import React, { useState, useEffect } from 'react';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  useToast,
} from '@rentalshop/ui';
import { Save, Loader2, Users as UsersIcon, Eye } from 'lucide-react';
import { useAuth, useCommonTranslations } from '@rentalshop/hooks';
import { usersApi } from '@rentalshop/utils';
import { PermissionModule } from '@rentalshop/ui';
import { UserSelector } from '@rentalshop/ui';
import type { User } from '@rentalshop/types';
import { useRouter } from 'next/navigation';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * Permission Management Page
 * Allows admin to manage permissions for staff users
 */
export default function PermissionsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const tc = useCommonTranslations();
  const router = useRouter();
  
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Available permissions grouped by module
  const permissionModules = [
    {
      module: 'Orders',
      permissions: [
        { key: 'orders.export', label: 'Export Orders', description: 'Allow exporting orders to CSV/Excel' },
        { key: 'orders.delete', label: 'Delete Orders', description: 'Allow deleting orders' },
      ],
    },
    {
      module: 'Products',
      permissions: [
        { key: 'products.export', label: 'Export Products', description: 'Allow exporting products to CSV/Excel' },
      ],
    },
    {
      module: 'Customers',
      permissions: [
        { key: 'customers.export', label: 'Export Customers', description: 'Allow exporting customers to CSV/Excel' },
      ],
    },
    {
      module: 'Users',
      permissions: [
        { key: 'users.view', label: 'View Users', description: 'Allow viewing user list and details' },
        { key: 'users.manage', label: 'Manage Users', description: 'Allow creating, editing, and deleting users' },
      ],
    },
    {
      module: 'Dashboard',
      permissions: [
        { key: 'analytics.view', label: 'View Analytics', description: 'Allow viewing dashboard and analytics' },
      ],
    },
  ];

  const handlePermissionToggle = (permissionKey: string) => {
    setPermissions((prev) => ({
      ...prev,
      [permissionKey]: !prev[permissionKey],
    }));
  };

  const handleSelectAll = (module: string) => {
    const modulePermissions = permissionModules.find((m) => m.module === module);
    if (!modulePermissions) return;

    const allEnabled = modulePermissions.permissions.every(
      (perm) => permissions[perm.key] === true
    );

    const newPermissions = { ...permissions };
    modulePermissions.permissions.forEach((perm) => {
      newPermissions[perm.key] = !allEnabled;
    });
    setPermissions(newPermissions);
  };

  const handleSave = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: tc('messages.error'),
        description: 'Please select at least one user',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      // Convert permissions object to array format
      const permissionsArray = Object.entries(permissions)
        .filter(([_, enabled]) => enabled) // Only include enabled permissions
        .map(([permission, enabled]) => ({
          permission,
          enabled,
        }));

      // Also include all available permissions that are not enabled (set to false)
      permissionModules.forEach((module) => {
        module.permissions.forEach((perm) => {
          if (!(perm.key in permissions)) {
            permissionsArray.push({
              permission: perm.key,
              enabled: false,
            });
          }
        });
      });

      // Call bulk update API
      const response = await fetch('/api/users/permissions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          permissions: permissionsArray,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: tc('messages.success'),
          description: `Permissions updated for ${selectedUsers.length} user(s)`,
        });
        // Reset selections
        setSelectedUsers([]);
        setPermissions({});
      } else {
        toast({
          title: tc('messages.error'),
          description: data.error || 'Failed to update permissions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: tc('messages.error'),
        description: 'Failed to save permissions',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if user can manage permissions
  const canManagePermissions =
    currentUser?.role === USER_ROLE.OUTLET_ADMIN ||
    currentUser?.role === USER_ROLE.MERCHANT ||
    currentUser?.role === USER_ROLE.ADMIN;

  if (!canManagePermissions) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Access Denied</PageTitle>
        </PageHeader>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Permission Management</PageTitle>
            <p className="text-sm text-gray-600 mt-1">
              Manage permissions for staff users. Select users and configure their access rights.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/users/role-permissions')}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Role Permissions
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="space-y-6 mt-6">
        {/* User Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              Select Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserSelector
              selectedUserIds={selectedUsers}
              onSelectionChange={setSelectedUsers}
              filterRole="OUTLET_STAFF"
              multiple={true}
            />
            {selectedUsers.length > 0 && (
              <p className="text-sm text-gray-600 mt-4">
                {selectedUsers.length} user(s) selected
              </p>
            )}
          </CardContent>
        </Card>

        {/* Permission Modules */}
        {selectedUsers.length > 0 && (
          <>
            {permissionModules.map((module) => (
              <PermissionModule
                key={module.module}
                module={module.module}
                permissions={module.permissions}
                selectedPermissions={permissions}
                onPermissionToggle={handlePermissionToggle}
                onSelectAll={() => handleSelectAll(module.module)}
              />
            ))}

            {/* Save Button */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || selectedUsers.length === 0}
                    className="min-w-[150px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Permissions
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {selectedUsers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <UsersIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Please select users to manage their permissions</p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}

