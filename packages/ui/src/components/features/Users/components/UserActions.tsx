'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../ui/button';
import { ConfirmationDialog } from '@rentalshop/ui';
import { UserDetailDialog } from './UserDetailDialog';
import type { User, UserCreateInput, UserUpdateInput } from '@rentalshop/types';
import { useUsersTranslations, useCommonTranslations } from '@rentalshop/hooks';
// formatPublicId removed - using single id system

interface UserActionsProps {
  onAction: (action: string, userId: number) => void;
  onUserCreated?: (user: UserCreateInput | UserUpdateInput) => void;
  onUserUpdated?: (user: User) => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void; // New callback for success messages
}

export function UserActions({ 
  onAction, 
  onUserCreated, 
  onUserUpdated, 
  onError,
  onSuccess
}: UserActionsProps) {
  const router = useRouter();
  const t = useUsersTranslations();
  const tc = useCommonTranslations();
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);

  // Listen for user action events from UserTable
  useEffect(() => {
    const handleUserAction = (event: CustomEvent) => {
      const { action, userId, user } = event.detail;
      console.log('🔍 UserActions: Event received:', { action, userId, user });
      
      if (action === 'view' && user) {
        console.log('🔍 UserActions: Handling view action for user:', user);
        setSelectedUser(user);
        setIsViewDialogOpen(true);
      } else if (action === 'edit' && user) {
        console.log('🔍 UserActions: Handling edit action for user:', user);
        console.log('🔍 User id:', user.id, 'type:', typeof user.id);
        console.log('🔍 Full user object:', user);
        // Handle edit action by navigating to edit page
        handleAction('edit', user);
      } else if (action === 'deactivate' && user) {
        console.log('🔍 UserActions: Handling deactivate action for user:', user);
        setUserToDeactivate(user);
        setIsDeactivateDialogOpen(true);
      }
    };

    window.addEventListener('user-action', handleUserAction as EventListener);
    return () => window.removeEventListener('user-action', handleUserAction as EventListener);
  }, [router]);

  const handleViewDialogClose = () => {
    setIsViewDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDeactivateDialogClose = () => {
    setIsDeactivateDialogOpen(false);
    setUserToDeactivate(null);
  };

  const handleConfirmDeactivate = () => {
    if (userToDeactivate) {
      onAction('deactivate', userToDeactivate.id);
      handleDeactivateDialogClose();
    }
  };

  // Note: User creation and editing are now handled by separate pages
  // These functions are kept for backward compatibility but are no longer used
  const handleSaveUser = async (userData: Partial<User>) => {
    console.log('🔍 UserActions: handleSaveUser called but no longer used');
  };

  const handleCreateUser = async (userData: UserCreateInput | UserUpdateInput) => {
    console.log('🔍 UserActions: handleCreateUser called but no longer used');
  };

  const handleAction = (action: string, user: User) => {
    console.log('🔍 UserActions: Action triggered:', { action, userId: user.id });
    
    switch (action) {
      case 'edit':
        // Navigate to user page where editing can be done inline
        console.log('🔍 UserActions: Edit action - checking id:', { 
          id: user.id, 
          type: typeof user.id, 
          isValid: user.id && typeof user.id === 'number' 
        });
        
        if (user.id && typeof user.id === 'number') {
          const formattedId = `USER-${user.id.toString().padStart(4, '0')}`;
          console.log('🔍 UserActions: Navigating to user page:', formattedId);
          console.log('🔍 Full URL:', `/users/${formattedId}`);
          router.push(`/users/${formattedId}`);
        } else {
          console.error('❌ UserActions: No valid id available for user:', user);
          console.error('❌ User data:', user);
          // Show error message to user
          onError?.('Cannot edit user: Missing or invalid id');
        }
        break;
        
      case 'add':
        console.log('🔍 UserActions: Navigating to add user');
        router.push('/users/add');
        break;
        
      default:
        console.warn('⚠️ UserActions: Unknown action:', action);
    }
  };

  return (
    <>
      {/* User Detail Dialog */}
      <UserDetailDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        user={selectedUser}
        onUserUpdated={onUserUpdated}
        onError={onError}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeactivateDialogOpen}
        onOpenChange={setIsDeactivateDialogOpen}
        type="warning"
        title={t('messages.confirmDeactivateAccount')}
        description={`${t('messages.confirmDeactivateNamed', { name: userToDeactivate?.name })} ${t('messages.confirmDeactivateDetails')}`}
        confirmText={t('actions.deactivate')}
        cancelText={tc('buttons.cancel')}
        onConfirm={handleConfirmDeactivate}
      />
    </>
  );
}
