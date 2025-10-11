'use client';

import React, { useCallback, useMemo, useTransition, useRef, useState } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  Users,
  useToast,
  UserDetailDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  UserForm,
  ConfirmationDialog
} from '@rentalshop/ui';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useUsersData, useCanExportData } from '@rentalshop/hooks';
import { usersApi } from '@rentalshop/utils';
import type { UserFilters, User, UserCreateInput, UserUpdateInput } from '@rentalshop/types';

/**
 * ✅ MODERN NEXT.JS 13+ USERS PAGE - URL STATE PATTERN
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with useUsersData hook
 * ✅ No duplicate state management
 * ✅ Smooth transitions with useTransition
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Browser back/forward support
 * ✅ Auto-refresh on URL change
 */
export default function UsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const canExport = useCanExportData();
  const [isPending, startTransition] = useTransition();
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const role = searchParams.get('role') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // ============================================================================
  // DATA FETCHING - Clean & Simple
  // ============================================================================
  
  const filtersRef = useRef<UserFilters | null>(null);
  const filters: UserFilters = useMemo(() => {
    const newFilters: UserFilters = {
      q: search || undefined,
      search: search || undefined,
      role: (role as any) || undefined,
      isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
      page,
      limit,
      sortBy,
      sortOrder
    };
    
    const filterString = JSON.stringify(newFilters);
    const prevFilterString = JSON.stringify(filtersRef.current);
    
    if (filterString === prevFilterString && filtersRef.current) {
      console.log('🔍 Page: Filters unchanged, returning cached');
      return filtersRef.current;
    }
    
    console.log('🔍 Page: Filters changed, creating new:', newFilters);
    filtersRef.current = newFilters;
    return newFilters;
  }, [search, role, status, page, limit, sortBy, sortOrder]);

  const { data, loading, error } = useUsersData({ 
    filters,
    debounceSearch: true,
    debounceMs: 500
  });

  // ============================================================================
  // URL UPDATE HELPER
  // ============================================================================
  
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    const newURL = `${pathname}?${params.toString()}`;
    console.log('🔄 updateURL: Pushing new URL:', newURL);
    
    startTransition(() => {
      router.push(newURL, { scroll: false });
    });
  }, [pathname, router, searchParams, startTransition]);

  // ============================================================================
  // FILTER HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    console.log('🔍 Page: Search changed to:', searchValue);
    updateURL({ q: searchValue, page: 1 });
  }, [updateURL]);

  const handleFiltersChange = useCallback((newFilters: Partial<UserFilters>) => {
    console.log('🔧 Page: Filters changed:', newFilters);
    
    const updates: Record<string, string | number | undefined> = { page: 1 };
    
    if ('role' in newFilters) {
      updates.role = newFilters.role as any;
    }
    if ('isActive' in newFilters) {
      if (newFilters.isActive === true) {
        updates.status = 'active';
      } else if (newFilters.isActive === false) {
        updates.status = 'inactive';
      } else {
        updates.status = undefined;
      }
    }
    if ('sortBy' in newFilters) {
      updates.sortBy = newFilters.sortBy;
    }
    if ('sortOrder' in newFilters) {
      updates.sortOrder = newFilters.sortOrder;
    }
    
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    console.log('🔧 Page: Clear all filters');
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    console.log('📄 Page: Page changed to:', newPage);
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    console.log('🔀 Page: Sort changed:', column);
    const newSortBy = column;
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  // ============================================================================
  // USER ACTION HANDLERS
  // ============================================================================
  
  const handleUserAction = useCallback(async (action: string, userId: number) => {
    console.log('🎬 User action:', action, userId);
    
    const userItem = data?.users.find(u => u.id === userId);
    
    switch (action) {
      case 'view':
        // Show detail dialog
        if (userItem) {
          setSelectedUser(userItem);
          setShowDetailDialog(true);
        }
        break;
        
      case 'edit':
        // Show edit dialog
        if (userItem) {
          setSelectedUser(userItem);
          setShowEditDialog(true);
        }
        break;
        
      case 'activate':
      case 'deactivate':
        // Toggle user active status
        if (userItem) {
          try {
            const response = await usersApi.updateUser(userId, {
              id: userId,
              isActive: !userItem.isActive
            });
            if (response.success) {
              toastSuccess(
                'User Updated',
                `User ${!userItem.isActive ? 'activated' : 'deactivated'} successfully`
              );
              router.refresh();
            } else {
              throw new Error(response.error || 'Failed to update user');
            }
          } catch (error) {
            toastError('Update Failed', (error as Error).message);
          }
        }
        break;
        
      case 'delete':
        // Show delete confirmation dialog
        if (userItem) {
          setUserToDelete(userItem);
          setShowDeleteConfirm(true);
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  }, [data?.users, router, toastSuccess, toastError]);
  
  // Handle user update from edit dialog
  const handleUserUpdate = useCallback(async (userData: UserCreateInput | UserUpdateInput) => {
    if (!selectedUser) return;
    
    try {
      const response = await usersApi.updateUser(selectedUser.id, userData as UserUpdateInput);
      if (response.success) {
        toastSuccess('User Updated', 'User has been updated successfully');
        setShowEditDialog(false);
        setSelectedUser(null);
        router.refresh();
      } else {
        throw new Error(response.error || 'Failed to update user');
      }
    } catch (error) {
      toastError('Update Failed', (error as Error).message);
      throw error;
    }
  }, [selectedUser, router, toastSuccess, toastError]);
  
  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (!userToDelete) return;
    
    try {
      const response = await usersApi.deleteUser(userToDelete.id);
      if (response.success) {
        toastSuccess('User Deleted', `User "${userToDelete.firstName} ${userToDelete.lastName}" has been deleted successfully`);
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        router.refresh();
      } else {
        throw new Error(response.error || 'Failed to delete user');
      }
    } catch (error) {
      toastError('Delete Failed', (error as Error).message);
    }
  }, [userToDelete, router, toastSuccess, toastError]);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================
  
  const userData = useMemo(() => {
    if (!data) {
      return {
        items: [],
        users: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit: 25,
        hasMore: false
      };
    }

    return {
      items: data.users,
      users: data.users,
      total: data.total,
      page: data.currentPage,
      totalPages: data.totalPages,
      limit: data.limit,
      hasMore: data.hasMore
    };
  }, [data]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && !data) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Users</PageTitle>
          <p className="text-sm text-gray-600">Manage users in the system</p>
        </PageHeader>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading users...</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Users</PageTitle>
            <p className="text-sm text-gray-600">Manage users in the system</p>
          </div>
          <div className="flex gap-3">
            {canExport && (
              <button 
                onClick={() => {
                  toastSuccess('Export Feature', 'Export functionality coming soon!');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-md flex items-center text-sm transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export
              </button>
            )}
            <button 
              onClick={() => router.push('/users/create')}
              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4 rounded-md flex items-center text-sm transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add User
            </button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0">
        <Users
          data={userData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onUserAction={handleUserAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </div>

      {/* User Detail Dialog */}
      {selectedUser && (
        <UserDetailDialog
          user={selectedUser}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
        />
      )}

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit User: {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <UserForm
              user={selectedUser}
              onSave={handleUserUpdate}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedUser(null);
              }}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title="Delete User"
        description={`Are you sure you want to delete user "${userToDelete?.firstName} ${userToDelete?.lastName}"? This action cannot be undone.`}
        confirmText="Delete User"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
      />
    </PageWrapper>
  );
}
