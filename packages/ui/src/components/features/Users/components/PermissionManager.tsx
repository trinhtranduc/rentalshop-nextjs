'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { Switch } from '@rentalshop/ui';
import { Label } from '@rentalshop/ui';
import { useToast } from '@rentalshop/ui';
import { usersApi } from '@rentalshop/utils';
import { useUsersTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { Loader2, Save } from 'lucide-react';

interface Permission {
  permission: string;
  enabled: boolean;
}

interface PermissionGroup {
  category: string;
  permissions: {
    key: string;
    label: string;
    description: string;
  }[];
}

// Available permissions that OUTLET_ADMIN can grant to OUTLET_STAFF
const AVAILABLE_PERMISSIONS: PermissionGroup[] = [
  {
    category: 'Orders',
    permissions: [
      {
        key: 'orders.export',
        label: 'Export Orders',
        description: 'Allow exporting orders to CSV/Excel',
      },
      {
        key: 'orders.delete',
        label: 'Delete Orders',
        description: 'Allow deleting orders',
      },
    ],
  },
  {
    category: 'Products',
    permissions: [
      {
        key: 'products.export',
        label: 'Export Products',
        description: 'Allow exporting products to CSV/Excel',
      },
    ],
  },
  {
    category: 'Customers',
    permissions: [
      {
        key: 'customers.export',
        label: 'Export Customers',
        description: 'Allow exporting customers to CSV/Excel',
      },
    ],
  },
  {
    category: 'Users',
    permissions: [
      {
        key: 'users.view',
        label: 'View Users',
        description: 'Allow viewing user list and details',
      },
      {
        key: 'users.manage',
        label: 'Manage Users',
        description: 'Allow creating, editing, and deleting users',
      },
    ],
  },
  {
    category: 'Dashboard',
    permissions: [
      {
        key: 'analytics.view',
        label: 'View Analytics',
        description: 'Allow viewing dashboard and analytics',
      },
    ],
  },
];

interface PermissionManagerProps {
  userId: number;
  userRole: string;
  currentUserRole?: string;
  onPermissionsUpdated?: () => void;
}

export const PermissionManager: React.FC<PermissionManagerProps> = ({
  userId,
  userRole,
  currentUserRole,
  onPermissionsUpdated,
}) => {
  const t = useUsersTranslations();
  const tc = useCommonTranslations();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Only show permission manager for OUTLET_STAFF when current user is OUTLET_ADMIN, MERCHANT, or ADMIN
  const canManagePermissions =
    userRole === 'OUTLET_STAFF' &&
    (currentUserRole === 'OUTLET_ADMIN' ||
      currentUserRole === 'MERCHANT' ||
      currentUserRole === 'ADMIN');

  useEffect(() => {
    if (canManagePermissions) {
      loadPermissions();
    }
  }, [userId, canManagePermissions]);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      const response = await usersApi.getUserPermissions(userId);
      
      if (response.success && response.data) {
        // Convert permissions array to object
        const permissionsMap: Record<string, boolean> = {};
        response.data.permissions.forEach((perm: Permission) => {
          permissionsMap[perm.permission] = perm.enabled;
        });
        setPermissions(permissionsMap);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast({
        title: tc('messages.error'),
        description: 'Failed to load permissions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionKey: string) => {
    setPermissions((prev) => ({
      ...prev,
      [permissionKey]: !prev[permissionKey],
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Convert permissions object to array format
      const permissionsArray = Object.entries(permissions).map(([permission, enabled]) => ({
        permission,
        enabled,
      }));

      // Also include all available permissions that are not in the current state
      AVAILABLE_PERMISSIONS.forEach((group) => {
        group.permissions.forEach((perm) => {
          if (!(perm.key in permissions)) {
            permissionsArray.push({
              permission: perm.key,
              enabled: false,
            });
          }
        });
      });

      const response = await usersApi.updateUserPermissions(userId, {
        permissions: permissionsArray,
      });

      if (response.success) {
        toast({
          title: tc('messages.success'),
          description: 'Permissions updated successfully',
        });
        onPermissionsUpdated?.();
      } else {
        toast({
          title: tc('messages.error'),
          description: response.error || 'Failed to update permissions',
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

  if (!canManagePermissions) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission Management</CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Enable or disable specific permissions for this user
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {AVAILABLE_PERMISSIONS.map((group) => (
          <div key={group.category} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">{group.category}</h3>
            <div className="space-y-3 pl-4">
              {group.permissions.map((perm) => (
                <div
                  key={perm.key}
                  className="flex items-start justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <Label htmlFor={perm.key} className="text-sm font-medium cursor-pointer">
                      {perm.label}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">{perm.description}</p>
                  </div>
                  <Switch
                    id={perm.key}
                    checked={permissions[perm.key] || false}
                    onCheckedChange={() => handlePermissionToggle(perm.key)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="min-w-[120px]"
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
  );
};

