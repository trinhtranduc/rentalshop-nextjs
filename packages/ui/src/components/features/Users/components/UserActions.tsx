import React, { useState, useEffect } from 'react';
import { Button } from '@rentalshop/ui';
import { ConfirmationDialog } from '../../../ui/confirmation-dialog';
import { UserDetailDialog } from './UserDetailDialog';
import { UserFormDialog } from './UserFormDialog';
import type { User, UserCreateInput, UserUpdateInput } from '../types';

interface UserActionsProps {
  onAction: (action: string, userId: string) => void;
  onUserCreated?: (user: UserCreateInput | UserUpdateInput) => void;
  onUserUpdated?: (user: User) => void;
  onError?: (error: string) => void;
}

export function UserActions({ 
  onAction, 
  onUserCreated, 
  onUserUpdated, 
  onError 
}: UserActionsProps) {
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);

  // Listen for user action events from UserTable
  useEffect(() => {
    const handleUserAction = (event: CustomEvent) => {
      const { action, userId, user } = event.detail;
      
      if (action === 'view' && user) {
        setSelectedUser(user);
        setIsViewDialogOpen(true);
      } else if (action === 'edit' && user) {
        setSelectedUser(user);
        setIsEditDialogOpen(true);
      } else if (action === 'deactivate' && user) {
        setUserToDeactivate(user);
        setIsDeactivateDialogOpen(true);
      } else if (action === 'add') {
        // Handle add user action
        setIsCreateDialogOpen(true);
      }
    };

    window.addEventListener('user-action', handleUserAction as EventListener);
    return () => window.removeEventListener('user-action', handleUserAction as EventListener);
  }, []);

  const handleViewDialogClose = () => {
    setIsViewDialogOpen(false);
    setSelectedUser(null);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };

  const handleCreateDialogClose = () => {
    setIsCreateDialogOpen(false);
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

  const handleSaveUser = async (userData: Partial<User>) => {
    try {
      if (selectedUser) {
        // Handle user update
        const updatedUser = { ...selectedUser, ...userData };
        await onUserUpdated?.(updatedUser);
        console.log('✅ User updated successfully:', updatedUser);
        handleEditDialogClose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while updating the user';
      console.error('❌ Error updating user:', errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleCreateUser = async (userData: UserCreateInput | UserUpdateInput) => {
    try {
      console.log('🔄 Creating new user:', userData);
      await onUserCreated?.(userData);
      console.log('✅ User created successfully');
      handleCreateDialogClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while creating the user';
      console.error('❌ Error creating user:', errorMessage);
      onError?.(errorMessage);
      // Don't close dialog on error, let user fix the issue
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

      {/* User Form Dialog - Edit Mode */}
      <UserFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={selectedUser}
        onSave={handleSaveUser}
        onCancel={handleEditDialogClose}
      />

      {/* User Form Dialog - Create Mode */}
      <UserFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        user={null}
        onSave={handleCreateUser}
        onCancel={handleCreateDialogClose}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeactivateDialogOpen}
        onOpenChange={setIsDeactivateDialogOpen}
        type="warning"
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${userToDeactivate?.name}? This action will prevent them from accessing the system.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        onConfirm={handleConfirmDeactivate}
        onCancel={handleDeactivateDialogClose}
      />
    </>
  );
}
