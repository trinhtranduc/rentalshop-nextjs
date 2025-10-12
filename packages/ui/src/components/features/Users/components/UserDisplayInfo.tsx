'use client'

import React from 'react';
import { Card, CardContent, Button } from '@rentalshop/ui';
import type { User } from '@rentalshop/types';

interface UserDisplayInfoProps {
  user: User;
  showActions?: boolean;
  onEdit?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onChangePassword?: () => void;
  isLoading?: boolean;
}

export const UserDisplayInfo: React.FC<UserDisplayInfoProps> = ({
  user,
  showActions = false,
  onEdit,
  onView,
  onDelete,
  onActivate,
  onDeactivate,
  onChangePassword,
  isLoading = false
}) => {
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'MERCHANT':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'OUTLET_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
      case 'OUTLET_STAFF':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
      case 'CLIENT':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getStatusBadgeStyle = (isActive: boolean) => {
    if (isActive) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
    } else {
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'MERCHANT': return 'Merchant';
      case 'OUTLET_ADMIN': return 'Outlet Admin';
      case 'OUTLET_STAFF': return 'Outlet Staff';
      case 'CLIENT': return 'Client';
      default: return role;
    }
  };

  const getStatusDisplayName = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <p className="text-gray-900 text-base font-medium">
                {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not provided'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <p className="text-gray-900 text-base">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <p className="text-gray-900 text-base">{user.phone || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeStyle(user.role)}`}>
                {getRoleDisplayName(user.role)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(user.isActive)}`}>
                {getStatusDisplayName(user.isActive)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <p className="text-gray-500 text-sm font-mono">{user.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outlet Information */}
      {user.outlet && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Outlet Information
            </h3>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Name</label>
                  <p className="text-gray-900 text-base">{user.outlet.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outlet ID</label>
                  <p className="text-gray-500 text-sm font-mono">{user.outlet.id}</p>
                </div>
                {user.outlet.merchant && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Name</label>
                      <p className="text-gray-900 text-base">{user.outlet.merchant.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
                      <p className="text-gray-500 text-sm font-mono">{user.outlet.merchant.id}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Actions - Only show if actions are enabled */}
      {showActions && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Account Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {onChangePassword && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Password Management</h4>
                  <Button
                    variant="outline"
                    onClick={onChangePassword}
                    className="w-full flex items-center justify-start px-3 py-2 text-sm h-auto"
                    disabled={isLoading}
                  >
                    🔑 Change Password
                  </Button>
                  <p className="text-xs text-gray-500">
                    Allow users to change their password securely
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Account Status</h4>
                {user.isActive ? (
                  onDeactivate && (
                    <Button
                      variant="outline"
                      onClick={onDeactivate}
                      className="w-full flex items-center justify-start px-3 py-2 text-sm text-orange-600 border-orange-200 hover:bg-orange-50 h-auto"
                      disabled={isLoading || user.role === 'ADMIN'}
                    >
                      {isLoading ? '⏳ Deactivating...' : '❌ Deactivate Account'}
                    </Button>
                  )
                ) : (
                  onActivate && (
                    <Button
                      variant="outline"
                      onClick={onActivate}
                      className="w-full flex items-center justify-start px-3 py-2 text-sm text-green-600 border-green-200 hover:bg-green-50 h-auto"
                      disabled={isLoading}
                    >
                      {isLoading ? '⏳ Activating...' : '✅ Activate Account'}
                    </Button>
                  )
                )}
                <p className="text-xs text-gray-500">
                  {user.isActive 
                    ? 'Deactivate to prevent login access' 
                    : 'Activate to restore login access'
                  }
                </p>
                {user.role === 'ADMIN' && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ Admin accounts cannot be deactivated
                  </div>
                )}
              </div>
              
              {onDelete && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Danger Zone</h4>
                  <Button
                    variant="outline"
                    onClick={onDelete}
                    className="w-full flex items-center justify-start px-3 py-2 text-sm text-red-600 border-red-200 hover:bg-red-50 h-auto"
                    disabled={isLoading || user.role === 'ADMIN'}
                  >
                    {isLoading ? '⏳ Deleting...' : '🗑️ Delete Account'}
                  </Button>
                  <p className="text-xs text-gray-500">
                    Permanently delete this user account
                  </p>
                  {user.role === 'ADMIN' && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      ⚠️ Admin accounts cannot be deleted
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
