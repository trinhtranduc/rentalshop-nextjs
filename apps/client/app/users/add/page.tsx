'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AddUserForm, UserPageHeader, UserInfoCard, ToastContainer } from '@rentalshop/ui';
import { usersApi } from "@rentalshop/utils";
import type { UserCreateInput } from '@rentalshop/ui';
import { useToasts } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';

export default function AddUserPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, showSuccess, showError, removeToast } = useToasts();

  // Role-based access control - Can create OUTLET_ADMIN and OUTLET_STAFF
  const canCreateUsers = currentUser?.role === 'ADMIN' || 
                        currentUser?.role === 'MERCHANT' || 
                        currentUser?.role === 'OUTLET_ADMIN';

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (currentUser && !canCreateUsers) {
      showError('Access Denied', 'You do not have permission to create users.');
      router.push('/users');
    }
  }, [currentUser, canCreateUsers, router, showError]);

  // Show loading while checking permissions
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render the form if user doesn't have permission
  if (!canCreateUsers) {
    return null;
  }

  const handleSave = async (userData: UserCreateInput) => {
    try {
      setIsSubmitting(true);
      
      console.log('🔍 AddUserPage: Creating user:', userData);
      
      // Use the real API
      const response = await usersApi.createUser(userData);
      
      if (response.success) {
        console.log('✅ AddUserPage: User created successfully:', response.data);
        
        // Show success message
        showSuccess('User Created', 'New user account has been created successfully!');
        
        // Navigate back to users list after a short delay to show the toast
        setTimeout(() => {
          router.push('/users');
        }, 1500);
      } else {
        console.error('❌ AddUserPage: API error:', response.error);
        showError('Creation Failed', response.error || 'Failed to create user');
        throw new Error(response.error || 'Failed to create user');
      }
      
    } catch (error) {
      console.error('❌ AddUserPage: Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while creating the user';
      showError('Creation Failed', errorMessage);
      // Don't re-throw - let toast handle the error display
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={handleCancel}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Users
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
          <p className="text-gray-600 mt-1">Create a new user account with appropriate role and organization assignment.</p>
        </div>

        {/* Add User Form */}
        <UserInfoCard title="User Information">
          <AddUserForm
            onSave={handleSave}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            currentUser={currentUser}
          />
        </UserInfoCard>
      </div>
      
      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
