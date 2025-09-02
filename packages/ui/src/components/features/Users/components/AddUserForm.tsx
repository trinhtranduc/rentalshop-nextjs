'use client'

import React, { useState, useEffect } from 'react';
import { Save, X, Eye, EyeOff, Building2, Store } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { SearchableSelect } from '../../../ui/searchable-select';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import type { UserCreateInput, User } from '@rentalshop/types';
import { merchantsApi, outletsApi } from '@rentalshop/utils';

interface AddUserFormProps {
  onSave: (userData: UserCreateInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  currentUser?: User | null;
}

export const AddUserForm: React.FC<AddUserFormProps> = ({
  onSave,
  onCancel,
  isSubmitting: externalIsSubmitting,
  currentUser
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: undefined as 'OUTLET_ADMIN' | 'OUTLET_STAFF' | undefined,
    isActive: true,
    password: '',
    confirmPassword: '',
    merchantId: '',
    outletId: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  
  // Data for dropdowns
  const [merchants, setMerchants] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [loadingOutlets, setLoadingOutlets] = useState(false);

  // Use external isSubmitting if provided, otherwise use internal state
  const isSubmitting = externalIsSubmitting !== undefined ? externalIsSubmitting : internalIsSubmitting;

  // Role-based access control - Only OUTLET_ADMIN and OUTLET_STAFF can be created
  const canSelectMerchant = currentUser?.role === 'ADMIN';
  const canSelectOutlet = currentUser?.role === 'ADMIN' || currentUser?.role === 'MERCHANT';
  const showMerchantField = currentUser?.role === 'ADMIN' || currentUser?.role === 'MERCHANT' || currentUser?.role === 'OUTLET_ADMIN' || currentUser?.role === 'OUTLET_STAFF';
  const showOutletField = currentUser?.role === 'ADMIN' || currentUser?.role === 'MERCHANT' || currentUser?.role === 'OUTLET_ADMIN' || currentUser?.role === 'OUTLET_STAFF';



  // Pre-fill form data with current user's merchant/outlet when they can't be changed
  useEffect(() => {
    if (currentUser) {
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
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [currentUser, canSelectMerchant, canSelectOutlet]);

  // Load merchants data
  useEffect(() => {
    if (canSelectMerchant) {
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
    } else if (currentUser?.merchantId || currentUser?.merchant?.id) {
      // For non-admin users, set their merchant as the only option
      const userMerchantId = currentUser.merchantId || currentUser.merchant?.id;
      setMerchants([{
        id: userMerchantId,
        name: currentUser.merchant?.name || 'Current Merchant'
      }]);
      setFormData(prev => ({ ...prev, merchantId: userMerchantId?.toString() || '' }));
    }
  }, [canSelectMerchant, currentUser]);

  // Load outlets data
  useEffect(() => {
    if (canSelectOutlet) {
      setLoadingOutlets(true);
      const merchantId = canSelectMerchant ? formData.merchantId : (currentUser?.merchantId || currentUser?.merchant?.id);
      
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
    } else if (currentUser?.outletId) {
      // For outlet users, set their outlet as the only option
      setOutlets([{
        id: currentUser.outletId,
        name: currentUser.outlet?.name || 'Current Outlet'
      }]);
      setFormData(prev => ({ ...prev, outletId: currentUser.outletId?.toString() || '' }));
    }
  }, [canSelectOutlet, canSelectMerchant, formData.merchantId, currentUser]);

  // Reset outlet when merchant changes
  useEffect(() => {
    if (canSelectMerchant && formData.merchantId) {
      setFormData(prev => ({ ...prev, outletId: '' }));
    }
  }, [formData.merchantId, canSelectMerchant]);

  const handleInputChange = (field: string, value: string | boolean) => {
    console.log('🔍 AddUserForm: Input changed:', { field, value });
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation - required
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation - required
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Phone validation - required
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]+$/.test(formData.phone.trim())) {
      newErrors.phone = 'Phone number must contain only numbers';
    } else if (formData.phone.trim().length < 8) {
      newErrors.phone = 'Phone number must be at least 8 digits';
    } else if (formData.phone.trim().length > 15) {
      newErrors.phone = 'Phone number must be less than 16 digits';
    }

    // Role validation - required
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // Merchant validation based on role - Only OUTLET_ADMIN and OUTLET_STAFF require merchant
    if (formData.role && (formData.role === 'OUTLET_ADMIN' || formData.role === 'OUTLET_STAFF') && !formData.merchantId) {
      newErrors.merchantId = 'Merchant is required for this role';
    }

    // Outlet validation based on role
    if (formData.role && (formData.role === 'OUTLET_ADMIN' || formData.role === 'OUTLET_STAFF') && !formData.outletId) {
      newErrors.outletId = 'Outlet is required for this role';
    }

    // Password validation - required for new users
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 AddUserForm: Form submitted, validating...');
    
    if (!validateForm()) {
      return;
    }
    
    if (!externalIsSubmitting) {
      setInternalIsSubmitting(true);
    }
    
    try {
      const submitData = {
        firstName: formData.name.trim().split(' ')[0] || '',
        lastName: formData.name.trim().split(' ').slice(1).join(' ') || '',
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role as 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF',
        password: formData.password,
        merchantId: formData.merchantId || undefined,
        outletId: formData.outletId || undefined
      };
      
      console.log('🔍 AddUserForm: About to call onSave with data:', submitData);
      await onSave(submitData);
      console.log('✅ AddUserForm: User created successfully');
      
    } catch (error: any) {
      console.error('❌ AddUserForm: Error saving user:', error);
      // Error handling is now done by the parent component using toast notifications
      // No need to set error messages in the form
    } finally {
      if (!externalIsSubmitting) {
        setInternalIsSubmitting(false);
      }
    }
  };

  const handleCancel = () => {
    console.log('🔍 AddUserForm: Cancel button clicked');
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
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                className={errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                disabled={isSubmitting}
                required
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className={errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                disabled={isSubmitting}
                required
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number (numbers only)"
                className={errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500">Phone number must contain only numbers (8-15 digits)</p>
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => handleInputChange('role', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className={errors.role ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTLET_STAFF">Outlet Staff</SelectItem>
                  <SelectItem value="OUTLET_ADMIN">Outlet Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization Assignment */}
      {(showMerchantField || showOutletField) && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Organization Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showMerchantField && (
                <div className="space-y-2">
                  <Label htmlFor="merchant" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Merchant {canSelectMerchant ? '*' : '(Read-only)'}
                  </Label>
                  {canSelectMerchant ? (
                    <SearchableSelect
                      key={`merchant-${merchants.length}`}
                      value={formData.merchantId ? Number(formData.merchantId) : undefined}
                      onChange={(value) => handleInputChange('merchantId', value.toString())}
                      options={merchants.map(merchant => ({
                        value: merchant.id.toString(),
                        label: merchant.name
                      }))}
                      placeholder={loadingMerchants ? "Loading merchants..." : "Search and select merchant"}
                      searchPlaceholder="Search merchants..."
                      emptyText="No merchants found"
                      className={errors.merchantId ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                  ) : (
                    <Input
                      value={currentUser?.merchant?.name || ''}
                      disabled
                      className="bg-gray-50 text-gray-600 cursor-not-allowed"
                      placeholder="Current merchant"
                    />
                  )}
                  {errors.merchantId && (
                    <p className="text-sm text-red-600">{errors.merchantId}</p>
                  )}
                </div>
              )}

              {showOutletField && (
                <div className="space-y-2">
                  <Label htmlFor="outlet" className="flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Outlet {canSelectOutlet ? '*' : '(Read-only)'}
                  </Label>
                  {canSelectOutlet ? (
                    <div>
                      <SearchableSelect
                        key={`outlet-${outlets.length}-${formData.merchantId}`}
                        value={formData.outletId ? Number(formData.outletId) : undefined}
                        onChange={(value) => handleInputChange('outletId', value.toString())}
                        options={outlets.map(outlet => ({
                          value: outlet.id.toString(),
                          label: outlet.name
                        }))}
                        placeholder={
                          loadingOutlets ? "Loading outlets..." : 
                          !formData.merchantId && canSelectMerchant ? "Select merchant first" : 
                          "Search and select outlet"
                        }
                        searchPlaceholder="Search outlets..."
                        emptyText="No outlets found"
                        className={errors.outletId ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                      />
                    </div>
                  ) : (
                    <Input
                      value={currentUser?.outlet?.name || ''}
                      disabled
                      className="bg-gray-50 text-gray-600 cursor-not-allowed"
                      placeholder="Current outlet"
                    />
                  )}
                  {errors.outletId && (
                    <p className="text-sm text-red-600">{errors.outletId}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Password Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                  placeholder="Enter password"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">Password must be at least 6 characters</p>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                  placeholder="Confirm password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
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
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active Account
              </Label>
            </div>
            <p className="text-sm text-gray-600">
              Active users can log in and access the system. Inactive users are suspended.
            </p>
          </div>
        </CardContent>
      </Card>

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
          {isSubmitting ? 'Creating...' : 'Create User'}
        </Button>
      </div>
    </form>
  );
};