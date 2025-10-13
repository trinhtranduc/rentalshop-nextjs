'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  Users,
  UsersLoading,
  useToast,
  UserDetailDialog,
  AddUserDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  UserForm,
  ConfirmationDialog,
  Button
} from '@rentalshop/ui';
import { Plus, Download } from 'lucide-react';
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
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
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
  
  // ✅ SIMPLE: Memoize filters - useDedupedApi handles deduplication
  const filters: UserFilters = useMemo(() => ({
    q: search || undefined,
    search: search || undefined,
    role: (role as any) || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
    page,
    limit,
    sortBy,
    sortOrder
  }), [search, role, status, page, limit, sortBy, sortOrder]);

  const { data, loading, error } = useUsersData({ filters });

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
    router.push(newURL, { scroll: false });
  }, [pathname, router, searchParams]);

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
  // RENDER - Show skeleton when loading initial data
  // ============================================================================

  if (loading && !data) {
    return (
      <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
        <PageHeader className="flex-shrink-0">
          <PageTitle>Users</PageTitle>
          <p className="text-sm text-gray-600">Manage users in the system</p>
        </PageHeader>
        <UsersLoading />
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
              <Button
                onClick={() => {
                  toastSuccess('Export Feature', 'Export functionality coming soon!');
                }}
                variant="default"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            <Button 
              onClick={() => setShowAddDialog(true)}
              variant="success"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-auto">
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

      {/* Add User Dialog */}
      <AddUserDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        currentUser={user}
        onUserCreated={async (userData) => {
          try {
            const response = await usersApi.createUser(userData);
            
            if (response.success) {
              toastSuccess('User Created', `User "${userData.firstName} ${userData.lastName}" has been created successfully`);
              router.refresh();
            } else {
              throw new Error(response.error || 'Failed to create user');
            }
          } catch (error) {
            console.error('Error creating user:', error);
            toastError('Error', error instanceof Error ? error.message : 'Failed to create user');
            throw error; // Re-throw to let dialog handle it
          }
        }}
        onError={(error) => {
          toastError('Error', error);
        }}
      />

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
