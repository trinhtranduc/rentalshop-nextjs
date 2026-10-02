'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button, 
  UserForm, 
  UserBadges,
  UserInfoCard,
  UserAccountPanel,
  ConfirmationDialog,
  PageWrapper,
  Breadcrumb,
  ChangePasswordDialog, useToast } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { ArrowLeft, Edit, Key } from 'lucide-react';
import { usersApi } from "@rentalshop/utils";
import { useAuth, useCommonTranslations, useUsersTranslations, useDedupedApi } from '@rentalshop/hooks';
import type { User, UserUpdateInput } from '@rentalshop/ui';

export default function UserPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess, removeToast } = useToast();
  const t = useCommonTranslations();
  const tu = useUsersTranslations();
  const userId = params.id as string;
  
  
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Section visibility states
  // "Sửa" in the list opens this page with ?edit=1
  const [showEditSection, setShowEditSection] = useState(searchParams?.get('edit') === '1');
  
  
  // ============================================================================
  // FETCH USER DETAILS - Using Official useDedupedApi Hook
  // ============================================================================
  // ✅ OFFICIAL PATTERN: useDedupedApi hook (inspired by TanStack Query & SWR)
  const { 
    data: userDataFromApi, 
    loading: userLoading, 
    error: userError 
  } = useDedupedApi({
    filters: { userId },
    fetchFn: async () => {
      // Validate ID format (should be numeric)
      const numericId = parseInt(userId);
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Invalid user ID format');
      }
      
      const response = await usersApi.getUserById(numericId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch user');
      }
      
      return response.data;
    },
    enabled: !!userId,
    staleTime: 60000, // 60 seconds cache
    cacheTime: 300000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Sync user data to local state
  useEffect(() => {
    setUserData(userDataFromApi || null);
    setIsLoading(userLoading);
  }, [userDataFromApi, userLoading]);

  // Refresh user data after updates
  const refreshUserData = async () => {
    if (!userId) return;
    
    try {
      const numericId = parseInt(userId);
      if (isNaN(numericId) || numericId <= 0) {
        console.error('Invalid user ID format:', userId);
        return;
      }
      
      const response = await usersApi.getUserById(numericId);
      if (response.success && response.data) {
        setUserData(response.data);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      // Error automatically handled by useGlobalErrorHandler
    }
  };

  const handlePasswordChangeSuccess = () => {
    toastSuccess(tu('messages.passwordChangeSuccess'), tu('messages.passwordChangeSuccess'));
  };

  const handlePasswordChangeError = (errorMessage: string) => {
    // Error automatically handled by useGlobalErrorHandler
  };

  const handleEdit = () => {
    setShowEditSection(!showEditSection);
  };

  const handleSave = async (userData: any) => {
    try {
      setIsUpdating(true);
      
      console.log('🔍 UserPage: Updating user:', userData);
      
      // Validate user ID
      const numericId = parseInt(userId);
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Invalid user ID format');
      }
      
      // Ensure we have an id for the update
      const updateData: UserUpdateInput = {
        ...userData,
        id: numericId
      };
      
      // Use the real API to update user by public ID
      const response = await usersApi.updateUserByPublicId(numericId, updateData);
      
      if (response.success) {
        console.log('✅ UserPage: User updated successfully:', response.data);
        
        // Refresh user data to show updated information
        await refreshUserData();
        
        // Hide edit section after successful update
        setShowEditSection(false);
        
        // Show success message
        toastSuccess(tu('messages.updateSuccess'), tu('messages.updateSuccess'));
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (err) {
      console.error('❌ UserPage: Error updating user:', err);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setIsUpdating(false);
    }
  };

  const handleActivate = async () => {
    if (!userData) return;
    
    try {
      setIsUpdating(true);
      // Use dedicated activateUser API method
      const response = await usersApi.activateUser(userData.id);
      if (response.success) {
        // Refresh user data
        await refreshUserData();
        toastSuccess(tu('messages.activateSuccess'), tu('messages.activateSuccess'));
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (err) {
      console.error('Error activating user:', err);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!userData) return;
    
    // Show confirmation dialog first
    setShowDeactivateConfirm(true);
  };

  const confirmDeactivate = async () => {
    if (!userData) return;
    
    try {
      setIsUpdating(true);
      // Use dedicated deactivateUser API method
      const response = await usersApi.deactivateUser(userData.id);
      if (response.success) {
        // Refresh user data
        await refreshUserData();
        toastSuccess(tu('messages.deactivateSuccess'), tu('messages.deactivateSuccess'));
        setShowDeactivateConfirm(false);
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (err) {
      console.error('Error deactivating user:', err);
      // Error automatically handled by useGlobalErrorHandler
    } finally{
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!userData) return;
    
    try {
      setIsUpdating(true);
      // Use id for deletion as the API expects numeric id
      const response = await usersApi.deleteUser(userData.id);
      if (response.success) {
        toastSuccess(tu('messages.deleteSuccess'), tu('messages.deleteSuccess'));
        router.push('/users');
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (err) {
      console.error('Error deleting user:', err);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{tu('messages.noUsers')}</h2>
              <Button onClick={() => router.push('/users')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {tu('actions.backToUsers')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    userData.name || [(userData as any).firstName, (userData as any).lastName].filter(Boolean).join(' ').trim() || userData.email;

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: tu('title'), href: '/users' },
    { label: displayName }
  ];

  return (
    <PageWrapper>
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/" className="mb-4" />

      {/* Header: who, what role, and the two everyday actions */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="ghost" onClick={() => router.push('/users')} size="sm" className="h-9 w-9 shrink-0 p-0" aria-label={tu('actions.backToUsers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            {showEditSection && <p className="text-xs text-gray-600">{tu('actions.editUser')}</p>}
            <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{displayName}</h1>
            <div className="mt-1">
              <UserBadges user={userData} />
            </div>
          </div>
        </div>
        {!showEditSection && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowChangePassword(true)} variant="outline">
              <Key className="mr-2 h-4 w-4" />
              {tu('actions.changePassword')}
            </Button>
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              {tu('actions.edit')}
            </Button>
          </div>
        )}
      </div>

      {/* Same two columns in view and edit: the person in the main column, the account beside it */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0">
          {!showEditSection ? (
            <UserInfoCard user={userData} />
          ) : (
            <UserForm
              mode="edit"
              layout="page"
              user={userData}
              onSave={handleSave}
              onCancel={() => setShowEditSection(false)}
              isSubmitting={isUpdating}
            />
          )}
        </div>
        <aside className="min-w-0 lg:sticky lg:top-4">
          <UserAccountPanel
            user={userData}
            isUpdating={isUpdating}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        </aside>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title={tu('messages.confirmDeleteAccount')}
        description={`${displayName}: ${tu('messages.confirmDeleteDetails')}`}
        confirmText={isUpdating ? tu('actions.deleting') : tu('actions.deleteAccount')}
        onConfirm={handleDelete}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        type="warning"
        title={tu('messages.confirmDeactivateAccount')}
        description={`${tu('messages.confirmDeactivate')} "${displayName}"? ${tu('messages.confirmDeactivateDetails')}`}
        confirmText={isUpdating ? tu('actions.deactivating') : tu('actions.deactivateAccount')}
        onConfirm={confirmDeactivate}
      />


      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        // The user on this page, not the signed-in user (that changed the wrong password)
        userId={userData.id}
        userName={displayName}
        onSuccess={handlePasswordChangeSuccess}
        onError={handlePasswordChangeError}
      />
    </PageWrapper>
  );
}
