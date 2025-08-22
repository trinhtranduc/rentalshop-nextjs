'use client'

import React, { useState } from 'react';
import { Save, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import type { UserCreateInput } from '@rentalshop/types';

interface AddUserFormProps {
  onSave: (userData: UserCreateInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const AddUserForm: React.FC<AddUserFormProps> = ({
  onSave,
  onCancel,
  isSubmitting: externalIsSubmitting
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: undefined as 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF' | undefined,
    isActive: true,
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use external isSubmitting if provided, otherwise use internal state
  const isSubmitting = externalIsSubmitting !== undefined ? externalIsSubmitting : internalIsSubmitting;

  console.log('🔍 AddUserForm: Component rendered');

  const handleInputChange = (field: string, value: string | boolean) => {
    console.log('🔍 AddUserForm: Input changed:', { field, value });
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
    setErrorMessage(null);
    
    try {
      const submitData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role as 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF',
        isActive: formData.isActive,
        password: formData.password
      };
      
      console.log('🔍 AddUserForm: About to call onSave with data:', submitData);
      await onSave(submitData);
      console.log('✅ AddUserForm: User created successfully');
      
    } catch (error) {
      console.error('❌ AddUserForm: Error saving user:', error);
      const errorMsg = error instanceof Error ? error.message : 'An error occurred while saving the user';
      setErrorMessage(errorMsg);
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

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">
            ❌ <strong>Error:</strong> {errorMessage}
          </p>
          <p className="text-xs text-red-500 mt-1">
            Please fix the error and try again.
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