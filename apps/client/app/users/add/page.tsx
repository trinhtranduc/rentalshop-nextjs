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
        
        toastSuccess(tu('messages.createSuccess'), tu('messages.createSuccess'));
        // Open the new user, as product create does; fall back to the list
        const newId = (response.data as any)?.id;
        router.push(newId ? `/users/${newId}` : '/users');
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
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/" className="mb-4" />

      <div className="mb-4 flex items-start gap-3">
        <Button variant="ghost" onClick={handleCancel} size="sm" className="h-9 w-9 shrink-0 p-0" aria-label={tu('actions.backToUsers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <p className="text-xs text-gray-600">{tu('title')}</p>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{tu('addUser')}</h1>
        </div>
      </div>

      {/* Same two columns as the user page: the form, and what each role can do */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0">
          <UserForm
            mode="create"
            layout="page"
            onSave={handleSave}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            currentUser={currentUser as any}
          />
        </div>
        <aside className="min-w-0 lg:sticky lg:top-4">
          <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5" aria-labelledby="role-help-title">
            <h2 id="role-help-title" className="text-sm font-semibold text-gray-900">{tu('roleHelp.title')}</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {(['OUTLET_ADMIN', 'OUTLET_STAFF'] as const).map((role) => (
                <div key={role}>
                  <dt className="font-medium text-gray-900">{tu(`roles.${role}`)}</dt>
                  <dd className="mt-0.5 text-gray-700">{tu(`roleHelp.${role}`)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-600">{tu('roleHelp.loginNote')}</p>
          </section>
        </aside>
      </div>
    </PageWrapper>
  );
}
