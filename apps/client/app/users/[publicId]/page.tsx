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
  PasswordChangeDialog
} from '@rentalshop/ui';
import { 
  ArrowLeft,
  Edit, 
  Lock,
  UserCheck,
  UserX,
  Trash2
} from 'lucide-react';
import { usersApi } from '../../../lib/api/users';
import type { User, UserUpdateInput } from '@rentalshop/ui';

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
  
  // Section visibility states
  const [showEditSection, setShowEditSection] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showSecuritySection, setShowSecuritySection] = useState(false);
  
  // Password form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

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

  const handleEdit = () => {
    setShowEditSection(!showEditSection);
  };

  const handlePasswordChange = () => {
    setShowPasswordSection(!showPasswordSection);
  };

  const handleSecurity = () => {
    setShowSecuritySection(!showSecuritySection);
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
        
        // Show success message (you could add a toast notification here)
        alert('User updated successfully!');
      } else {
        console.error('❌ UserPage: API error:', response.error);
        throw new Error(response.error || 'Failed to update user');
      }
      
    } catch (error) {
      console.error('❌ UserPage: Error updating user:', error);
      throw error; // Re-throw so the form can handle it
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordSubmit = async (passwordData: {
    currentPassword?: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    try {
      console.log('🔐 UserPage: Changing password for user:', publicId);
      
      const response = await usersApi.changePasswordByPublicId(publicId, passwordData);
      
      if (response.success) {
        console.log('✅ UserPage: Password changed successfully');
        
        // Clear password form
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        
        // Hide password section
        setShowPasswordSection(false);
        
        // Show success message
        alert('Password changed successfully!');
      } else {
        console.error('❌ UserPage: Password change failed:', response.error);
        throw new Error(response.error || 'Failed to change password');
      }
      
    } catch (error) {
      console.error('❌ UserPage: Error changing password:', error);
      throw error;
    }
  };

  const handleActivate = async () => {
    if (!user) return;
    
    try {
      setIsUpdating(true);
      const response = await usersApi.activateUser(user.id);
      if (response.success) {
        // Refresh user data
        await refreshUserData();
        alert('User activated successfully!');
      }
    } catch (error) {
      console.error('Error activating user:', error);
      alert('Failed to activate user');
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
      const response = await usersApi.deactivateUser(user.id);
      if (response.success) {
        // Refresh user data
        await refreshUserData();
        alert('User deactivated successfully!');
        setShowDeactivateConfirm(false);
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert('Failed to deactivate user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    try {
      setIsUpdating(true);
      const response = await usersApi.deleteUser(user.id);
      if (response.success) {
        router.push('/users');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
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
            
            {!showEditSection && (
              <Button 
                variant="outline"
                onClick={handlePasswordChange}
              >
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            )}
          </div>
        </UserPageHeader>

        {/* User Information - Read Only OR Edit Form */}
        {!showEditSection ? (
          <UserInfoCard title="User Information">
            <UserReadOnlyInfo user={user} />
          </UserInfoCard>
        ) : (
          <UserInfoCard title="Edit User Information">
            <EditUserForm
              user={user}
              onSave={handleSave}
              onCancel={() => setShowEditSection(false)}
              isSubmitting={isUpdating}
              onPasswordChange={handlePasswordSubmit}
              onDeactivate={handleDeactivate}
            />
          </UserInfoCard>
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

      {/* Password Change Dialog */}
      <PasswordChangeDialog
        open={showPasswordSection}
        onOpenChange={setShowPasswordSection}
        userName={user.name}
        onSubmit={handlePasswordSubmit}
        isSubmitting={isUpdating}
      />
    </div>
  );
}
