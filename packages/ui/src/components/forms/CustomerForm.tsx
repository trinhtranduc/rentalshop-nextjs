import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import type { CustomerInput } from '@rentalshop/database';

// Form-specific interface with string date for easier form handling
interface CustomerFormData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: string; // String for form input
  notes?: string;
  merchantId: string;
}

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerInput) => void;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
  submitText?: string;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  title = 'Customer Information',
  submitText = 'Save Customer'
}) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    dateOfBirth: '',
    notes: '',
    merchantId: '',
    ...initialData
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        dateOfBirth: initialData.dateOfBirth || ''
      }));
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerFormData, string>> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.merchantId) {
      newErrors.merchantId = 'Merchant is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Convert form data to database format
      const customerInput: CustomerInput = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined
      };
      onSubmit(customerInput);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Personal Information */}
      <Card className="w-full border border-gray-200 shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <Input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
                className={cn(
                  "w-full",
                  errors.firstName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                )}
              />
              {errors.firstName && (
                <p className="mt-2 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>
            
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <Input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
                className={cn(
                  "w-full",
                  errors.lastName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                )}
              />
              {errors.lastName && (
                <p className="mt-2 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
            
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className={cn(
                  "w-full",
                  errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                )}
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
                className={cn(
                  "w-full",
                  errors.phone ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                )}
              />
              {errors.phone && (
                <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
            
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                placeholder="Select date of birth"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Address Information */}
      <Card className="w-full border border-gray-200 shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Address Information
          </h3>
          <div className="space-y-6">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter street address"
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Enter city"
                  className="w-full"
                />
              </div>
              
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                <Input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="Enter state"
                  className="w-full"
                />
              </div>
              
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP/Postal Code
                </label>
                <Input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  placeholder="Enter ZIP code"
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <Input
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Enter country"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Information */}
      <Card className="w-full border border-gray-200 shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Additional Information
          </h3>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Enter any additional notes about the customer"
            />
          </div>
        </div>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? 'Saving...' : submitText}
        </Button>
      </div>
    </div>
  );
}; 