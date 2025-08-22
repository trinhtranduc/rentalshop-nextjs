'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddUserForm, UserPageHeader, UserInfoCard, ToastContainer } from '@rentalshop/ui';
import { usersApi } from "@rentalshop/utils";
import type { UserCreateInput } from '@rentalshop/ui';
import { useToasts } from '@rentalshop/ui';

export default function AddUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, showSuccess, showError, removeToast } = useToasts();

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
      showError('Creation Failed', 'An error occurred while creating the user');
      throw error; // Re-throw so the form can handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <UserPageHeader
          title="Add New User"
          subtitle="Create a new user account"
          onBack={handleCancel}
          backText="Back to Users"
        />

        {/* Add User Form */}
        <UserInfoCard title="User Information">
          <AddUserForm
            onSave={handleSave}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </UserInfoCard>
      </div>
      
      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
