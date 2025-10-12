'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi } from "@rentalshop/utils";
import type { UserCreateInput, BreadcrumbItem } from '@rentalshop/ui';
import { useToast, PageWrapper, Breadcrumb, Button } from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';

export default function AddUserPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toastSuccess, toastError, removeToast } = useToast();

  // Role-based access control - Can create OUTLET_ADMIN and OUTLET_STAFF
  const canCreateUsers = currentUser?.role === 'ADMIN' || 
                        currentUser?.role === 'MERCHANT' || 
                        currentUser?.role === 'OUTLET_ADMIN';

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (currentUser && !canCreateUsers) {
      toastError('Access Denied', 'You do not have permission to create users.');
      router.push('/users');
    }
  }, [currentUser, canCreateUsers, router, toastError]);

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

  // Internal function that only handles UserCreateInput
  const handleCreateUser = async (userData: UserCreateInput) => {
    try {
      setIsSubmitting(true);
      
      console.log('🔍 AddUserPage: Creating user:', userData);
      
      // Use the real API
      const response = await usersApi.createUser(userData);
      
      if (response.success) {
        console.log('✅ AddUserPage: User created successfully:', response.data);
        
        // Navigate back to users list immediately
        // Toast will be handled by Users component when the page loads
        router.push('/users');
      } else {
        console.error('❌ AddUserPage: API error:', response.error);
        toastError('Creation Failed', response.error || 'Failed to create user');
        throw new Error(response.error || 'Failed to create user');
      }
      
    } catch (err) {
      console.error('❌ AddUserPage: Error creating user:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while creating the user';
      toastError('Creation Failed', errorMessage);
      // Don't re-throw - let toast handle the error display
    } finally {
      setIsSubmitting(false);
    }
  };

  // Wrapper function that satisfies UserForm's interface but only handles UserCreateInput
  const handleSave = async (userData: any) => {
    // Type guard to ensure we only handle UserCreateInput in this add page
    if (!('password' in userData && 'role' in userData)) {
      console.error('❌ AddUserPage: Invalid user data type for creation');
      toastError('Error', 'Invalid user data for creation');
      return;
    }
    
    await handleCreateUser(userData as UserCreateInput);
  };

  const handleCancel = () => {
    router.push('/users');
  };

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Users', href: '/users' },
    { label: 'Add User' }
  ];

  return (
    <PageWrapper>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/" className="mb-6" />
      
      {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Button
              onClick={handleCancel}
              variant="link"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Users
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
          <p className="text-gray-600 mt-1">Create a new user account with appropriate role and organization assignment.</p>
        </div>

        {/* Add User Form */}
        <UserForm
          onSave={handleSave}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          mode="create"
        />
    </PageWrapper>
  );
}
