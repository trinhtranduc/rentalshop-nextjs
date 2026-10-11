'use client'

import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  useToast
} from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { ConfirmationDialog } from '@rentalshop/ui';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { UserDisplayInfo } from './UserDisplayInfo';
import { usersApi, authApi } from '@rentalshop/utils';
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
  const { toastSuccess, toastError } = useToast();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [isActivateConfirmOpen, setIsActivateConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

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

  const handleVerifyEmail = async () => {
    setIsVerifyingEmail(true);
    try {
      // Admin can verify email directly by updating user
      const response = await usersApi.updateUser(user.id, { 
        emailVerified: true
      });
      
      if (response.success) {
        // Update local user state
        const updatedUser = { ...user, emailVerified: true };
        onUserUpdated?.(updatedUser);
        // Update local user state in dialog
        user.emailVerified = true;
        toastSuccess('Email Verified', 'User email has been verified successfully');
      } else {
        const errorMsg = response.error || 'Failed to verify email';
        onError?.(errorMsg);
        toastError('Verification Failed', errorMsg);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      onError?.(errorMessage);
      toastError('Verification Failed', errorMessage);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleResendVerification = async () => {
    setIsSendingVerification(true);
    try {
      // Resend verification email
      const response = await authApi.resendVerificationEmail(user.email);
      
      if (response.success) {
        toastSuccess('Verification Email Sent', 'A verification email has been sent to the user');
      } else {
        const errorMsg = response.error || 'Failed to send verification email';
        onError?.(errorMsg);
        toastError('Send Failed', errorMsg);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      onError?.(errorMessage);
    } finally {
      setIsSendingVerification(false);
    }
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 max-md:flex max-md:flex-col max-md:overflow-hidden max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-full max-md:rounded-none max-md:border-0 max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:[&>button]:right-1.5 max-md:[&>button]:top-1.5 max-md:[&>button]:p-3.5 max-md:[&_input]:min-h-11 max-md:[&_textarea]:min-h-11 max-md:[&_button]:min-h-11 max-md:[&_[role=combobox]]:min-h-11">
          <DialogHeader className="px-6 py-4 border-b max-md:px-4 max-md:pr-14 max-md:text-left">
            <DialogTitle className="text-lg font-semibold">
                {t('userDetails')}
              </DialogTitle>
            <DialogDescription className="mt-1">
                {t('viewUserInfo')}
              </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 overflow-y-auto max-md:flex-1 max-md:min-h-0 max-md:px-4 max-md:pb-0">
            <div className="space-y-6">
            <UserDisplayInfo
              user={user}
              showActions={true}
              onChangePassword={() => setIsChangePasswordOpen(true)}
              onActivate={() => setIsActivateConfirmOpen(true)}
              onDeactivate={() => setIsDeactivateConfirmOpen(true)}
              onDelete={() => setIsDeleteConfirmOpen(true)}
              onVerifyEmail={handleVerifyEmail}
              onResendVerification={handleResendVerification}
              isLoading={isLoading || isVerifyingEmail || isSendingVerification}
            />
            
              {/* Permission Management - Hidden */}
              {/* <PermissionManager
              userId={user.id}
              userRole={user.role}
              currentUserRole={currentUser?.role}
              onPermissionsUpdated={() => {
                // Refresh user data if needed
                onUserUpdated?.(user);
              }}
              /> */}
          </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t max-md:sticky max-md:bottom-0 max-md:-mx-4 max-md:mt-4 max-md:bg-bg-card max-md:px-4 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:[&>button]:flex-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc('buttons.close')}
            </Button>
            </div>
          </div>
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
