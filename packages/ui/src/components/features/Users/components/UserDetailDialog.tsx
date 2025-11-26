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
import { PermissionManager } from './PermissionManager';
import { usersApi } from '@rentalshop/utils';
import type { User } from '@rentalshop/types';
import { useUsersTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { useAuth } from '@rentalshop/hooks';

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
  const t = useUsersTranslations();
  const tc = useCommonTranslations();
  const { user: currentUser } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [isActivateConfirmOpen, setIsActivateConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;



  const handleDeactivateUser = async () => {
    setIsLoading(true);
    try {
      // Use dedicated deactivateUser API method
      const response = await usersApi.deactivateUser(user.id);
      
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
      // Use dedicated activateUser API method
      const response = await usersApi.activateUser(user.id);
      
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
      // Use dedicated deleteUser API method
      const response = await usersApi.deleteUser(user.id);
      
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
                {t('userDetails')}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {t('viewUserInfo')}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            <UserDisplayInfo
              user={user}
              showActions={true}
              onChangePassword={() => setIsChangePasswordOpen(true)}
              onActivate={() => setIsActivateConfirmOpen(true)}
              onDeactivate={() => setIsDeactivateConfirmOpen(true)}
              onDelete={() => setIsDeleteConfirmOpen(true)}
              isLoading={isLoading}
            />
            
            {/* Permission Management */}
            <PermissionManager
              userId={user.id}
              userRole={user.role}
              currentUserRole={currentUser?.role}
              onPermissionsUpdated={() => {
                // Refresh user data if needed
                onUserUpdated?.(user);
              }}
            />
          </div>

          <DialogFooter className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc('buttons.close')}
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
        title={t('messages.confirmDeactivateAccount')}
        description={`${t('messages.confirmDeactivate')} ${`${user.firstName || ''} ${user.lastName || ''}`.trim()}? ${t('messages.confirmDeactivateDetails')}`}
        confirmText={t('actions.deactivateAccount')}
        cancelText={tc('buttons.cancel')}
        onConfirm={handleDeactivateUser}
      />

      {/* Activate User Confirmation Dialog */}
      <ConfirmationDialog
        open={isActivateConfirmOpen}
        onOpenChange={setIsActivateConfirmOpen}
        type="info"
        title={t('messages.confirmActivateAccount')}
        description={`${t('messages.confirmActivate')} ${`${user.firstName || ''} ${user.lastName || ''}`.trim()}? ${t('messages.confirmActivateDetails')}`}
        confirmText={t('actions.activateAccount')}
        cancelText={tc('buttons.cancel')}
        onConfirm={handleActivateUser}
      />

      {/* Delete User Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        type="danger"
        title={t('messages.confirmDeleteAccount')}
        description={`${t('messages.confirmDelete')} ${`${user.firstName || ''} ${user.lastName || ''}`.trim()}? ${t('messages.confirmDeleteDetails')}`}
        confirmText={t('actions.deleteAccount')}
        cancelText={tc('buttons.cancel')}
        onConfirm={handleDeleteUser}
      />
    </>
  );
};
