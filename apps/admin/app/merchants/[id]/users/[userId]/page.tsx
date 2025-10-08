'use client';

import React, { useState, useEffect } from 'react';
import { merchantsApi } from '@rentalshop/utils';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  UserPageHeader,
  UserDisplayInfo,
  AccountManagementCard,
  ConfirmationDialog,
  useToast,
  UserForm } from '@rentalshop/ui';
import { Edit, ArrowLeft, UserCheck, UserX, Trash2, Key } from 'lucide-react';
import type { User, UserUpdateInput } from '@rentalshop/types';

interface UserDetailData {
  user: User;
  outlets: Array<{ id: number; name: string; address: string }>;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;
  const userId = params.userId as string;
  
  const { toastSuccess, toastError, removeToast } = useToast();
  
  const [userDetails, setUserDetails] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditSection, setShowEditSection] = useState(false);
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
        setUserDetails(data.data);
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
    setShowEditSection(!showEditSection);
  };

  const handleSave = async (userData: UserUpdateInput) => {
    try {
      setIsUpdating(true);
      
      // Use centralized API client with automatic authentication and error handling
      const response = await merchantsApi.users.update(parseInt(merchantId), parseInt(userId), userData);
      const data = await response.json();

      if (data.success) {
        // Update local state
        if (userDetails) {
          setUserDetails({
            ...userDetails,
            user: data.data
          });
        }
        setShowEditSection(false);
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
    setShowEditSection(false);
  };

  const handleActivate = async () => {
    try {
      setIsUpdating(true);
      
      // Use centralized API client with automatic authentication and error handling
      const response = await merchantsApi.users.update(parseInt(merchantId), parseInt(userId), { isActive: true });
      const data = await response.json();

      if (data.success) {
        if (userDetails) {
          setUserDetails({
            ...userDetails,
            user: data.data
          });
        }
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
        if (userDetails) {
          setUserDetails({
            ...userDetails,
            user: data.data
          });
        }
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
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/merchants/${merchantId}/users`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
            <PageTitle>{userDetails.user.name}</PageTitle>
          </div>
          <div className="flex space-x-2">
            {!showEditSection && (
              <Button
                variant="outline"
                onClick={handleEdit}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit User
              </Button>
            )}
          </div>
        </div>
      </PageHeader>

      <PageContent>
        
        {/* User Information - Read Only OR Edit Form */}
        {!showEditSection ? (
          <UserDisplayInfo user={userDetails.user} />
        ) : (
          <div className="mt-8">
            <UserForm
              mode="edit"
              user={userDetails.user}
              onSave={handleSave}
              onCancel={handleCancel}
              isSubmitting={isUpdating}
            />
          </div>
        )}

        {/* Account Management (Hidden when editing) */}
        {!showEditSection && (
          <AccountManagementCard
            user={userDetails.user}
            isUpdating={isUpdating}
            onActivate={handleActivate}
            onDeactivate={() => setShowDeactivateConfirm(true)}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        )}
      </PageContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        type="danger"
        title="Deactivate User Account"
        description={`Are you sure you want to deactivate "${userDetails.user.name}"? This will prevent the user from logging in and accessing the system.`}
        confirmText={isUpdating ? 'Deactivating...' : 'Deactivate Account'}
        onConfirm={handleDelete}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        type="warning"
        title="Deactivate User Account"
        description={`Are you sure you want to deactivate "${userDetails.user.name}"? This will prevent the user from logging in and accessing the system. This action can be reversed by an administrator.`}
        confirmText={isUpdating ? 'Deactivating...' : 'Deactivate Account'}
        onConfirm={handleDeactivate}
      />
    </PageWrapper>
  );
}
