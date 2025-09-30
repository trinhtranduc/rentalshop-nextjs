'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Button, 
  UserForm, 
  UserPageHeader, 
  UserCard, 
  UserDisplayInfo, 
  AccountManagementCard,
  ConfirmationDialog,
  ToastContainer,
  ChangePasswordDialog
} from '@rentalshop/ui';
import { 
  ArrowLeft,
  Edit, 
  UserCheck,
  UserX,
  Trash2,
  Key
} from 'lucide-react';
import { usersApi } from "@rentalshop/utils";
import { useAuth, useSimpleErrorHandler } from '@rentalshop/hooks';
import { useToasts } from '@rentalshop/ui';
import type { User, UserUpdateInput } from '@rentalshop/ui';

export default function UserPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { handleError } = useSimpleErrorHandler();
  const { showSuccess, showError, toasts, removeToast } = useToasts();
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
        handleError(error);
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
      handleError(error);
    }
  };

  const handlePasswordChangeSuccess = () => {
    showSuccess('Password Changed', 'User password has been changed successfully!');
  };

  const handlePasswordChangeError = (error: string) => {
    showError('Password Change Failed', error);
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
        showSuccess('User Updated', 'User information has been updated successfully!');
      } else {
        console.error('❌ UserPage: API error:', response.error);
        showError('Update Failed', response.error || 'Failed to update user');
        throw new Error(response.error || 'Failed to update user');
      }
      
    } catch (error) {
      console.error('❌ UserPage: Error updating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while updating the user';
      showError('Update Failed', errorMessage);
      // Don't re-throw - let toast handle the error display
    } finally {
      setIsUpdating(false);
    }
  };

  const handleActivate = async () => {
    if (!userData) return;
    
    try {
      setIsUpdating(true);
      // Use id for activation as the API expects numeric id
      const response = await usersApi.activateUserByPublicId(userData.id);
      if (response.success) {
        // Refresh user data
        await refreshUserData();
        showSuccess('User Activated', 'User account has been activated successfully!');
      } else {
        showError('Activation Failed', response.error || 'Failed to activate user');
      }
    } catch (error) {
      console.error('Error activating user:', error);
      showError('Activation Failed', 'An error occurred while activating the user');
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
      // Use id for deactivation as the API expects numeric id
      const response = await usersApi.deactivateUserByPublicId(userData.id);
      if (response.success) {
        // Refresh user data
        await refreshUserData();
        showSuccess('User Deactivated', 'User account has been deactivated successfully!');
        setShowDeactivateConfirm(false);
      } else {
        showError('Deactivation Failed', response.error || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      showError('Deactivation Failed', 'An error occurred while deactivating the user');
    } finally {
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
        showSuccess('User Deleted', 'User account has been deleted successfully!');
        router.push('/users');
      } else {
        showError('Deletion Failed', response.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Deletion Failed', 'An error occurred while deleting the user');
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
                Back to Users
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              Back to Users
            </Button>
            <Button 
              onClick={handleEdit} 
              variant={showEditSection ? "outline" : "default"}
              className={showEditSection ? "" : "bg-blue-600 hover:bg-blue-700 text-white"}
            >
              <Edit className="w-4 h-4 mr-2" />
              {showEditSection ? 'Cancel Edit' : 'Edit User'}
            </Button>
            
            <Button 
              onClick={() => setShowChangePassword(true)}
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <Key className="w-4 h-4 mr-2" />
              Change Password
            </Button>
          </div>
        </div>

        {/* User Information - Read Only OR Edit Form */}
        {!showEditSection ? (
          <UserCard user={userData} onUserAction={() => {}} />
        ) : (
          <div className="mt-8">
            <UserForm
              user={userData}
              onSave={handleSave}
              onCancel={() => setShowEditSection(false)}
              isSubmitting={isUpdating}
              mode="edit"
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
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title="Delete User Account"
        description={`Are you sure you want to delete "${userData.name}"? This action cannot be undone and will permanently remove all user data.`}
        confirmText={isUpdating ? 'Deleting...' : 'Delete Account'}
        onConfirm={handleDelete}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        type="warning"
        title="Deactivate User Account"
        description={`Are you sure you want to deactivate "${userData.name}"? This will prevent the user from logging in and accessing the system. This action can be reversed by an administrator.`}
        confirmText={isUpdating ? 'Deactivating...' : 'Deactivate Account'}
        onConfirm={confirmDeactivate}
      />

      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        userId={user?.id ? parseInt(user.id.toString()) : 0}
        userName={user?.name || ''}
        onSuccess={handlePasswordChangeSuccess}
        onError={handlePasswordChangeError}
      />
    </div>
  );
}
