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
import { useAuth, useUsersData, useCanExportData, useCommonTranslations, useUsersTranslations } from '@rentalshop/hooks';
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
  const t = useCommonTranslations();
  const tu = useUsersTranslations();
  const canExport = useCanExportData();
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToActivate, setUserToActivate] = useState<User | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);

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
        // Show activate confirmation dialog
        if (userItem) {
          setUserToActivate(userItem);
          setShowActivateConfirm(true);
        }
        break;
        
      case 'deactivate':
        // Show deactivate confirmation dialog
        if (userItem) {
          setUserToDeactivate(userItem);
          setShowDeactivateConfirm(true);
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
        toastSuccess(tu('messages.updateSuccess'), tu('messages.updateSuccess'));
        setShowEditDialog(false);
        setSelectedUser(null);
        router.refresh();
      } else {
        throw new Error(response.error || tu('messages.updateFailed'));
      }
    } catch (error) {
      toastError(tu('messages.updateFailed'), (error as Error).message);
      throw error;
    }
  }, [selectedUser, router, toastSuccess, toastError]);
  
  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (!userToDelete) return;
    
    try {
      const response = await usersApi.deleteUser(userToDelete.id);
      if (response.success) {
        toastSuccess(tu('messages.deleteSuccess'), `${tu('messages.deleteSuccess')} - "${userToDelete.firstName} ${userToDelete.lastName}"`);
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        router.refresh();
      } else {
        throw new Error(response.error || tu('messages.deleteFailed'));
      }
    } catch (error) {
      toastError(tu('messages.deleteFailed'), (error as Error).message);
    }
  }, [userToDelete, router, toastSuccess, toastError]);
  
  // Handle activate confirmation
  const handleConfirmActivate = useCallback(async () => {
    if (!userToActivate) return;
    
    try {
      const response = await usersApi.updateUser(userToActivate.id, {
        id: userToActivate.id,
        isActive: true
      });
      if (response.success) {
        toastSuccess(tu('messages.activateSuccess'), `${tu('messages.activateSuccess')} - "${userToActivate.firstName} ${userToActivate.lastName}"`);
        setShowActivateConfirm(false);
        setUserToActivate(null);
        router.refresh();
      } else {
        throw new Error(response.error || tu('messages.activateFailed'));
      }
    } catch (error) {
      toastError(tu('messages.activateFailed'), (error as Error).message);
    }
  }, [userToActivate, router, toastSuccess, toastError, tu]);
  
  // Handle deactivate confirmation
  const handleConfirmDeactivate = useCallback(async () => {
    if (!userToDeactivate) return;
    
    try {
      const response = await usersApi.updateUser(userToDeactivate.id, {
        id: userToDeactivate.id,
        isActive: false
      });
      if (response.success) {
        toastSuccess(tu('messages.deactivateSuccess'), `${tu('messages.deactivateSuccess')} - "${userToDeactivate.firstName} ${userToDeactivate.lastName}"`);
        setShowDeactivateConfirm(false);
        setUserToDeactivate(null);
        router.refresh();
      } else {
        throw new Error(response.error || tu('messages.deactivateFailed'));
      }
    } catch (error) {
      toastError(tu('messages.deactivateFailed'), (error as Error).message);
    }
  }, [userToDeactivate, router, toastSuccess, toastError, tu]);

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
          <PageTitle>{tu('title')}</PageTitle>
          <p className="text-sm text-gray-600">{tu('messages.loadingUsers')}</p>
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
            <PageTitle>{tu('title')}</PageTitle>
            <p className="text-sm text-gray-600">{tu('title')}</p>
          </div>
          <div className="flex gap-3">
            {/* Export feature - temporarily hidden, will be enabled in the future */}
            {/* {canExport && (
              <Button
                onClick={() => {
                  toastSuccess(t('labels.info'), tc('messages.comingSoon'));
                }}
                variant="default"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('buttons.export')}
              </Button>
            )} */}
            <Button 
              onClick={() => setShowAddDialog(true)}
              variant="success"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {tu('addUser')}
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
              toastSuccess(tu('messages.createSuccess'), `${tu('messages.createSuccess')} - "${userData.firstName} ${userData.lastName}"`);
              router.refresh();
            } else {
              throw new Error(response.error || tu('messages.createFailed'));
            }
          } catch (error) {
            console.error('Error creating user:', error);
            toastError(t('labels.error'), error instanceof Error ? error.message : tu('messages.createFailed'));
            throw error; // Re-throw to let dialog handle it
          }
        }}
        onError={(error) => {
          toastError(t('labels.error'), error);
        }}
      />

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {tu('editUser')}: {selectedUser?.firstName} {selectedUser?.lastName}
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
        title={tu('actions.delete')}
        description={tu('messages.confirmDelete')}
        confirmText={tu('actions.delete')}
        cancelText={t('buttons.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
      />

      {/* Activate User Confirmation Dialog */}
      <ConfirmationDialog
        open={showActivateConfirm}
        onOpenChange={setShowActivateConfirm}
        type="info"
        title={tu('messages.confirmActivateAccount')}
        description={userToActivate ? `${tu('messages.confirmActivate')} "${userToActivate.firstName} ${userToActivate.lastName}"? ${tu('messages.confirmActivateDetails')}` : ''}
        confirmText={tu('actions.activateAccount')}
        cancelText={t('buttons.cancel')}
        onConfirm={handleConfirmActivate}
        onCancel={() => {
          setShowActivateConfirm(false);
          setUserToActivate(null);
        }}
      />

      {/* Deactivate User Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        type="warning"
        title={tu('messages.confirmDeactivateAccount')}
        description={userToDeactivate ? `${tu('messages.confirmDeactivate')} "${userToDeactivate.firstName} ${userToDeactivate.lastName}"? ${tu('messages.confirmDeactivateDetails')}` : ''}
        confirmText={tu('actions.deactivateAccount')}
        cancelText={t('buttons.cancel')}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => {
          setShowDeactivateConfirm(false);
          setUserToDeactivate(null);
        }}
      />
    </PageWrapper>
  );
}
