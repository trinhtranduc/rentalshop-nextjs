'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { 
  Users, 
  PageWrapper,
  UserDetailDialog,
  AddUserDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  UserForm,
  useToast
} from '@rentalshop/ui';
import { useAuth, useUsersData } from '@rentalshop/hooks';
import { PAGINATION } from '@rentalshop/constants';
import type { UserFilters, User, UserCreateInput, UserUpdateInput } from '@rentalshop/types';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { usersApi } from '@rentalshop/utils';

/**
 * ✅ MODERN USERS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with useUsersData hook
 * ✅ No duplicate state management
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Auto-refresh on URL change
 * ✅ Request deduplication with useDedupedApi
 */
export default function UsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const { toastSuccess, toastError } = useToast();
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const role = searchParams.get('role') || undefined;
  const status = searchParams.get('status') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_PAGE_SIZE));
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // ============================================================================
  // DATA FETCHING - Clean & Simple with Deduplication
  // ============================================================================
  
  // Memoize filters - useUsersData handles deduplication automatically
  const filters: UserFilters = useMemo(() => ({
    search: search || undefined,
    q: search || undefined,
    role: role as any,
    status,
    page,
    limit,
    sortBy,
    sortOrder
  }), [search, role, status, page, limit, sortBy, sortOrder]);

  const { data, loading, error, refetch } = useUsersData({ filters });
  
  console.log('📊 Users Page - Data state:', {
    hasData: !!data,
    usersCount: data?.users?.length || 0,
    loading,
    error: error?.message
  });

  // ============================================================================
  // URL UPDATE HELPER - Update URL = Update Everything
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
  // FILTER HANDLERS - Simple URL Updates
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    console.log('🔍 Page: Search changed to:', searchValue);
    updateURL({ q: searchValue, page: 1 }); // Reset to page 1
  }, [updateURL]);

  const handleFiltersChange = useCallback((newFilters: UserFilters) => {
    const updates: Record<string, string | number | undefined> = { page: 1 }; // Reset page
    
    if ('role' in newFilters) {
      updates.role = newFilters.role as any;
    }
    if ('status' in newFilters) {
      updates.status = newFilters.status as any;
    }
    
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    console.log('🔧 Page: Clear all filters');
    // Clear all params except keep default page
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    // Toggle sort order if clicking same column, otherwise default to asc
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: column, sortOrder: newSortOrder, page: 1 });
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
        
      case 'delete':
        // Show delete confirmation
        console.log('Delete user:', userId);
        // After delete, refresh will happen automatically via URL
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [data?.users]);
  
  // Handle user update from edit dialog
  const handleUserUpdate = useCallback(async (userData: UserCreateInput | UserUpdateInput) => {
    if (!selectedUser) return;
    
    try {
      const response = await usersApi.updateUser(selectedUser.id, userData as UserUpdateInput);
      if (response.success) {
        toastSuccess('User updated successfully');
        setShowEditDialog(false);
        setSelectedUser(null);
        refetch();
      } else {
        throw new Error(response.error || 'Failed to update user');
      }
    } catch (error) {
      toastError('Failed to update user', (error as Error).message);
      throw error;
    }
  }, [selectedUser, toastSuccess, toastError, refetch]);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================
  
  const userData = useMemo(() => {
    if (!data) {
      return {
        users: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit: PAGINATION.DEFAULT_PAGE_SIZE,
        hasMore: false
      };
    }

    return {
      users: data.users,
      total: data.total,
      page: data.page,
      totalPages: data.totalPages,
      limit: data.limit,
      hasMore: data.hasMore
    };
  }, [data]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <div className="flex-1 min-h-0 overflow-auto">
        <Users
          data={userData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onPageChange={handlePageChange}
          onSort={handleSort}
          onUserAction={handleUserAction}
          onAdd={() => setShowAddDialog(true)}
          title="User Management"
          subtitle="Manage all users across the platform"
          showExportButton={false} // Export feature - temporarily hidden, will be enabled in the future
          showAddButton={true}
          addButtonText="Add User"
          exportButtonText="Export Users"
          showStats={true}
          currentUser={currentUser}
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
        currentUser={currentUser}
        onUserCreated={async (userData) => {
          try {
            const response = await usersApi.createUser(userData);
            
            if (response.success) {
              toastSuccess('User created successfully');
              setShowAddDialog(false);
              refetch();
            } else {
              throw new Error(response.error || 'Failed to create user');
            }
          } catch (error) {
            console.error('Error creating user:', error);
            toastError('Failed to create user', error instanceof Error ? error.message : 'Unknown error');
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
              mode="edit"
              user={selectedUser}
              onSave={handleUserUpdate}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedUser(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
