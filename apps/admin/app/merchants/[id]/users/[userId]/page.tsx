'use client';

import React, { useState, useEffect } from 'react';
import { merchantsApi } from '@rentalshop/utils';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  UserCard,
  AccountManagementCard,
  ConfirmationDialog,
  ChangePasswordDialog,
  Breadcrumb,
  useToast,
  UserForm,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { Edit, ArrowLeft, UserCheck, UserX, Trash2, Key } from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';
import type { User, UserUpdateInput, UserCreateInput } from '@rentalshop/types';

// API returns user object directly, not nested in { user, outlets }

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;
  const userId = params.userId as string;
  const { user: currentUser } = useAuth();
  
  const { toastSuccess, toastError, removeToast } = useToast();
  
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      
      // Use centralized API client with automatic authentication and error handling
      const response = await merchantsApi.users.get(parseInt(merchantId), parseInt(userId));
      const data = await response.json();

      if (data.success) {
        // API returns user object directly, not nested in { user, outlets }
        const user = data.data;
        // Ensure name field exists (computed from firstName + lastName)
        if (user && !user.name && user.firstName) {
          user.name = `${user.firstName} ${user.lastName || ''}`.trim();
        }
        setUserDetails(user);
      } else {
        setError(data.message || 'Failed to fetch user details');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };


  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleSave = async (userData: UserUpdateInput | UserCreateInput) => {
    try {
      setIsUpdating(true);
      
      // Use centralized API client with automatic authentication and error handling
      const response = await merchantsApi.users.update(parseInt(merchantId), parseInt(userId), userData);
      const data = await response.json();

      if (data.success) {
        // Update local state - API returns user object directly
        const updatedUser = data.data;
        // Ensure name field exists
        if (updatedUser && !updatedUser.name && updatedUser.firstName) {
          updatedUser.name = `${updatedUser.firstName} ${updatedUser.lastName || ''}`.trim();
        }
        setUserDetails(updatedUser);
        setShowEditDialog(false);
        toastSuccess('User updated', 'Changes saved successfully.');
      } else {
        const msg = data.message || 'Failed to update user';
        toastError('Update failed', msg);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toastError('Update failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setShowEditDialog(false);
  };

  const handleActivate = async () => {
    try {
      setIsUpdating(true);
      
      // Use centralized API client with automatic authentication and error handling
      const response = await merchantsApi.users.update(parseInt(merchantId), parseInt(userId), { isActive: true });
      const data = await response.json();

      if (data.success) {
        // Update local state - API returns user object directly
        const updatedUser = data.data;
        // Ensure name field exists
        if (updatedUser && !updatedUser.name && updatedUser.firstName) {
          updatedUser.name = `${updatedUser.firstName} ${updatedUser.lastName || ''}`.trim();
        }
        setUserDetails(updatedUser);
        toastSuccess('User Activated', 'User account has been activated successfully!');
      } else {
        toastError('Activation Failed', data.message || 'Failed to activate user');
      }
    } catch (error) {
      console.error('Error activating user:', error);
      toastError('Activation Failed', 'An error occurred while activating the user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setIsUpdating(true);
      
      // Use centralized API client with automatic authentication and error handling
      const response = await merchantsApi.users.update(parseInt(merchantId), parseInt(userId), { isActive: false });
      const data = await response.json();

      if (data.success) {
        // Update local state - API returns user object directly
        const updatedUser = data.data;
        // Ensure name field exists
        if (updatedUser && !updatedUser.name && updatedUser.firstName) {
          updatedUser.name = `${updatedUser.firstName} ${updatedUser.lastName || ''}`.trim();
        }
        setUserDetails(updatedUser);
        toastSuccess('User Deactivated', 'User account has been deactivated successfully!');
        setShowDeactivateConfirm(false);
      } else {
        toastError('Deactivation Failed', data.message || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      toastError('Deactivation Failed', 'An error occurred while deactivating the user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsUpdating(true);
      
      // For now, just deactivate the user instead of deleting
      // Use centralized API client with automatic authentication and error handling
      const response = await merchantsApi.users.update(parseInt(merchantId), parseInt(userId), { isActive: false });
      const data = await response.json();

      if (data.success) {
        toastSuccess('User Deactivated', 'User account has been deactivated successfully!');
        setShowDeleteConfirm(false);
        router.push(`/merchants/${merchantId}/users`);
      } else {
        toastError('Deactivation Failed', data.message || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      toastError('Deactivation Failed', 'An error occurred while deactivating the user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    toastSuccess('Password Changed', 'User password has been updated successfully!');
    setShowChangePassword(false);
  };

  const handlePasswordChangeError = (errorMessage: string) => {
    toastError('Password Change Failed', errorMessage);
  };

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Merchants', href: '/merchants' },
    { label: `Merchant ${merchantId}`, href: `/merchants/${merchantId}` },
    { label: 'Users', href: `/merchants/${merchantId}/users` },
    { label: userDetails ? (userDetails.name || `${userDetails.firstName} ${userDetails.lastName || ''}`.trim()) : 'User Details' }
  ];

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>User Details</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8">Loading user details...</div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>User Details</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8 text-red-500">Error: {error}</div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (!userDetails) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>User Details</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8">User not found</div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push(`/merchants/${merchantId}/users`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit User
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {userDetails.name || `${userDetails.firstName} ${userDetails.lastName || ''}`.trim()}
            </h1>
            <p className="text-gray-600">{userDetails.email}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleEdit} 
              variant="default"
              className="bg-blue-700 hover:bg-blue-700 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit User
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

        {/* User Information */}
        <UserCard user={userDetails} onUserAction={() => {}} />

        {/* Account Management */}
        <AccountManagementCard
          user={userDetails}
          isUpdating={isUpdating}
          onActivate={handleActivate}
          onDeactivate={() => setShowDeactivateConfirm(true)}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      </PageContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title="Deactivate User Account"
        description={`Are you sure you want to deactivate "${userDetails.name || `${userDetails.firstName} ${userDetails.lastName || ''}`.trim()}"? This will prevent the user from logging in and accessing the system.`}
        confirmText={isUpdating ? 'Deactivating...' : 'Deactivate Account'}
        onConfirm={handleDelete}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        type="warning"
        title="Deactivate User Account"
        description={`Are you sure you want to deactivate "${userDetails.name || `${userDetails.firstName} ${userDetails.lastName || ''}`.trim()}"? This will prevent the user from logging in and accessing the system. This action can be reversed by an administrator.`}
        confirmText={isUpdating ? 'Deactivating...' : 'Deactivate Account'}
        onConfirm={handleDeactivate}
      />

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        userId={userDetails.id ? parseInt(userDetails.id.toString()) : 0}
        userName={userDetails.name || `${userDetails.firstName} ${userDetails.lastName || ''}`.trim()}
        onSuccess={handlePasswordChangeSuccess}
        onError={handlePasswordChangeError}
      />

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit User: {userDetails.name || `${userDetails.firstName} ${userDetails.lastName || ''}`.trim()}
            </DialogTitle>
          </DialogHeader>
          <UserForm
            user={userDetails}
            onSave={handleSave}
            onCancel={handleCancel}
            mode="edit"
            isSubmitting={isUpdating}
            currentUser={currentUser}
          />
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
