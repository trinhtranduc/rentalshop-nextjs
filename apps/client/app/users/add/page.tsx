'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddUserForm, UserPageHeader, UserInfoCard } from '@rentalshop/ui';
import { usersApi } from '../../../lib/api';
import type { UserCreateInput } from '@rentalshop/ui';

export default function AddUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (userData: UserCreateInput) => {
    try {
      setIsSubmitting(true);
      
      console.log('🔍 AddUserPage: Creating user:', userData);
      
      // Use the real API
      const response = await usersApi.createUser(userData);
      
      if (response.success) {
        console.log('✅ AddUserPage: User created successfully:', response.data);
        
        // Navigate back to users list
        router.push('/users');
      } else {
        console.error('❌ AddUserPage: API error:', response.error);
        throw new Error(response.error || 'Failed to create user');
      }
      
    } catch (error) {
      console.error('❌ AddUserPage: Error creating user:', error);
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
    </div>
  );
}
