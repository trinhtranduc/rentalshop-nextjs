import React, { useState } from 'react';
import { 
  UserFilters, 
  UserGrid, 
  UserTable, 
  UserPagination,
  UserFormDialog,
  UserActions
} from './components';
import { ToastContainer, useToasts } from '../../ui/toast';
import type { UserData, UserFilters as UserFiltersType, UserCreateInput, UserUpdateInput } from './types';
import { User } from './types';
import { Button } from '@rentalshop/ui';
import { Grid3X3, List, Plus } from 'lucide-react';

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
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const { toasts, showSuccess, showError, removeToast } = useToasts();

  const handleAddUser = () => {
    setIsAddUserDialogOpen(true);
  };

  const handleUserCreated = async (userData: UserCreateInput | UserUpdateInput) => {
    try {
      console.log('🔄 Users component: handleUserCreated called with:', userData);
      
      // Call the parent handler
      if (onUserCreated) {
        await onUserCreated(userData);
        console.log('✅ Parent handler completed successfully');
      }
      
      // Show success toast
      console.log('🎉 Showing success toast...');
      showSuccess('User Created', 'New user has been created successfully');
      console.log('✅ Success toast triggered');
      
      // Close the dialog
      setIsAddUserDialogOpen(false);
    } catch (error) {
      console.error('❌ Error in handleUserCreated:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while creating the user';
      
      // Show error toast
      console.log('🚨 Showing error toast...');
      showError('User Creation Failed', errorMessage);
      console.log('✅ Error toast triggered');
      
      // Call parent error handler
      onError?.(errorMessage);
      
      // Don't close dialog on error, let user fix the issue
      throw error;
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
        {/* Add User Button and View Mode Toggle */}
        <div className="flex justify-between items-center">
          <Button
            onClick={handleAddUser}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('table')}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="w-4 h-4" />
              Grid
            </Button>
          </div>
        </div>
        
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

        {/* Add User Dialog - Direct from Add Button */}
        <UserFormDialog
          open={isAddUserDialogOpen}
          onOpenChange={setIsAddUserDialogOpen}
          user={null}
          onSave={handleUserCreated}
          onCancel={() => setIsAddUserDialogOpen(false)}
        />

        {/* User Actions for View, Edit, and Deactivate */}
        <UserActions
          onAction={onUserAction}
          onUserCreated={onUserCreated}
          onUserUpdated={onUserUpdated}
          onError={onError}
        />
      </div>

      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}

export default Users;
