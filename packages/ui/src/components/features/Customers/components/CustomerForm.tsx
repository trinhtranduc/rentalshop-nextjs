'use client'

import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@rentalshop/ui';
import { Input } from '@rentalshop/ui';
import { Label } from '@rentalshop/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentalshop/ui';
import { Card, CardContent } from '@rentalshop/ui';
import type { Customer, CustomerCreateInput, CustomerUpdateInput } from '@rentalshop/types';
import { useCustomerTranslations } from '@rentalshop/hooks';

interface CustomerFormProps {
  mode?: 'create' | 'edit';
  customer?: Customer;
  onSave: (customerData: CustomerCreateInput | CustomerUpdateInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  currentUser?: any;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  mode = 'create',
  customer,
  onSave,
  onCancel,
  isSubmitting: externalIsSubmitting,
  currentUser
}) => {
  const t = useCustomerTranslations();
  
  const [formData, setFormData] = useState({
    name: '', // Combined name field (will be split into firstName/lastName on submit)
    email: '',
    phone: '',
    companyName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    dateOfBirth: '',
    idNumber: '',
    idType: 'other' as 'passport' | 'drivers_license' | 'national_id' | 'other',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when customer prop changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && customer) {
      // Combine firstName and lastName into name field
      const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
      setFormData({
        name: fullName,
        email: customer.email || '',
        phone: customer.phone || '',
        companyName: (customer as any).companyName || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zipCode: customer.zipCode || '',
        country: customer.country || '',
        dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split('T')[0] : '',
        idNumber: customer.idNumber || '',
        idType: customer.idType || 'other',
        notes: customer.notes || ''
      });
    }
  }, [mode, customer]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate name - split into parts to validate first name
    const nameParts = formData.name?.trim().split(' ') || [];
    const firstName = nameParts[0] || '';
    if (!firstName.trim()) {
      newErrors.name = 'Customer name is required';
    }

    // phone is optional - no validation needed

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Split name into firstName and lastName (same logic as UserForm)
      const nameParts = formData.name.trim().split(' ').filter(part => part.length > 0);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Clean customer data: remove empty strings, only send fields with actual values
      const cleanedData: any = {};
      const rawData = {
        ...(mode === 'edit' && customer ? { id: customer.id } : {}),
        firstName: firstName,
        lastName: lastName,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        companyName: formData.companyName.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        country: formData.country.trim(),
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
        idNumber: formData.idNumber.trim(),
        idType: formData.idType,
        notes: formData.notes.trim(),
        // merchantId will be automatically determined from JWT token
        // Only ADMIN users need to send merchantId in request
      };
      
      Object.entries(rawData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'string' && value.trim() !== '') {
            cleanedData[key] = value;
          } else if (typeof value !== 'string') {
            cleanedData[key] = value;
          }
        }
      });
      
      const customerData = cleanedData;

      await onSave(customerData);
    } catch (error) {
      console.error('Error saving customer:', error);
      // Error handling is done by the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const isFormSubmitting = isSubmitting || externalIsSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t('fields.name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('placeholders.enterCustomerName')}
                className={errors.name ? 'border-red-500' : ''}
                disabled={isFormSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className={errors.email ? 'border-red-500' : ''}
                disabled={isFormSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
                className={errors.phone ? 'border-red-500' : ''}
                disabled={isFormSubmitting}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter company name"
                disabled={isFormSubmitting}
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                disabled={isFormSubmitting}
              />
            </div>

            {/* ID Type */}
            <div className="space-y-2">
              <Label htmlFor="idType">ID Type</Label>
              <Select
                value={formData.idType}
                onValueChange={(value) => handleInputChange('idType', value)}
                disabled={isFormSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="drivers_license">Driver's License</SelectItem>
                  <SelectItem value="national_id">National ID</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ID Number */}
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number</Label>
              <Input
                id="idNumber"
                value={formData.idNumber}
                onChange={(e) => handleInputChange('idNumber', e.target.value)}
                placeholder="Enter ID number"
                disabled={isFormSubmitting}
              />
            </div>
          </div>

          {/* Address */}
          <div className="mt-4 space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter street address"
              disabled={isFormSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Enter city"
                disabled={isFormSubmitting}
              />
            </div>

            {/* State */}
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="Enter state"
                disabled={isFormSubmitting}
              />
            </div>

            {/* Zip Code */}
            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                placeholder="Enter zip code"
                disabled={isFormSubmitting}
              />
            </div>
          </div>

          {/* Country */}
          <div className="mt-4 space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              placeholder="Enter country"
              disabled={isFormSubmitting}
            />
          </div>

          {/* Notes */}
          <div className="mt-4 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Enter any additional notes"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isFormSubmitting}
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
          disabled={isFormSubmitting}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isFormSubmitting}
        >
          <Save className="w-4 h-4 mr-2" />
          {isFormSubmitting ? 'Saving...' : mode === 'create' ? 'Create Customer' : 'Update Customer'}
        </Button>
      </div>
    </form>
  );
};

export default CustomerForm;
