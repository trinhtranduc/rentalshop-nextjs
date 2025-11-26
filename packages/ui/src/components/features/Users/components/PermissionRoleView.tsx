'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@rentalshop/ui';
import { Switch } from '@rentalshop/ui';
import type { Permission, Role } from '@rentalshop/auth';
import { ROLE_PERMISSIONS } from '@rentalshop/auth';
import { USER_ROLE, type UserRole } from '@rentalshop/constants';

interface PermissionGroup {
  module: string;
  permissions: {
    key: Permission;
    label: string;
    description: string;
  }[];
}

// All possible permissions grouped by module
const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: 'Outlet',
    permissions: [
      {
        key: 'outlet.view',
        label: 'View Outlet',
        description: 'Allow viewing outlet information',
      },
      {
        key: 'outlet.manage',
        label: 'Manage Outlet',
        description: 'Allow managing outlet settings and configuration',
      },
    ],
  },
  {
    module: 'Users',
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
    module: 'Products',
    permissions: [
      {
        key: 'products.view',
        label: 'View Products',
        description: 'Allow viewing product list and details',
      },
      {
        key: 'products.manage',
        label: 'Manage Products',
        description: 'Allow creating, editing, and deleting products',
      },
      {
        key: 'products.export',
        label: 'Export Products',
        description: 'Allow exporting products to CSV/Excel',
      },
    ],
  },
  {
    module: 'Orders',
    permissions: [
      {
        key: 'orders.create',
        label: 'Create Orders',
        description: 'Allow creating new orders',
      },
      {
        key: 'orders.view',
        label: 'View Orders',
        description: 'Allow viewing order list and details',
      },
      {
        key: 'orders.update',
        label: 'Update Orders',
        description: 'Allow updating existing orders',
      },
      {
        key: 'orders.delete',
        label: 'Delete Orders',
        description: 'Allow deleting orders',
      },
      {
        key: 'orders.export',
        label: 'Export Orders',
        description: 'Allow exporting orders to CSV/Excel',
      },
      {
        key: 'orders.manage',
        label: 'Manage Orders',
        description: 'Full order management (create, view, update, delete, export)',
      },
    ],
  },
  {
    module: 'Customers',
    permissions: [
      {
        key: 'customers.view',
        label: 'View Customers',
        description: 'Allow viewing customer list and details',
      },
      {
        key: 'customers.manage',
        label: 'Manage Customers',
        description: 'Allow creating, editing, and deleting customers',
      },
      {
        key: 'customers.export',
        label: 'Export Customers',
        description: 'Allow exporting customers to CSV/Excel',
      },
    ],
  },
  {
    module: 'Dashboard',
    permissions: [
      {
        key: 'analytics.view',
        label: 'View Analytics',
        description: 'Allow viewing dashboard and analytics',
      },
    ],
  },
];

type OutletRole = typeof USER_ROLE.OUTLET_ADMIN | typeof USER_ROLE.OUTLET_STAFF;

interface PermissionRoleViewProps {
  role?: OutletRole;
  onRoleChange?: (role: OutletRole) => void;
}

export const PermissionRoleView: React.FC<PermissionRoleViewProps> = ({
  role: initialRole = USER_ROLE.OUTLET_STAFF,
  onRoleChange,
}) => {
  const [selectedRole, setSelectedRole] = useState<OutletRole>(initialRole);

  const handleRoleChange = (newRole: string) => {
    if (newRole === USER_ROLE.OUTLET_ADMIN || newRole === USER_ROLE.OUTLET_STAFF) {
      const role = newRole as OutletRole;
      setSelectedRole(role);
      onRoleChange?.(role);
    }
  };

  // Get permissions for selected role
  const rolePermissions = useMemo(() => {
    return ROLE_PERMISSIONS[selectedRole as Role] || [];
  }, [selectedRole]);

  // Check if permission is enabled for the selected role
  const isPermissionEnabled = (permission: Permission): boolean => {
    return rolePermissions.includes(permission);
  };

  return (
    <div className="space-y-6">
      {/* Role Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="role-select">Role</Label>
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger id="role-select" className="w-full max-w-md">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USER_ROLE.OUTLET_ADMIN}>Outlet Admin</SelectItem>
                <SelectItem value={USER_ROLE.OUTLET_STAFF}>Outlet Staff</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600 mt-2">
              View default permissions for {selectedRole === USER_ROLE.OUTLET_ADMIN ? 'Outlet Admin' : 'Outlet Staff'} role
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Permission Groups */}
      {PERMISSION_GROUPS.map((group) => (
        <Card key={group.module}>
          <CardHeader>
            <CardTitle>{group.module} Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.permissions.map((permission) => {
              const isEnabled = isPermissionEnabled(permission.key);
              return (
                <div
                  key={permission.key}
                  className="flex items-start justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <Label
                      htmlFor={permission.key}
                      className={`text-sm font-medium cursor-not-allowed ${
                        isEnabled ? 'text-text-primary' : 'text-gray-400'
                      }`}
                    >
                      {permission.label}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                  </div>
                  <Switch
                    id={permission.key}
                    checked={isEnabled}
                    disabled={true}
                    className="opacity-60"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> These are the default permissions for the {selectedRole === USER_ROLE.OUTLET_ADMIN ? 'Outlet Admin' : 'Outlet Staff'} role.
            All permissions shown here are read-only and cannot be modified.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

