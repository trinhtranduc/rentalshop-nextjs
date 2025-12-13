'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi } from "@rentalshop/utils";
import type { UserCreateInput, BreadcrumbItem } from '@rentalshop/ui';
import { useToast, PageWrapper, Breadcrumb, Button, UserForm } from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import { useAuth, useCommonTranslations, useUsersTranslations } from '@rentalshop/hooks';

export default function AddUserPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toastSuccess, removeToast } = useToast();
  const t = useCommonTranslations();
  const tu = useUsersTranslations();

  // Role-based access control - Can create OUTLET_ADMIN and OUTLET_STAFF
  const canCreateUsers = currentUser?.role === 'ADMIN' || 
                        currentUser?.role === 'MERCHANT' || 
                        currentUser?.role === 'OUTLET_ADMIN';

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (currentUser && !canCreateUsers) {
      // Permission check - redirect only, no toast needed
      router.push('/users');
    }
  }, [currentUser, canCreateUsers, router]);

  // Show loading while checking permissions
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('labels.loading')}</p>
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
      }
      // Error automatically handled by useGlobalErrorHandler
    } catch (err) {
      console.error('❌ AddUserPage: Error creating user:', err);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setIsSubmitting(false);
    }
  };

  // Wrapper function that satisfies UserForm's interface but only handles UserCreateInput
  const handleSave = async (userData: any) => {
    // Type guard to ensure we only handle UserCreateInput in this add page
    if (!('password' in userData && 'role' in userData)) {
      console.error('❌ AddUserPage: Invalid user data type for creation');
      // Validation error - will be caught by form validation
      return;
    }
    
    await handleCreateUser(userData as UserCreateInput);
  };

  const handleCancel = () => {
    router.push('/users');
  };

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: tu('title'), href: '/users' },
    { label: tu('addUser') }
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
              {tu('actions.backToUsers')}
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{tu('addUser')}</h1>
          <p className="text-gray-600 mt-1">{tu('addUser')}</p>
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
