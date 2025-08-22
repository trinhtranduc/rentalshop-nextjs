'use client'

import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Card, CardContent } from '../../../ui/card';
import type { CustomerCreateInput } from '@rentalshop/types';

interface AddCustomerFormProps {
  onSave: (customerData: CustomerCreateInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const AddCustomerForm: React.FC<AddCustomerFormProps> = ({
  onSave,
  onCancel,
  isSubmitting: externalIsSubmitting
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    status: 'active' as 'active' | 'inactive' | 'blocked',
    membershipLevel: 'basic' as 'basic' | 'premium' | 'vip'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use external isSubmitting if provided, otherwise use internal state
  const isSubmitting = externalIsSubmitting !== undefined ? externalIsSubmitting : internalIsSubmitting;

  console.log('🔍 AddCustomerForm: Component rendered');

  const handleInputChange = (field: string, value: string) => {
    console.log('🔍 AddCustomerForm: Input changed:', { field, value });
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

    // First name validation - required
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation - required
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation - optional but validate format if provided
    if (formData.email && formData.email.trim()) {
      if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
        newErrors.email = 'Email is invalid';
      }
    }

    // Phone validation - required and validate format
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.phone.trim())) {
      newErrors.phone = 'Phone number contains invalid characters';
    } else if (formData.phone.trim().length < 8) {
      newErrors.phone = 'Phone number must be at least 8 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 AddCustomerForm: Form submitted');
    
    if (!validateForm()) {
      console.log('❌ AddCustomerForm: Validation failed');
      return;
    }

    try {
      setInternalIsSubmitting(true);
      setErrorMessage(null);
      
      console.log('🔍 AddCustomerForm: Calling onSave with data:', formData);
      
      await onSave(formData);
      
      console.log('✅ AddCustomerForm: Customer saved successfully');
      
    } catch (error) {
      console.error('❌ AddCustomerForm: Error saving customer:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(errorMessage);
    } finally {
      setInternalIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Personal Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
                className={errors.lastName ? 'border-red-500' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address (optional)"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number (e.g., +1234567890)"
                className={errors.phone ? 'border-red-500' : ''}
                required
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone}</p>
              )}
              <p className="text-xs text-gray-500">
                Format: numbers, +, -, spaces, parentheses. Min 8 characters.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter company name (optional)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter street address (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Enter city (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="Enter state (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                <Input
                  id="zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  placeholder="Enter ZIP code (optional)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Enter country (optional)"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
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
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Creating...' : 'Create Customer'}
        </Button>
      </div>
    </form>
  );
};
