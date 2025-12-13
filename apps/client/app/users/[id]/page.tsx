'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, 
  UserForm, 
  UserPageHeader, 
  UserCard, 
  UserDisplayInfo, 
  AccountManagementCard,
  ConfirmationDialog,
  PageWrapper,
  Breadcrumb,
  ChangePasswordDialog, useToast } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { 
  ArrowLeft,
  Edit, 
  UserCheck,
  UserX,
  Trash2,
  Key
} from 'lucide-react';
import { usersApi } from "@rentalshop/utils";
import { useAuth, useCommonTranslations, useUsersTranslations } from '@rentalshop/hooks';
import type { User, UserUpdateInput } from '@rentalshop/ui';

export default function UserPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { toastSuccess, removeToast } = useToast();
  const t = useCommonTranslations();
  const tu = useUsersTranslations();
  const userId = params.id as string;
  
  console.log('🔍 UserPage: Component rendered with params:', params);
  console.log('🔍 UserPage: User ID extracted:', userId);
  
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Section visibility states
  const [showEditSection, setShowEditSection] = useState(false);
  
  
  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        
        console.log('🔍 UserPage: Fetching user with ID:', userId);
        
        // Validate ID format (should be numeric)
        const numericId = parseInt(userId);
        if (isNaN(numericId) || numericId <= 0) {
          console.error('❌ UserPage: Invalid ID format:', userId);
          setUserData(null);
          return;
        }
        
        console.log('🔍 UserPage: Making API call to /api/users/' + userId);
        
        // Use the real API to fetch user data by ID
        const response = await usersApi.getUserById(numericId);
        
        console.log('🔍 UserPage: API response received:', response);
        
        if (response.success && response.data) {
          console.log('✅ UserPage: User fetched successfully:', response.data);
          setUserData(response.data);
        } else {
          console.error('❌ UserPage: API error:', response.error);
          throw new Error(response.error || 'Failed to fetch user');
        }
        
      } catch (error) {
        console.error('❌ UserPage: Error fetching user:', error);
        // Error automatically handled by useGlobalErrorHandler
        // Show error state
        setUserData(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

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
    toastSuccess(t('messages.updateSuccess'), t('messages.updateSuccess'));
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
        toastSuccess(t('messages.updateSuccess'), t('messages.updateSuccess'));
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
        toastSuccess('User Deleted', 'User account has been deleted successfully!');
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Not Found</h2>
              <p className="text-gray-600 mb-6">The user you're looking for doesn't exist or has been removed.</p>
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

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Users', href: '/users' },
    { label: userData.name }
  ];

  return (
    <PageWrapper>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/" className="mb-6" />
      
      {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{userData.name}</h1>
            <p className="text-gray-600">{userData.email}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => router.push('/users')}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {tu('actions.backToUsers')}
            </Button>
            <Button 
              onClick={handleEdit} 
              variant={showEditSection ? "outline" : "default"}
              className={showEditSection ? "" : "bg-blue-700 hover:bg-blue-700 text-white"}
            >
              <Edit className="w-4 h-4 mr-2" />
              {showEditSection ? t('buttons.cancel') : tu('editUser')}
            </Button>
            
            <Button 
              onClick={() => setShowChangePassword(true)}
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <Key className="w-4 h-4 mr-2" />
              {tu('actions.changePassword')}
            </Button>
          </div>
        </div>

        {/* User Information - Read Only OR Edit Form */}
        {!showEditSection ? (
          <UserCard user={userData} onUserAction={() => {}} />
        ) : (
          <div className="mt-8">
            <UserForm
              mode="edit"
              user={userData}
              onSave={handleSave}
              onCancel={() => setShowEditSection(false)}
              isSubmitting={isUpdating}
            />
          </div>
        )}



        {/* Account Management (Hidden when editing) */}
        {!showEditSection && (
          <AccountManagementCard
            user={userData}
            isUpdating={isUpdating}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title={tu('actions.delete')}
        description={tu('messages.confirmDelete')}
        confirmText={isUpdating ? 'Deleting...' : 'Delete Account'}
        onConfirm={handleDelete}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        type="warning"
        title={tu('actions.deactivate')}
        description={`Are you sure you want to deactivate "${userData.name}"? This will prevent the user from logging in and accessing the system. This action can be reversed by an administrator.`}
        confirmText={isUpdating ? t('labels.loading') : tu('actions.deactivate')}
        onConfirm={confirmDeactivate}
      />


      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        userId={user?.id ? parseInt(user.id.toString()) : 0}
        userName={user?.name || ''}
        onSuccess={handlePasswordChangeSuccess}
        onError={handlePasswordChangeError}
      />
    </PageWrapper>
  );
}
