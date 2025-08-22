'use client'

import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { ConfirmationDialog } from './ConfirmationDialog';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { userApiClient } from '../lib/UserApiClient';
import { UserCheck, UserX, Key, AlertTriangle } from 'lucide-react';
import type { User } from '@rentalshop/types';

interface UserDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onUserUpdated?: (user: User) => void;
  onError?: (error: string) => void;
}

export const UserDetailDialog: React.FC<UserDetailDialogProps> = ({
  open,
  onOpenChange,
  user,
  onUserUpdated,
  onError
}) => {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [isActivateConfirmOpen, setIsActivateConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  const formatDate = (date: Date | string) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'MERCHANT':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
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

  const getStatusDisplayName = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const getStatusIcon = (isActive: boolean) => {
    if (isActive) {
      return '🟢'; // Green circle
    } else {
      return '🟡'; // Yellow circle
    }
  };

  const handleDeactivateUser = async () => {
    setIsLoading(true);
    try {
      const response = await userApiClient.deactivateUser(user.id);
      
      if (response.success) {
        // Update local user state
        const updatedUser = { ...user, isActive: false };
        onUserUpdated?.(updatedUser);
        
        // Close dialog
        onOpenChange(false);
      } else {
        onError?.(response.error || 'Failed to deactivate user');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateUser = async () => {
    setIsLoading(true);
    try {
      const response = await userApiClient.activateUser(user.id);
      
      if (response.success) {
        // Update local user state
        const updatedUser = { ...user, isActive: true };
        onUserUpdated?.(updatedUser);
        
        // Close dialog
        onOpenChange(false);
      } else {
        onError?.(response.error || 'Failed to activate user');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    // Show success message or handle as needed
    console.log('Password changed successfully');
  };

  const handlePasswordChangeError = (error: string) => {
    onError?.(error);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div>
              <DialogTitle className="text-xl font-semibold">
                User Details
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                View user information and details
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mt-6 space-y-6">
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
                    <p className="text-gray-900 text-base font-medium">{user.name}</p>
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
                      {user.role === 'ADMIN' && 'Admin'}
                      {user.role === 'MERCHANT' && 'Merchant'}
                      {user.role === 'OUTLET_ADMIN' && 'Outlet Admin'}
                      {user.role === 'OUTLET_STAFF' && 'Outlet Staff'}
                      {!['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'].includes(user.role) && user.role}
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
            {user.outletStaff && user.outletStaff.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Outlet Information
                  </h3>
                  <div className="space-y-4">
                    {user.outletStaff.map((staff) => (
                      <div key={staff.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Name</label>
                            <p className="text-gray-900 text-base">{staff.outlet.name}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Outlet ID</label>
                            <p className="text-gray-500 text-sm font-mono">{staff.outlet.id}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Account Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Account Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Password Management</h4>
                    <Button
                      onClick={() => setIsChangePasswordOpen(true)}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Change Password
                    </Button>
                    <p className="text-xs text-gray-500">
                      Allow users to change their password securely
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Account Status</h4>
                    {user.isActive ? (
                      <Button
                        onClick={() => setIsDeactivateConfirmOpen(true)}
                        variant="outline"
                        className="w-full justify-start text-orange-600 border-orange-200 hover:bg-orange-50"
                        disabled={isLoading || user.role === 'ADMIN'}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        {isLoading ? 'Deactivating...' : 'Deactivate Account'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setIsActivateConfirmOpen(true)}
                        variant="outline"
                        className="w-full justify-start text-green-600 border-green-200 hover:bg-green-50"
                        disabled={isLoading}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        {isLoading ? 'Activating...' : 'Activate Account'}
                      </Button>
                    )}
                    <p className="text-xs text-gray-500">
                      {user.isActive 
                        ? 'Deactivate to prevent login access' 
                        : 'Activate to restore login access'
                      }
                    </p>
                    {user.role === 'ADMIN' && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                        <AlertTriangle className="h-3 w-3" />
                        Admin accounts cannot be deactivated
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
        userId={user.id}
        userName={user.name}
        onSuccess={handlePasswordChangeSuccess}
        onError={handlePasswordChangeError}
      />

      {/* Deactivate User Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeactivateConfirmOpen}
        onOpenChange={setIsDeactivateConfirmOpen}
        type="warning"
        title="Deactivate User Account"
        description={`Are you sure you want to deactivate ${user.name}? This will prevent them from logging in to the system.`}
        confirmText="Deactivate Account"
        cancelText="Cancel"
        onConfirm={handleDeactivateUser}
      />

      {/* Activate User Confirmation Dialog */}
      <ConfirmationDialog
        open={isActivateConfirmOpen}
        onOpenChange={setIsActivateConfirmOpen}
        type="info"
        title="Activate User Account"
        description={`Are you sure you want to activate ${user.name}? This will allow them to log in to the system again.`}
        confirmText="Activate Account"
        cancelText="Cancel"
        onConfirm={handleActivateUser}
      />
    </>
  );
};
