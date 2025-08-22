import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserFilters } from './components/UserFilters';
import { UserGrid } from './components/UserGrid';
import { UserTable } from './components/UserTable';
import { UserPagination } from './components/UserPagination';
import { ToastContainer, useToasts, Button } from '@rentalshop/ui';
import type { UserFilters as UserFiltersType, UserCreateInput, UserUpdateInput, User } from '@rentalshop/types';
import { Grid, List, Plus } from 'lucide-react';

// Define UserData interface locally since it's not exported from types
interface UserData {
  users: User[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

interface UsersProps {
  data: UserData;
  filters: UserFiltersType;
  viewMode: 'grid' | 'table';
  onFiltersChange: (filters: UserFiltersType) => void;
  onSearchChange: (searchValue: string) => void;
  onClearFilters?: () => void;
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onUserAction: (action: string, userId: string) => void;
  onPageChange: (page: number) => void;
  onUserCreated?: (user: UserCreateInput | UserUpdateInput) => Promise<void>;
  onUserUpdated?: (user: User) => Promise<void>;
  onError?: (error: string) => void;
}

export function Users({ 
  data, 
  filters, 
  viewMode, 
  onFiltersChange, 
  onSearchChange,
  onClearFilters,
  onViewModeChange, 
  onUserAction, 
  onPageChange,
  onUserCreated,
  onUserUpdated,
  onError
}: UsersProps) {
  const router = useRouter();
  const { toasts, showSuccess, showError, removeToast } = useToasts();

  // Listen for manual refresh requests from the dialog
  useEffect(() => {
    const handleRefreshRequest = () => {
      console.log('🔄 Manual refresh requested from dialog');
      // Trigger a refresh of the user list
      // This will be handled by the parent page component
      window.dispatchEvent(new CustomEvent('force-refresh-users'));
    };

    window.addEventListener('refresh-users-list', handleRefreshRequest);
    return () => window.removeEventListener('refresh-users-list', handleRefreshRequest);
  }, []);

  const handleAddUser = () => {
    console.log('🔍 Users: Add User button clicked, navigating to add user page');
    router.push('/users/add');
  };

  const handleUserCreated = async (userInput: UserCreateInput | UserUpdateInput) => {
    try {
      console.log('🔄 Users component: handleUserCreated called with:', userInput);
      console.log('🔍 Users: About to call parent onUserCreated handler');
      
      // Call the parent handler
      if (onUserCreated) {
        console.log('🔍 Users: Calling parent onUserCreated handler');
        await onUserCreated(userInput);
        console.log('✅ Parent handler completed successfully');
      }
      
      // Show success toast
      showSuccess('User Created', 'User has been created successfully!');
      console.log('🔍 Users: Success toast shown');
      
    } catch (error) {
      console.error('❌ Error in handleUserCreated:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while creating the user';
      
      // Show error toast
      showError('User Creation Failed', errorMessage);
      
      // Call parent error handler
      onError?.(errorMessage);
      
      // Don't re-throw the error - let the form handle it
      // This keeps the form open so user can fix the error
      console.log('🔍 Users: Error handled, not re-throwing to keep form open');
    }
  };

  const handleUserUpdated = async (user: User) => {
    try {
      console.log('🔄 Users component: handleUserUpdated called with:', user);
      
      if (onUserUpdated) {
        await onUserUpdated(user);
        console.log('✅ Parent handler completed successfully');
      }
      
      // Show success toast
      showSuccess('User Updated', 'User information has been updated successfully');
    } catch (error) {
      console.error('❌ Error in handleUserUpdated:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while updating the user';
      
      // Show error toast
      showError('User Update Failed', errorMessage);
      
      // Call parent error handler
      onError?.(errorMessage);
      
      // Re-throw to let the form handle the error
      throw error;
    }
  };

  const handleError = (error: string) => {
    console.error('❌ Error in Users component:', error);
    showError('Operation Failed', error);
    onError?.(error);
  };

  return (
    <>
      <div className="space-y-6">        
        <UserFilters 
          filters={filters}
          onFiltersChange={onFiltersChange}
          onSearchChange={onSearchChange}
          onClearFilters={onClearFilters}
        />
        
        {viewMode === 'grid' ? (
          <UserGrid 
            users={data.users}
            onUserAction={onUserAction}
          />
        ) : (
          <UserTable 
            users={data.users}
            onUserAction={onUserAction}
          />
        )}
        
        <UserPagination 
          currentPage={data.currentPage}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={onPageChange}
        />

        {/* Add User functionality now handled by navigation to /users/add */}

        {/* User Actions are now handled directly in the UserTable component */}
      </div>

      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}

export default Users;
