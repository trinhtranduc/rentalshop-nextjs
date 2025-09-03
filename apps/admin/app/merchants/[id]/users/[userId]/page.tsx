'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  UserPageHeader,
  UserDisplayInfo,
  AccountManagementCard,
  ConfirmationDialog,
  ToastContainer,
  useToasts,
  UserForm
} from '@rentalshop/ui';
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
  
  const { toasts, showSuccess, showError, removeToast } = useToasts();
  
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
      
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        setError('Authentication required');
        return;
      }

      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserDetails(data.data);
        } else {
          setError(data.message || 'Failed to fetch user details');
        }
      } else {
        console.error('Failed to fetch user details');
        // Fallback to mock data for now
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('Failed to fetch user details');
      // Fallback to mock data for now
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
      
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        setError('Authentication required');
        return;
      }

      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
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
          showSuccess('User updated', 'Changes saved successfully.');
        } else {
          const msg = data.message || 'Failed to update user';
          showError('Update failed', msg);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.message || `Server error: ${response.status}`;
        showError('Update failed', errorMsg);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showError('Update failed', error instanceof Error ? error.message : 'Unknown error');
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
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication required', 'Please log in again');
        return;
      }

      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: true })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (userDetails) {
            setUserDetails({
              ...userDetails,
              user: data.data
            });
          }
          showSuccess('User Activated', 'User account has been activated successfully!');
        } else {
          showError('Activation Failed', data.message || 'Failed to activate user');
        }
      } else {
        showError('Activation Failed', 'Server returned an error');
      }
    } catch (error) {
      console.error('Error activating user:', error);
      showError('Activation Failed', 'An error occurred while activating the user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setIsUpdating(true);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication required', 'Please log in again');
        return;
      }

      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: false })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (userDetails) {
            setUserDetails({
              ...userDetails,
              user: data.data
            });
          }
          showSuccess('User Deactivated', 'User account has been deactivated successfully!');
          setShowDeactivateConfirm(false);
        } else {
          showError('Deactivation Failed', data.message || 'Failed to deactivate user');
        }
      } else {
        showError('Deactivation Failed', 'Server returned an error');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      showError('Deactivation Failed', 'An error occurred while deactivating the user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsUpdating(true);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication required', 'Please log in again');
        return;
      }

      // For now, just deactivate the user instead of deleting
      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: false })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showSuccess('User Deactivated', 'User account has been deactivated successfully!');
          setShowDeleteConfirm(false);
          router.push(`/merchants/${merchantId}/users`);
        } else {
          showError('Deactivation Failed', data.message || 'Failed to deactivate user');
        }
      } else {
        showError('Deactivation Failed', 'Server returned an error');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      showError('Deactivation Failed', 'An error occurred while deactivating the user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    showSuccess('Password Changed', 'User password has been updated successfully!');
    setShowChangePassword(false);
  };

  const handlePasswordChangeError = (error: string) => {
    showError('Password Change Failed', error);
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
        <ToastContainer toasts={toasts} onClose={removeToast} />
        
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
