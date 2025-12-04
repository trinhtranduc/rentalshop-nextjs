"use client";

/**
 * CustomerFormDialog - Shared compact dialog component for creating/editing customers
 * Clean, minimal design with essential fields only
 * Follows DRY principle - single source of truth for customer form UI
 */

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  Button,
  Input,
  Label
} from '@rentalshop/ui';
import { Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { CustomerCreateInput, CustomerUpdateInput, Customer } from '@rentalshop/types';
import { useCustomerTranslations, useCommonTranslations } from '@rentalshop/hooks';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customerData: CustomerCreateInput | CustomerUpdateInput) => Promise<void>;
  merchantId?: number;
  initialSearchQuery?: string; // Pre-fill from search query (for create mode)
  customer?: Customer; // For edit mode
  mode?: 'create' | 'edit';
}

export const CustomerFormDialog: React.FC<CustomerFormDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  merchantId,
  initialSearchQuery = '',
  customer,
  mode = 'create'
}) => {
  const t = useCustomerTranslations();
  const tc = useCommonTranslations();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form data
  const getInitialFormData = (): Partial<CustomerCreateInput | CustomerUpdateInput> => {
    if (mode === 'edit' && customer) {
      return {
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zipCode: customer.zipCode || '',
        country: customer.country || '',
      };
    }
    return {
      firstName: initialSearchQuery || '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    };
  };

  const [formData, setFormData] = useState<Partial<CustomerCreateInput | CustomerUpdateInput>>(getInitialFormData());

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
      setErrors({});
      setErrorMessage(null);
      setShowMoreFields(false);
    }
  }, [open, initialSearchQuery, customer, mode]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = t('validation.firstNameRequired');
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = t('validation.firstNameMinLength');
    }

    if (formData.phone && formData.phone.trim()) {
      if (!/^[0-9+\-\s()]+$/.test(formData.phone.trim())) {
        newErrors.phone = t('validation.phoneInvalid');
      } else if (formData.phone.trim().length < 8) {
        newErrors.phone = t('validation.phoneMinLength');
      }
    }

    if (formData.email && formData.email.trim()) {
      if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
        newErrors.email = t('validation.emailInvalid');
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

    if (mode === 'create' && !merchantId) {
      setErrorMessage('Merchant ID is required to create a customer.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      
      // Clean customer data: remove empty strings, only send fields with actual values
      const cleanData = (data: any) => {
        const cleaned: any = {};
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'string' && value.trim() !== '') {
              cleaned[key] = value;
            } else if (typeof value !== 'string') {
              cleaned[key] = value;
            }
          }
        });
        return cleaned;
      };
      
      const submitData = mode === 'edit' 
        ? cleanData({ ...formData } as CustomerUpdateInput)
        : cleanData({
            ...formData,
            firstName: formData.firstName || '',
            merchantId: merchantId || 0,
          } as CustomerCreateInput);
      
      await onSave(submitData);
      onOpenChange(false);
    } catch (error) {
      let errorMsg = 'An unexpected error occurred';
      if (error instanceof Error) {
        if (error.message.includes('DUPLICATE_PHONE')) {
          errorMsg = 'A customer with this phone number already exists';
        } else if (error.message.includes('DUPLICATE_EMAIL')) {
          errorMsg = 'A customer with this email address already exists';
        } else {
          errorMsg = error.message;
        }
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = mode === 'edit' 
    ? `${t('editCustomer')}: ${customer?.firstName} ${customer?.lastName || ''}`.trim()
    : t('createCustomer');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}

          {/* Essential Fields - 2 Columns */}
          <div className="space-y-4">
            {/* First Name & Last Name - Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              {/* First Name - Required */}
              <div>
                <Label htmlFor="firstName" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {t('fields.firstName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder={t('placeholders.enterFirstName')}
                  className={errors.firstName ? 'border-red-500' : ''}
                  autoFocus={mode === 'create'}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <Label htmlFor="lastName" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {t('fields.lastName')}
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder={t('placeholders.enterLastName')}
                  className=""
                />
              </div>
            </div>

            {/* Phone & Email - Row 2 */}
            <div className="grid grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {t('fields.phone')}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder={t('placeholders.enterPhone')}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {t('fields.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t('placeholders.enterEmail')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            {/* More Fields Toggle */}
            <button
              type="button"
              onClick={() => setShowMoreFields(!showMoreFields)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors py-2"
            >
              {showMoreFields ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Hide additional details</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Add more details (optional)</span>
                </>
              )}
            </button>

            {/* More Fields - Collapsible */}
            {showMoreFields && (
              <div className="space-y-4 pt-2 border-t">
                {/* Address */}
                <div>
                  <Label htmlFor="address" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    {t('fields.address')}
                  </Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder={t('placeholders.enterStreetAddress')}
                    className=""
                  />
                </div>

                {/* City, State, ZIP */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="city" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      {t('fields.city')}
                    </Label>
                    <Input
                      id="city"
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder={t('placeholders.enterCity')}
                      className=""
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      {t('fields.state')}
                    </Label>
                    <Input
                      id="state"
                      type="text"
                      value={formData.state || ''}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder={t('placeholders.enterState')}
                      className=""
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      {t('fields.zipCode')}
                    </Label>
                    <Input
                      id="zipCode"
                      type="text"
                      value={formData.zipCode || ''}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder={t('placeholders.enterZipCode')}
                      className=""
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              {tc('buttons.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting 
                ? (mode === 'edit' ? tc('buttons.updating') : tc('buttons.creating'))
                : (mode === 'edit' ? t('updateCustomer') : t('createCustomer'))
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

