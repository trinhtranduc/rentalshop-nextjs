'use client'

import React, { useState, useEffect } from 'react';
import { Save, X, Eye, EyeOff, Lock, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Card, CardContent } from '../../../ui/card';
import { ConfirmationDialog } from './ConfirmationDialog';
import type { User, UserUpdateInput } from '../types';

interface EditUserFormProps {
  user: User;
  onSave: (userData: UserUpdateInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  onPasswordChange?: (passwordData: {
    currentPassword?: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
  onDeactivate?: () => Promise<void>;
  onDelete?: () => Promise<void>;
}

export const EditUserForm: React.FC<EditUserFormProps> = ({
  user,
  onSave,
  onCancel,
  isSubmitting: externalIsSubmitting,
  onPasswordChange,
  onDeactivate,
  onDelete
}) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || '',
    isActive: user.isActive
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showDeactivateSection, setShowDeactivateSection] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Use external isSubmitting if provided, otherwise use internal state
  const isSubmitting = externalIsSubmitting !== undefined ? externalIsSubmitting : internalIsSubmitting;

  console.log('🔍 EditUserForm: Component rendered for user:', user.id);

  // Update form data when user changes
  useEffect(() => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || '',
      isActive: user.isActive
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setErrors({});
  }, [user]);

  const handleInputChange = (field: string, value: string | boolean) => {
    console.log('🔍 EditUserForm: Input changed:', { field, value });
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear general error message when user starts typing
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    
    // Clear password-specific error when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: '' }));
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (passwordData.newPassword && passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
    }

    if (passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 EditUserForm: Form submitted, validating...');
    
    if (!validateForm()) {
      return;
    }
    
    if (!externalIsSubmitting) {
      setInternalIsSubmitting(true);
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      const submitData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role,
        isActive: formData.isActive
      };
      
      console.log('🔍 EditUserForm: About to call onSave with data:', submitData);
      await onSave(submitData);
      console.log('✅ EditUserForm: User updated successfully');
      
      setSuccessMessage('User profile updated successfully!');
      
    } catch (error) {
      console.error('❌ EditUserForm: Error updating user:', error);
      const errorMsg = error instanceof Error ? error.message : 'An error occurred while updating the user';
      setErrorMessage(errorMsg);
    } finally {
      if (!externalIsSubmitting) {
        setInternalIsSubmitting(false);
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    if (!onPasswordChange) {
      setPasswordErrors({ submit: 'Password change not available' });
      return;
    }

    try {
      await onPasswordChange(passwordData);
      setSuccessMessage('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to change password';
      setPasswordErrors({ submit: errorMsg });
    }
  };

  const handleDeactivate = async () => {
    if (!onDeactivate) {
      setErrorMessage('Account deactivation not available');
      return;
    }

    // Show confirmation dialog first
    setShowDeactivateConfirm(true);
  };

  const confirmDeactivate = async () => {
    if (!onDeactivate) {
      setErrorMessage('Account deactivation not available');
      return;
    }

    try {
      await onDeactivate();
      setSuccessMessage('Account deactivated successfully!');
      setShowDeactivateSection(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to deactivate account';
      setErrorMessage(errorMsg);
    }
  };

  const handleCancel = () => {
    console.log('🔍 EditUserForm: Cancel button clicked');
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <>
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
                    <SelectItem value="MERCHANT">Merchant</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-600">{errors.role}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Management Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <Lock className="w-5 h-5" />
                Password Management
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                {showPasswordSection ? 'Hide' : 'Change Password'}
              </Button>
            </div>
            
            {showPasswordSection && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      placeholder="Enter current password"
                      className={passwordErrors.currentPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    <p className="text-xs text-gray-500">Required if changing your own password</p>
                    {passwordErrors.currentPassword && (
                      <p className="text-sm text-red-600">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password *</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      placeholder="Enter new password"
                      className={passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                      required
                    />
                    <p className="text-xs text-gray-500">Must be at least 6 characters</p>
                    {passwordErrors.newPassword && (
                      <p className="text-sm text-red-600">{passwordErrors.newPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      placeholder="Confirm new password"
                      className={passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                      required
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {passwordErrors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-600">
                      ❌ <strong>Error:</strong> {passwordErrors.submit}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPasswordSection(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default">
                    Change Password
                  </Button>
                </div>
              </form>
            )}
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

        {/* Account Security Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <Shield className="w-5 h-5" />
                Account Security
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeactivateSection(!showDeactivateSection)}
              >
                {showDeactivateSection ? 'Hide' : 'Deactivate Account'}
              </Button>
            </div>
            
            {showDeactivateSection && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-800">Warning</p>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Deactivating this account will prevent the user from logging in and accessing the system. 
                    This action can be reversed by an administrator.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeactivateSection(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeactivate}
                  >
                    Deactivate Account
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-600">
              ✅ <strong>Success:</strong> {successMessage}
            </p>
          </div>
        )}

        {/* Validation Status */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Please fix the validation errors above before submitting.</strong>
            </p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">
              ❌ <strong>Error:</strong> {errorMessage}
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
            {isSubmitting ? 'Updating...' : 'Update User'}
          </Button>
        </div>
      </form>
    </>
  );
};
