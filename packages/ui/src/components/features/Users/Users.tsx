'use client';

import React, { useMemo, useCallback } from 'react';
import { 
  PageWrapper,
  PageContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  useToast,
  UserPageHeader,
  UserFilters as UserFiltersComponent,
  UserTable,
  UserDetailDialog,
  UserForm,
  Pagination,
  EmptyState,
  StatsOverview
} from '@rentalshop/ui';
import { 
  User as UserIcon, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import type { User, UserCreateInput, UserUpdateInput } from '@rentalshop/types';
import { useUserManagement, type UseUserManagementOptions } from '@rentalshop/hooks';
import { getRoleBadge, getStatusBadge, calculateUserStats } from '@rentalshop/utils';

export interface UsersProps {
  title?: string;
  subtitle?: string;
  showExportButton?: boolean;
  showAddButton?: boolean;
  addButtonText?: string;
  exportButtonText?: string;
  showStats?: boolean;
  useSearchUsers?: boolean;
  initialLimit?: number;
  currentUser?: User | null;
  onExport?: () => void;
  className?: string;
}

export const Users: React.FC<UsersProps> = ({
  title = "User Management",
  subtitle = "Manage users in the system",
  showExportButton = true,
  showAddButton = true,
  addButtonText = "Add User",
  exportButtonText = "Export Users",
  showStats = false,
  useSearchUsers = false,
  initialLimit = 10,
  currentUser,
  onExport,
  className = ""
}) => {
  console.log('🔄 Users component re-rendered');
  console.log('🔄 Props:', { title, subtitle, showExportButton, showAddButton, addButtonText, exportButtonText, showStats, useSearchUsers, initialLimit, currentUser: !!currentUser, onExport: !!onExport, className });
  
  const { toastSuccess, toastError, toastInfo, removeToast } = useToast();
  
  // Use the shared user management hook - memoize options to prevent re-mounts
  const userManagementOptions: UseUserManagementOptions = useMemo(() => ({
    initialLimit,
    useSearchUsers,
    enableStats: showStats
  }), [initialLimit, useSearchUsers, showStats]);
  
  const {
    users,
    loading,
    selectedUser,
    showUserDetail,
    showCreateForm,
    showEditDialog,
    pagination,
    filteredUsers,
    filters,
    stats,
    handleUserRowAction,
    handleAddUser,
    handleExportUsers,
    handleFiltersChange,
    handleSearchChange,
    handleClearFilters,
    handlePageChangeWithFetch,
    handleUserCreated,
    handleUserUpdatedAsync,
    handleUserUpdated,
    handleUserError,
    setShowUserDetail,
    setShowCreateForm,
    setShowEditDialog
  } = useUserManagement(userManagementOptions);

  // Enhanced handlers with toast notifications
  const handleUserCreatedWithToast = async (userData: UserCreateInput | UserUpdateInput) => {
    try {
      await handleUserCreated(userData as UserCreateInput);
      toastSuccess('User Created', 'User has been created successfully.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toastError('Creation Failed', errorMessage);
      // Don't re-throw - error already handled
    }
  };

  const handleUserUpdatedWithToast = async (userData: UserUpdateInput) => {
    try {
      await handleUserUpdatedAsync(userData);
      toastSuccess('User Updated', 'User information has been updated successfully.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toastError('Update Failed', errorMessage);
      // Don't re-throw - error already handled
    }
  };

  const handleExportWithToast = () => {
    if (onExport) {
      onExport();
    } else {
      handleExportUsers();
      toastInfo('Export', 'Export functionality coming soon!');
    }
  };

  const handleUserUpdatedWithToastCallback = (updatedUser: User) => {
    handleUserUpdated(updatedUser);
    const fullName = `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim();
    toastSuccess('User Updated', `User "${fullName}" has been updated successfully.`);
  };

  const handleUserErrorWithToast = (errorMessage: string) => {
    handleUserError(errorMessage);
    toastError('Error', errorMessage);
  };

  // Loading state
  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-bg-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageContent className={className}>
        {/* Page Header */}
        <UserPageHeader
          title={title}
          subtitle={subtitle}
          showExportButton={showExportButton}
          showAddButton={showAddButton}
          onExport={handleExportWithToast}
          onAdd={handleAddUser}
          addButtonText={addButtonText}
          exportButtonText={exportButtonText}
          className="mb-6"
        />

        {/* Stats Overview - Only show if enabled */}
        {showStats && stats && (
          <StatsOverview
            stats={[
              {
                label: 'Total Users',
                value: stats.totalUsers,
                icon: UserIcon,
                color: 'text-blue-600',
                bgColor: 'bg-blue-100'
              },
              {
                label: 'Active Users',
                value: stats.activeUsers,
                icon: CheckCircle,
                color: 'text-green-600',
                bgColor: 'bg-green-100'
              },
              {
                label: 'Inactive Users',
                value: stats.inactiveUsers,
                icon: XCircle,
                color: 'text-gray-600',
                bgColor: 'bg-gray-100'
              },
              {
                label: 'Verified Users',
                value: stats.verifiedUsers,
                icon: CheckCircle,
                color: 'text-green-600',
                bgColor: 'bg-green-100'
              }
            ]}
            className="mb-8"
          />
        )}

        {/* Search and Filters */}
        <UserFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
        />

        {/* Users List */}
        {filteredUsers.length > 0 ? (
          <div className="mb-6">
            <UserTable
              users={filteredUsers}
              onUserAction={handleUserRowAction}
              className="py-4"
            />
          </div>
        ) : (
          <div className="mb-6">
            <EmptyState
              icon={UserIcon}
              title="No users found"
              description={
                filters.search || filters.role || filters.status
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first user'
              }
              actionLabel="Add User"
              onAction={() => setShowCreateForm(true)}
            />
          </div>
        )}

        {/* Pagination - only show when there are results */}
        {filteredUsers.length > 0 && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={handlePageChangeWithFetch}
            itemName="users"
          />
        )}
      </PageContent>
      {/* User Edit Dialog */}
      {selectedUser && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information for {`${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()}
              </DialogDescription>
            </DialogHeader>
            
            {/* 🔍 DEBUG: Log selectedUser data */}
            {console.log('🔍 Users.tsx: selectedUser for edit dialog:', selectedUser as any)}
            {console.log('🔍 Users.tsx: selectedUser.role:', (selectedUser as any).role, 'Type:', typeof (selectedUser as any).role)}
            {console.log('🔍 Users.tsx: selectedUser.merchantId:', (selectedUser as any).merchantId)}
            {console.log('🔍 Users.tsx: selectedUser.outletId:', (selectedUser as any).outletId)}
            
            <UserForm
              mode="edit"
              user={selectedUser}
              onSave={handleUserUpdatedWithToast as any}
              onCancel={() => setShowEditDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* User Detail Dialog (View Only) */}
      <UserDetailDialog
        open={showUserDetail}
        onOpenChange={setShowUserDetail}
        user={selectedUser}
        onUserUpdated={handleUserUpdatedWithToastCallback}
        onError={handleUserErrorWithToast}
      />

      {/* Create User Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with appropriate role and organization assignment.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            mode="create"
            onSave={handleUserCreatedWithToast as any}
            onCancel={() => setShowCreateForm(false)}
            currentUser={currentUser}
          />
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
};

export default Users;