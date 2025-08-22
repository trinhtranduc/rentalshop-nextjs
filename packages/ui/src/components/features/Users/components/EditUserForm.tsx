'use client'

import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Card, CardContent } from '../../../ui/card';
import type { User, UserUpdateInput } from '@rentalshop/types';

interface EditUserFormProps {
  user: User;
  onSave: (userData: UserUpdateInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const EditUserForm: React.FC<EditUserFormProps> = ({
  user,
  onSave,
  onCancel,
  isSubmitting: externalIsSubmitting,
}) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phone || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);

  // Use external isSubmitting if provided, otherwise use internal state
  const isSubmitting = externalIsSubmitting !== undefined ? externalIsSubmitting : internalIsSubmitting;

  console.log('🔍 EditUserForm: Component rendered for user:', user.id);

  // Update form data when user changes
  useEffect(() => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || ''
    });
    setErrors({});
  }, [user]);

  const handleInputChange = (field: string, value: string | boolean) => {
    console.log('🔍 EditUserForm: Input changed:', { field, value });
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // First Name validation - required
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last Name validation - required
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
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

    setErrors(newErrors);
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
    
    try {
      const submitData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
      };
      
      console.log('🔍 EditUserForm: About to call onSave with data:', submitData);
      await onSave(submitData);
      console.log('✅ EditUserForm: User updated successfully');
      
    } catch (error) {
      console.error('❌ EditUserForm: Error updating user:', error);
      const errorMsg = error instanceof Error ? error.message : 'An error occurred while updating the user';
      // setErrorMessage(errorMsg); // Removed as per edit hint
    } finally {
      if (!externalIsSubmitting) {
        setInternalIsSubmitting(false);
      }
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
        {/* Personal Information - Only Section */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                  className={errors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                  disabled={isSubmitting}
                  required
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                  className={errors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                  disabled={isSubmitting}
                  required
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">{errors.lastName}</p>
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
            </div>
          </CardContent>
        </Card>

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
