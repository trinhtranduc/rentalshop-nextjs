'use client'

import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { ConfirmationDialog } from '@rentalshop/ui';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { UserDisplayInfo } from './UserDisplayInfo';
import { usersApi } from '@rentalshop/utils';
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
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;



  const handleDeactivateUser = async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.updateUserStatus(user.id, 'inactive');
      
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
      const response = await usersApi.updateUserStatus(user.id, 'active');
      
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

  const handleDeleteUser = async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.deleteUserByPublicId(user.id);
      
      if (response.success) {
        // Close dialog and notify parent
        onOpenChange(false);
        onUserUpdated?.(user); // This will trigger a refresh in the parent
      } else {
        onError?.(response.error || 'Failed to delete user');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
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

          <div className="mt-6">
            <UserDisplayInfo
              user={user}
              showActions={true}
              onChangePassword={() => setIsChangePasswordOpen(true)}
              onActivate={() => setIsActivateConfirmOpen(true)}
              onDeactivate={() => setIsDeactivateConfirmOpen(true)}
              onDelete={() => setIsDeleteConfirmOpen(true)}
              isLoading={isLoading}
            />
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
        userName={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
        onSuccess={handlePasswordChangeSuccess}
        onError={handlePasswordChangeError}
      />

      {/* Deactivate User Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeactivateConfirmOpen}
        onOpenChange={setIsDeactivateConfirmOpen}
        type="warning"
        title="Deactivate User Account"
        description={`Are you sure you want to deactivate ${`${user.firstName || ''} ${user.lastName || ''}`.trim()}? This will prevent them from logging in to the system.`}
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
        description={`Are you sure you want to activate ${`${user.firstName || ''} ${user.lastName || ''}`.trim()}? This will allow them to log in to the system again.`}
        confirmText="Activate Account"
        cancelText="Cancel"
        onConfirm={handleActivateUser}
      />

      {/* Delete User Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        type="danger"
        title="Delete User Account"
        description={`Are you sure you want to permanently delete ${`${user.firstName || ''} ${user.lastName || ''}`.trim()}? This action cannot be undone and will remove all user data.`}
        confirmText="Delete Account"
        cancelText="Cancel"
        onConfirm={handleDeleteUser}
      />
    </>
  );
};
