'use client'

import React, { useState, useEffect } from 'react';
import { Save, X, Eye, EyeOff, Building2, Store } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { FormField, RoleSelect, MerchantSelect, OutletSelect } from './UserFormFields';
import { validateUserCreateInput, validateUserUpdateInput } from './UserFormValidation';
import type { User, UserCreateInput, UserUpdateInput } from '@rentalshop/types';
import { merchantsApi, outletsApi } from '@rentalshop/utils';

interface UserFormProps {
  mode: 'create' | 'edit';
  user?: User; // Required for edit mode
  onSave: (userData: UserCreateInput | UserUpdateInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  currentUser?: User | null;
}

export const UserForm: React.FC<UserFormProps> = ({
  mode,
  user,
  onSave,
  onCancel,
  isSubmitting: externalIsSubmitting,
  currentUser
}) => {
  const isEditMode = mode === 'edit';
  
  // Form data - different structure for create vs edit
  const [formData, setFormData] = useState<any>(() => {
    if (isEditMode && user) {
      return {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      };
    } else {
      return {
        name: '',
        email: '',
        phone: '',
        role: undefined as 'OUTLET_ADMIN' | 'OUTLET_STAFF' | undefined,
        isActive: true,
        password: '',
        confirmPassword: '',
        merchantId: '',
        outletId: ''
      };
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  
  // Data for dropdowns (create mode only)
  const [merchants, setMerchants] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [loadingOutlets, setLoadingOutlets] = useState(false);

  // Use external isSubmitting if provided, otherwise use internal state
  const isSubmitting = externalIsSubmitting !== undefined ? externalIsSubmitting : internalIsSubmitting;

  // Role-based access control (create mode only)
  const canSelectMerchant = currentUser?.role === 'ADMIN';
  const canSelectOutlet = currentUser?.role === 'ADMIN' || currentUser?.role === 'MERCHANT';
  const showMerchantField = currentUser?.role === 'ADMIN' || currentUser?.role === 'MERCHANT' || currentUser?.role === 'OUTLET_ADMIN' || currentUser?.role === 'OUTLET_STAFF';
  const showOutletField = currentUser?.role === 'ADMIN' || currentUser?.role === 'MERCHANT' || currentUser?.role === 'OUTLET_ADMIN' || currentUser?.role === 'OUTLET_STAFF';

  // Update form data when user changes (edit mode)
  useEffect(() => {
    if (isEditMode && user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      });
      setErrors({});
    }
  }, [user, isEditMode]);

  // Pre-fill form data with current user's merchant/outlet when they can't be changed (create mode)
  useEffect(() => {
    if (!isEditMode && currentUser) {
      const updates: any = {};
      
      // Pre-fill merchant ID if user can't select merchant
      const userMerchantId = currentUser.merchantId || currentUser.merchant?.id;
      if (!canSelectMerchant && userMerchantId) {
        updates.merchantId = userMerchantId.toString();
      }
      
      // Pre-fill outlet ID if user can't select outlet
      const userOutletId = currentUser.outletId || currentUser.outlet?.id;
      if (!canSelectOutlet && userOutletId) {
        updates.outletId = userOutletId.toString();
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData((prev: any) => ({ ...prev, ...updates }));
      }
    }
  }, [currentUser, canSelectMerchant, canSelectOutlet, isEditMode]);

  // Load merchants data (create mode only)
  useEffect(() => {
    if (!isEditMode && canSelectMerchant) {
      setLoadingMerchants(true);
      merchantsApi.getMerchants()
        .then(response => {
          if (response.success && response.data) {
            setMerchants(response.data.merchants || []);
          }
        })
        .catch(error => {
          console.error('Error loading merchants:', error);
        })
        .finally(() => {
          setLoadingMerchants(false);
        });
    } else if (!isEditMode && currentUser?.merchantId || currentUser?.merchant?.id) {
      // For non-admin users, set their merchant as the only option
      const userMerchantId = currentUser.merchantId || currentUser.merchant?.id;
      setMerchants([{
        id: userMerchantId,
        name: currentUser.merchant?.name || 'Current Merchant'
      }]);
      setFormData((prev: any) => ({ ...prev, merchantId: userMerchantId?.toString() || '' }));
    }
  }, [canSelectMerchant, currentUser, isEditMode]);

  // Load outlets data (create mode only)
  useEffect(() => {
    if (!isEditMode && canSelectOutlet) {
      setLoadingOutlets(true);
      const merchantId = canSelectMerchant ? (formData as any).merchantId : (currentUser?.merchantId || currentUser?.merchant?.id);
      
      if (merchantId) {
        outletsApi.getOutletsByMerchant(Number(merchantId))
          .then(response => {
            if (response.success && response.data) {
              setOutlets(response.data.outlets || []);
            }
          })
          .catch(error => {
            console.error('Error loading outlets:', error);
          })
          .finally(() => {
            setLoadingOutlets(false);
          });
      } else {
        setLoadingOutlets(false);
      }
    } else if (!isEditMode && currentUser?.outletId) {
      // For outlet users, set their outlet as the only option
      setOutlets([{
        id: currentUser.outletId,
        name: currentUser.outlet?.name || 'Current Outlet'
      }]);
      setFormData((prev: any) => ({ ...prev, outletId: currentUser.outletId?.toString() || '' }));
    }
  }, [canSelectOutlet, canSelectMerchant, (formData as any).merchantId, currentUser, isEditMode]);

  // Reset outlet when merchant changes (create mode only)
  useEffect(() => {
    if (!isEditMode && canSelectMerchant && (formData as any).merchantId) {
      setFormData((prev: any) => ({ ...prev, outletId: '' }));
    }
  }, [(formData as any).merchantId, canSelectMerchant, isEditMode]);

  const handleInputChange = (field: string, value: string | boolean) => {
    console.log('🔍 UserForm: Input changed:', { field, value });
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    let newErrors: Record<string, string>;
    
    if (isEditMode) {
      newErrors = validateUserUpdateInput(formData);
    } else {
      newErrors = validateUserCreateInput(formData);
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 UserForm: Form submitted, validating...');
    
    if (!validateForm()) {
      return;
    }
    
    if (!externalIsSubmitting) {
      setInternalIsSubmitting(true);
    }
    
    try {
      let submitData: UserCreateInput | UserUpdateInput;
      
      if (isEditMode) {
        submitData = {
          firstName: (formData as any).firstName.trim(),
          lastName: (formData as any).lastName.trim(),
          email: (formData as any).email.trim().toLowerCase(),
          phone: (formData as any).phone.trim(),
        };
      } else {
        submitData = {
          firstName: (formData as any).name.trim().split(' ')[0] || '',
          lastName: (formData as any).name.trim().split(' ').slice(1).join(' ') || '',
          email: (formData as any).email.trim().toLowerCase(),
          phone: (formData as any).phone.trim(),
          role: (formData as any).role as 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF',
          password: (formData as any).password,
          merchantId: (formData as any).merchantId || undefined,
          outletId: (formData as any).outletId || undefined
        };
      }
      
      console.log('🔍 UserForm: About to call onSave with data:', submitData);
      await onSave(submitData);
      console.log('✅ UserForm: User operation completed successfully');
      
    } catch (error: any) {
      console.error('❌ UserForm: Error in user operation:', error);
      // Error handling is now done by the parent component using toast notifications
    } finally {
      if (!externalIsSubmitting) {
        setInternalIsSubmitting(false);
      }
    }
  };

  const handleCancel = () => {
    console.log('🔍 UserForm: Cancel button clicked');
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            {isEditMode ? 'Basic Information' : 'Personal Information'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEditMode ? (
              <>
                <FormField
                  id="firstName"
                  label="First Name"
                  value={(formData as any).firstName}
                  onChange={(value) => handleInputChange('firstName', value)}
                  error={errors.firstName}
                  disabled={isSubmitting}
                  required
                  placeholder="Enter first name"
                />

                <FormField
                  id="lastName"
                  label="Last Name"
                  value={(formData as any).lastName}
                  onChange={(value) => handleInputChange('lastName', value)}
                  error={errors.lastName}
                  disabled={isSubmitting}
                  required
                  placeholder="Enter last name"
                />
              </>
            ) : (
              <FormField
                id="name"
                label="Full Name"
                value={(formData as any).name}
                onChange={(value) => handleInputChange('name', value)}
                error={errors.name}
                disabled={isSubmitting}
                required
                placeholder="Enter full name"
              />
            )}

            <FormField
              id="email"
              label="Email"
              value={(formData as any).email}
              onChange={(value) => handleInputChange('email', value)}
              error={errors.email}
              disabled={isSubmitting}
              required
              type="email"
              placeholder="Enter email address"
            />

            <FormField
              id="phone"
              label="Phone"
              value={(formData as any).phone}
              onChange={(value) => handleInputChange('phone', value)}
              error={errors.phone}
              disabled={isSubmitting}
              required
              placeholder="Enter phone number (numbers only)"
            />

            {!isEditMode && (
              <RoleSelect
                value={(formData as any).role}
                onChange={(value) => handleInputChange('role', value)}
                error={errors.role}
                disabled={isSubmitting}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Organization Assignment (Create mode only) */}
      {!isEditMode && (showMerchantField || showOutletField) && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Organization Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showMerchantField && (
                <MerchantSelect
                  value={(formData as any).merchantId}
                  onChange={(value) => handleInputChange('merchantId', value)}
                  merchants={merchants}
                  loading={loadingMerchants}
                  error={errors.merchantId}
                  disabled={isSubmitting}
                  canSelect={canSelectMerchant}
                  currentUser={currentUser}
                />
              )}

              {showOutletField && (
                <OutletSelect
                  value={(formData as any).outletId}
                  onChange={(value) => handleInputChange('outletId', value)}
                  outlets={outlets}
                  loading={loadingOutlets}
                  error={errors.outletId}
                  disabled={isSubmitting}
                  canSelect={canSelectOutlet}
                  canSelectMerchant={canSelectMerchant}
                  merchantId={(formData as any).merchantId}
                  currentUser={currentUser}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password Section (Create mode only) */}
      {!isEditMode && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Password Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                id="password"
                label="Password"
                value={(formData as any).password}
                onChange={(value) => handleInputChange('password', value)}
                error={errors.password}
                disabled={isSubmitting}
                required
                type="password"
                placeholder="Enter password"
                showPasswordToggle={true}
              />

              <FormField
                id="confirmPassword"
                label="Confirm Password"
                value={(formData as any).confirmPassword}
                onChange={(value) => handleInputChange('confirmPassword', value)}
                error={errors.confirmPassword}
                disabled={isSubmitting}
                type="password"
                placeholder="Confirm password"
                showPasswordToggle={true}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Settings (Create mode only) */}
      {!isEditMode && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Account Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={(formData as any).isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active Account
                </label>
              </div>
              <p className="text-sm text-gray-600">
                Active users can log in and access the system. Inactive users are suspended.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Status */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Please fix the validation errors above before submitting.</strong>
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting 
            ? (isEditMode ? 'Updating...' : 'Creating...') 
            : (isEditMode ? 'Update User' : 'Create User')
          }
        </Button>
      </div>
    </form>
  );
};
