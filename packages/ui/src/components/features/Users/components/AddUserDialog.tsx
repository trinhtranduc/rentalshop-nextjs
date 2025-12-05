'use client'

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '../../../ui';
import { UserForm } from './UserForm';
import type { User, UserCreateInput } from '@rentalshop/types';
import { useUsersTranslations } from '@rentalshop/hooks';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: (user: UserCreateInput) => void;
  onError?: (error: string) => void;
  currentUser?: User | null;
}

export const AddUserDialog: React.FC<AddUserDialogProps> = ({
  open,
  onOpenChange,
  onUserCreated,
  onError,
  currentUser
}) => {
  const t = useUsersTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (userData: UserCreateInput | any) => {
    try {
      setIsSubmitting(true);
      
      // Call the parent callback to create the user
      // The parent will handle the API call and show toasts
      if (onUserCreated) {
        await onUserCreated(userData as UserCreateInput);
      }
      
      // Close dialog on success
      onOpenChange(false);
      
    } catch (error) {
      console.error('❌ AddUserDialog: Error occurred:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Failed to create user');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return; // Prevent cancellation while submitting
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {t('addNewUser')}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {t('addNewUserDescription') || 'Create a new user account for your organization'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 py-4 overflow-y-auto">
          <UserForm
            mode="create"
            user={undefined}
            onSave={handleSave}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            currentUser={currentUser}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

