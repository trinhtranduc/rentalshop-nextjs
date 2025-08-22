'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Button, 
  EditUserForm, 
  UserPageHeader, 
  UserInfoCard, 
  UserReadOnlyInfo, 
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
import type { User, UserUpdateInput } from '@rentalshop/ui';
import { useToasts } from '@rentalshop/ui';

export default function UserPage() {
  const router = useRouter();
  const params = useParams();
  const publicId = params.publicId as string;
  
  console.log('🔍 UserPage: Component rendered with params:', params);
  console.log('🔍 UserPage: Public ID extracted:', publicId);
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Section visibility states
  const [showEditSection, setShowEditSection] = useState(false);
  
  const { toasts, showSuccess, showError, removeToast } = useToasts();
  
  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        
        console.log('🔍 UserPage: Fetching user with public ID:', publicId);
        
        // Validate public ID format (should be numeric)
        const numericId = parseInt(publicId);
        if (isNaN(numericId) || numericId <= 0) {
          console.error('❌ UserPage: Invalid public ID format:', publicId);
          setUser(null);
          return;
        }
        
        console.log('🔍 UserPage: Making API call to /api/users/' + publicId);
        
        // Use the real API to fetch user data by public ID
        const response = await usersApi.getUserByPublicId(publicId);
        
        console.log('🔍 UserPage: API response received:', response);
        
        if (response.success && response.data) {
          console.log('✅ UserPage: User fetched successfully:', response.data);
          setUser(response.data);
        } else {
          console.error('❌ UserPage: API error:', response.error);
          throw new Error(response.error || 'Failed to fetch user');
        }
        
      } catch (error) {
        console.error('❌ UserPage: Error fetching user:', error);
        // Show error state
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (publicId) {
      fetchUser();
    }
  }, [publicId]);

  // Refresh user data after updates
  const refreshUserData = async () => {
    if (!publicId) return;
    
    try {
      const response = await usersApi.getUserByPublicId(publicId);
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
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

  const handleSave = async (userData: UserUpdateInput) => {
    try {
      setIsUpdating(true);
      
      console.log('🔍 UserPage: Updating user:', userData);
      
      // Use the real API to update user by public ID
      const response = await usersApi.updateUserByPublicId(publicId, userData);
      
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
      showError('Update Failed', 'An error occurred while updating the user');
      throw error; // Re-throw so the form can handle it
    } finally {
      setIsUpdating(false);
    }
  };

  const handleActivate = async () => {
    if (!user) return;
    
    try {
      setIsUpdating(true);
      // Use publicId for activation as the API expects numeric publicId
      const response = await usersApi.activateUserByPublicId(publicId);
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
    if (!user) return;
    
    // Show confirmation dialog first
    setShowDeactivateConfirm(true);
  };

  const confirmDeactivate = async () => {
    if (!user) return;
    
    try {
      setIsUpdating(true);
      // Use publicId for deactivation as the API expects numeric publicId
      const response = await usersApi.deactivateUserByPublicId(publicId);
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
    if (!user) return;
    
    try {
      setIsUpdating(true);
      // Use publicId for deletion as the API expects numeric publicId
      const response = await usersApi.deleteUserByPublicId(publicId);
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

  if (!user) {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <UserPageHeader
          title={user.name}
          subtitle={user.email}
          onBack={() => router.push('/users')}
          backText="Back to Users"
        >
          <div className="flex gap-2">
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
        </UserPageHeader>

        {/* User Information - Read Only OR Edit Form */}
        {!showEditSection ? (
          <UserInfoCard title="User Information">
            <UserReadOnlyInfo user={user} />
          </UserInfoCard>
        ) : (
          <div className="mt-8">
            <EditUserForm
              user={user}
              onSave={handleSave}
              onCancel={() => setShowEditSection(false)}
              isSubmitting={isUpdating}
            />
          </div>
        )}



        {/* Account Management (Hidden when editing) */}
        {!showEditSection && (
          <AccountManagementCard
            user={user}
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
        description={`Are you sure you want to delete "${user.name}"? This action cannot be undone and will permanently remove all user data.`}
        confirmText={isUpdating ? 'Deleting...' : 'Delete Account'}
        onConfirm={handleDelete}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        type="warning"
        title="Deactivate User Account"
        description={`Are you sure you want to deactivate "${user.name}"? This will prevent the user from logging in and accessing the system. This action can be reversed by an administrator.`}
        confirmText={isUpdating ? 'Deactivating...' : 'Deactivate Account'}
        onConfirm={confirmDeactivate}
      />

      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        userId={user.id}
        userName={user.name}
        onSuccess={handlePasswordChangeSuccess}
        onError={handlePasswordChangeError}
      />
    </div>
  );
}
