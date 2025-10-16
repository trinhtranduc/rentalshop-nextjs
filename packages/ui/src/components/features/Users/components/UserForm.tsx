'use client'

import React, { useState, useEffect } from 'react';
import { Save, X, Eye, EyeOff, Building2, Store } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { FormField, RoleSelect, MerchantSelect, OutletSelect } from './UserFormFields';
import { validateUserCreateInput, validateUserUpdateInput } from './UserFormValidation';
import type { User, UserCreateInput, UserUpdateInput, UserRole } from '@rentalshop/types';
import { merchantsApi, outletsApi } from '@rentalshop/utils';
import { useUsersTranslations, useCommonTranslations } from '@rentalshop/hooks';

// ============================================================================
// TYPE-SAFE FORM DATA INTERFACES
// ============================================================================

interface UserCreateFormData {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  password: string;
  confirmPassword: string;
  merchantId: string;
  outletId: string;
}

interface UserUpdateFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  merchantId: string;
  outletId: string;
}

type UserFormData = UserCreateFormData | UserUpdateFormData;

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
  const t = useUsersTranslations();
  const tc = useCommonTranslations();
  const isEditMode = mode === 'edit';
  
  // Form data - different structure for create vs edit
  const [formData, setFormData] = useState<UserFormData>(() => {
    console.log('🔍 UserForm: Initial state setup - isEditMode:', isEditMode, 'user:', user);
    if (isEditMode && user) {
      const initialData = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        // ✅ ADD MISSING FIELDS
        role: user.role as UserRole || 'OUTLET_STAFF',
        merchantId: user.merchantId?.toString() || '',
        outletId: user.outletId?.toString() || ''
      } as UserUpdateFormData;
      console.log('🔍 UserForm: Initial formData (edit mode):', initialData);
      return initialData;
    } else {
      const initialData = {
        name: '',
        email: '',
        phone: '',
        role: 'OUTLET_STAFF' as UserRole, // Default to OUTLET_STAFF for safety
        isActive: true,
        password: '',
        confirmPassword: '',
        merchantId: '',
        outletId: ''
      } as UserCreateFormData;
      console.log('🔍 UserForm: Initial formData (create mode):', initialData);
      return initialData;
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
      console.log('🔍 UserForm: User object for edit:', user);
      console.log('🔍 UserForm: User role:', user.role, 'Type:', typeof user.role);
      console.log('🔍 UserForm: User merchantId:', user.merchantId, 'Type:', typeof user.merchantId);
      console.log('🔍 UserForm: User outletId:', user.outletId, 'Type:', typeof user.outletId);
      
      // Ensure role is properly typed
      const userRole = user.role as UserRole;
      const validRoles: UserRole[] = ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'];
      const role = validRoles.includes(userRole) ? userRole : 'OUTLET_STAFF';
      
      const formData = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: role,
        merchantId: user.merchantId?.toString() || '',
        outletId: user.outletId?.toString() || ''
      } as UserUpdateFormData;
      
      console.log('🔍 UserForm: About to set formData:', formData);
      console.log('🔍 UserForm: formData.role:', formData.role, 'Type:', typeof formData.role);
      
      setFormData(formData);
      setErrors({});
      
      console.log('🔍 UserForm: Auto-filled edit form with user data:', user);
      console.log('🔍 UserForm: Final role set:', formData.role);
    }
  }, [user, isEditMode]);

  // Pre-fill form data with current user's merchant/outlet when they can't be changed (create mode)
  useEffect(() => {
    if (!isEditMode && currentUser) {
      const updates: Partial<UserCreateFormData> = {};
      
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
        setFormData((prev: UserFormData) => ({ ...prev, ...updates }));
      }
    }
  }, [currentUser, canSelectMerchant, canSelectOutlet, isEditMode]);

  // Load merchants data (create mode only)
  useEffect(() => {
    if (!isEditMode && canSelectMerchant) {
      setLoadingMerchants(true);
      merchantsApi.getMerchants()
        .then((response: any) => {
          if (response.success && response.data) {
            setMerchants(response.data.merchants || []);
          }
        })
        .catch((error: any) => {
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
      setFormData((prev: UserFormData) => ({ ...prev, merchantId: userMerchantId?.toString() || '' }));
    }
  }, [canSelectMerchant, currentUser, isEditMode]);

  // Load outlets data (create mode only)
  useEffect(() => {
    if (!isEditMode && canSelectOutlet) {
      setLoadingOutlets(true);
      const merchantId = canSelectMerchant ? (formData as any).merchantId : (currentUser?.merchantId || currentUser?.merchant?.id);
      
      console.log('🔍 UserForm: Loading outlets for merchantId:', merchantId, 'canSelectMerchant:', canSelectMerchant);
      
      if (merchantId) {
        outletsApi.getOutletsByMerchant(Number(merchantId))
          .then((response: any) => {
            console.log('🔍 UserForm: Outlets API response:', response);
            if (response.success && response.data) {
              const outletsData = response.data.outlets || response.data || [];
              console.log('🔍 UserForm: Setting outlets:', outletsData);
              setOutlets(outletsData);
            } else {
              console.warn('🔍 UserForm: No outlets data in response:', response);
              setOutlets([]);
            }
          })
          .catch((error: any) => {
            console.error('🔍 UserForm: Error loading outlets:', error);
            setOutlets([]);
          })
          .finally(() => {
            setLoadingOutlets(false);
          });
      } else {
        console.log('🔍 UserForm: No merchantId, clearing outlets');
        setOutlets([]);
        setLoadingOutlets(false);
      }
    } else if (!isEditMode && currentUser?.outletId) {
      // For outlet users, set their outlet as the only option
      console.log('🔍 UserForm: Setting single outlet for current user:', currentUser.outletId);
      setOutlets([{
        id: currentUser.outletId,
        name: currentUser.outlet?.name || 'Current Outlet'
      }]);
      setFormData((prev: any) => ({ ...prev, outletId: currentUser.outletId?.toString() || '' }));
    }
  }, [canSelectOutlet, canSelectMerchant, (formData as any).merchantId, currentUser?.merchantId, currentUser?.outletId, isEditMode]);

  // Reset outlet when merchant changes and reload outlets (create mode only)
  useEffect(() => {
    if (!isEditMode && canSelectMerchant && (formData as UserCreateFormData).merchantId) {
      console.log('🔍 UserForm: Merchant changed, resetting outlet and reloading outlets');
      setFormData((prev: UserFormData) => ({ ...prev, outletId: '' }));
      
      // Reload outlets for the new merchant
      setLoadingOutlets(true);
      outletsApi.getOutletsByMerchant(Number((formData as UserCreateFormData).merchantId))
        .then((response: any) => {
          console.log('🔍 UserForm: Reloading outlets for new merchant:', response);
          if (response.success && response.data) {
            const outletsData = response.data.outlets || response.data || [];
            setOutlets(outletsData);
          } else {
            setOutlets([]);
          }
        })
        .catch((error: any) => {
          console.error('🔍 UserForm: Error reloading outlets:', error);
          setOutlets([]);
        })
        .finally(() => {
          setLoadingOutlets(false);
        });
    }
  }, [(formData as UserCreateFormData).merchantId, canSelectMerchant, isEditMode]);

  const handleInputChange = (field: string, value: string | boolean) => {
    console.log('🔍 UserForm: Input changed:', { field, value });
    setFormData((prev: UserFormData) => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    let newErrors: Record<string, string>;
    
    if (isEditMode) {
      newErrors = validateUserUpdateInput(formData as UserUpdateFormData);
    } else {
      newErrors = validateUserCreateInput(formData as UserCreateFormData);
    }
    
    console.log('🔍 UserForm: Validation errors:', newErrors);
    console.log('🔍 UserForm: Form data being validated:', formData);
    
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
        const updateData = formData as UserUpdateFormData;
        submitData = {
          id: user?.id || 0,
          firstName: updateData.firstName.trim(),
          lastName: updateData.lastName.trim(),
          email: updateData.email.trim().toLowerCase(),
          phone: updateData.phone.trim(),
          role: updateData.role,
          merchantId: updateData.merchantId ? Number(updateData.merchantId) : undefined,
          outletId: updateData.outletId ? Number(updateData.outletId) : undefined
        } as UserUpdateInput;
      } else {
        const createData = formData as UserCreateFormData;
        submitData = {
          firstName: createData.name.trim().split(' ')[0] || '',
          lastName: createData.name.trim().split(' ').slice(1).join(' ') || '',
          email: createData.email.trim().toLowerCase(),
          phone: createData.phone.trim(),
          role: createData.role,
          password: createData.password,
          merchantId: createData.merchantId ? Number(createData.merchantId) : undefined,
          outletId: createData.outletId ? Number(createData.outletId) : undefined
        } as UserCreateInput;
      }
      
      console.log('🔍 UserForm: About to call onSave with data:', submitData);
      console.log('🔍 UserForm: Submit data type:', isEditMode ? 'UserUpdateInput' : 'UserCreateInput');
      console.log('🔍 UserForm: Submit data keys:', Object.keys(submitData));
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
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              {isEditMode ? t('fields.basicInformation') : t('fields.personalInformation')}
            </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEditMode ? (
              <>
                <FormField
                  id="firstName"
                  label={t('fields.firstName')}
                  value={(formData as any).firstName}
                  onChange={(value) => handleInputChange('firstName', value)}
                  error={errors.firstName}
                  disabled={isSubmitting}
                  required
                  placeholder={t('placeholders.enterFirstName')}
                />

                <FormField
                  id="lastName"
                  label={t('fields.lastName')}
                  value={(formData as any).lastName}
                  onChange={(value) => handleInputChange('lastName', value)}
                  error={errors.lastName}
                  disabled={isSubmitting}
                  required
                  placeholder={t('placeholders.enterLastName')}
                />
              </>
            ) : (
              <FormField
                id="name"
                label={t('fields.fullName')}
                value={(formData as any).name}
                onChange={(value) => handleInputChange('name', value)}
                error={errors.name}
                disabled={isSubmitting}
                required
                placeholder={t('placeholders.enterFullName')}
              />
            )}

            <FormField
              id="email"
              label={t('fields.email')}
              value={(formData as any).email}
              onChange={(value) => handleInputChange('email', value)}
              error={errors.email}
              disabled={isSubmitting}
              required
              type="email"
              placeholder={t('placeholders.enterEmail')}
            />

            <FormField
              id="phone"
              label={t('fields.phone')}
              value={(formData as any).phone}
              onChange={(value) => handleInputChange('phone', value)}
              error={errors.phone}
              disabled={isSubmitting}
              required
              placeholder={t('placeholders.enterPhone')}
            />

            {console.log('🔍 UserForm: RoleSelect value:', (formData as any).role, 'FormData:', formData)}
            <RoleSelect
              value={(formData as any).role}
              onChange={(value) => {
                console.log('🔍 UserForm: Role changed to:', value);
                handleInputChange('role', value);
              }}
              error={errors.role}
              disabled={isSubmitting}
              currentUserRole={currentUser?.role}
            />
          </div>
          </div>

          {/* Organization Assignment */}
          {(showMerchantField || showOutletField) && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                {t('organizationAssignment')}
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
            </div>
          )}

          {/* Password Section (Create mode only) */}
          {!isEditMode && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                {t('passwordSettings')}
              </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                id="password"
                label={t('fields.password')}
                value={(formData as any).password}
                onChange={(value) => handleInputChange('password', value)}
                error={errors.password}
                disabled={isSubmitting}
                required
                type="password"
                placeholder={t('placeholders.enterPassword')}
                showPasswordToggle={true}
              />

              <FormField
                id="confirmPassword"
                label={t('fields.confirmPassword')}
                value={(formData as any).confirmPassword}
                onChange={(value) => handleInputChange('confirmPassword', value)}
                error={errors.confirmPassword}
                disabled={isSubmitting}
                type="password"
                placeholder={t('placeholders.confirmPassword')}
                showPasswordToggle={true}
              />
            </div>
            </div>
          )}

          {/* User Information (Edit mode only) */}
          {isEditMode && user && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                {t('currentUserInformation')}
              </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">{t('fields.role')}:</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {t(`roles.${user.role}` as any)}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">{t('fields.status')}:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  user.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? t('fields.active') : t('fields.inactive')}
                </span>
              </div>
              {user.merchant && (
                <div>
                  <span className="font-medium text-gray-700">{t('fields.merchant')}:</span>
                  <span className="ml-2 text-gray-600">{user.merchant.name}</span>
                </div>
              )}
              {user.outlet && (
                <div>
                  <span className="font-medium text-gray-700">{t('fields.outlet')}:</span>
                  <span className="ml-2 text-gray-600">{user.outlet.name}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">{t('created')}:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              {user.lastLoginAt && (
                <div>
                  <span className="font-medium text-gray-700">{t('fields.lastLogin')}:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(user.lastLoginAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            </div>
          )}

          {/* Validation Status */}
          {Object.keys(errors).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-lg">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {t('messages.validationErrors')}
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>
                      <strong>{field.charAt(0).toUpperCase() + field.slice(1)}:</strong> {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 border-t pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          <X className="w-4 h-4 mr-2" />
          {tc('buttons.cancel')}
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting 
            ? (isEditMode ? t('actions.updating') : t('actions.creating')) 
            : (isEditMode ? t('actions.updateUser') : t('actions.createUser'))
          }
        </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};
