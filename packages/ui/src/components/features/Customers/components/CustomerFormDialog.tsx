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
import { useCustomerTranslations, useCommonTranslations, useAuth } from '@rentalshop/hooks';

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
  const { user } = useAuth();
  
  // Debug: Log merchantId prop
  React.useEffect(() => {
    if (mode === 'create') {
      console.log('🔍 CustomerFormDialog - merchantId prop:', {
        merchantId,
        userMerchantId: user?.merchantId,
        userMerchant: user?.merchant,
        userRole: user?.role,
        hasMerchantId: !!merchantId,
        merchantIdType: typeof merchantId
      });
    }
  }, [merchantId, mode, user]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form data - use 'name' field instead of firstName/lastName
  interface FormDataState {
    name?: string; // Combined name field
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    idNumber?: string;
    notes?: string;
  }

  const getInitialFormData = (): FormDataState => {
    if (mode === 'edit' && customer) {
      // Combine firstName and lastName into name field
      const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
      return {
        name: fullName,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zipCode: customer.zipCode || '',
        country: customer.country || '',
        idNumber: (customer as any).idNumber || '',
        notes: (customer as any).notes || '',
      };
    }
    return {
      name: initialSearchQuery || '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      idNumber: '',
      notes: '',
    };
  };

  const [formData, setFormData] = useState<FormDataState>(getInitialFormData());

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
      setErrors({});
      setErrorMessage(null);
      // Edit opens the extra details when there is something in them
      const c: any = customer;
      setShowMoreFields(mode === 'edit' && !!c && !!(c.address || c.city || c.idNumber || c.notes));
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

    // Validate name (required) - split into parts to validate first name
    const nameParts = (formData.name || '').trim().split(' ').filter(part => part.length > 0);
    const firstName = nameParts[0] || '';
    if (!firstName.trim()) {
      newErrors.name = t('validation.firstNameRequired') || 'Customer name is required';
    } else if (firstName.trim().length < 2) {
      newErrors.name = t('validation.firstNameMinLength') || 'First name must be at least 2 characters';
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

    // Backend will validate merchantId from userScope, but we can pre-fill it for UX
    // ADMIN: merchantId is required (they can choose which merchant)
    // Non-admin: merchantId will be auto-resolved from userScope by backend
    if (mode === 'create' && user?.role === 'ADMIN' && !merchantId) {
      setErrorMessage('Merchant ID is required to create a customer.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      
      // Split name into firstName and lastName (same logic as UserForm)
      const nameParts = (formData.name || '').trim().split(' ').filter(part => part.length > 0);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Clean customer data: remove empty strings, but always include firstName and lastName (even if empty)
      const cleanData = (data: any) => {
        const cleaned: any = {};
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            // Always include firstName and lastName (even if empty string) - required by backend
            if (key === 'firstName' || key === 'lastName') {
              cleaned[key] = value;
            } else if (typeof value === 'string' && value.trim() !== '') {
              cleaned[key] = value;
            } else if (typeof value === 'string' && mode === 'edit' && key !== 'phone') {
              // Edit sends a cleared field as '' so it is actually cleared (it used to be dropped).
              // Not phone: it is unique per merchant, so two empty phones would collide.
              cleaned[key] = '';
            } else if (typeof value !== 'string') {
              cleaned[key] = value;
            }
          }
        });
        return cleaned;
      };
      
      const baseData = {
        firstName,
        lastName,
        email: formData.email || '',
        phone: formData.phone || '',
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        zipCode: formData.zipCode || '',
        country: formData.country || '',
        idNumber: formData.idNumber || '',
        notes: formData.notes || '',
      };

      const submitData = mode === 'edit' 
        ? cleanData({ ...baseData } as CustomerUpdateInput)
        : cleanData({
            ...baseData,
            // Always include merchantId if available (backend will validate from userScope)
            // This helps with UX (pre-fill) and backend will override if needed for security
            ...(merchantId && merchantId > 0 ? { merchantId } : {}),
          } as CustomerCreateInput);
      
      // Debug: Log data being sent
      console.log('🔍 CustomerFormDialog - Submitting data:', {
        mode,
        merchantId,
        hasMerchantId: !!(merchantId && merchantId > 0),
        submitData: mode === 'create' ? submitData : 'edit mode (no merchantId)',
        userRole: user?.role
      });
      
      await onSave(submitData);
      onOpenChange(false);
    } catch (error) {
      let errorMsg = t('messages.unexpectedError');
      if (error instanceof Error) {
        if (error.message.includes('DUPLICATE_PHONE')) {
          errorMsg = t('messages.duplicatePhone');
        } else if (error.message.includes('DUPLICATE_EMAIL')) {
          errorMsg = t('messages.duplicateEmail');
        } else {
          errorMsg = error.message;
        }
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (
    key: keyof FormDataState,
    label: string,
    opts: { type?: string; inputMode?: 'tel' | 'email' | 'text'; autoComplete?: string; autoFocus?: boolean; required?: boolean; placeholder?: string }
  ) => (
    <div>
      <Label htmlFor={key} className="text-xs font-medium text-muted-foreground mb-1.5 block">
        {label} {opts.required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={key}
        type={opts.type || 'text'}
        inputMode={opts.inputMode}
        autoComplete={opts.autoComplete}
        autoFocus={opts.autoFocus}
        value={formData[key] || ''}
        onChange={(e) => handleInputChange(key, e.target.value)}
        placeholder={opts.placeholder}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${key}-error` : undefined}
        className={errors[key] ? 'border-red-500' : ''}
      />
      {errors[key] && (
        <p id={`${key}-error`} className="mt-1 text-xs text-red-600">{errors[key]}</p>
      )}
    </div>
  );

  const dialogTitle = mode === 'edit' ? t('editCustomer') : t('createCustomer');
  const editingName = mode === 'edit' ? [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim() : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {dialogTitle}
          </DialogTitle>
          {editingName && <p className="text-sm text-gray-600">{editingName}</p>}
        </DialogHeader>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto px-6 py-4">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}

          {/* Essential Fields */}
          <div className="space-y-4">
            {/* Phone first: shops find customers by phone */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field('phone', t('fields.phone'), { type: 'tel', inputMode: 'tel', autoComplete: 'tel', autoFocus: mode === 'create', placeholder: t('placeholders.enterPhone') })}
              {field('name', t('fields.fullName'), { required: true, autoComplete: 'name', placeholder: t('placeholders.enterFullName') })}
            </div>
            {field('email', t('fields.email'), { type: 'email', autoComplete: 'email', placeholder: t('placeholders.enterEmail') })}

            {/* Rarely needed details stay folded */}
            <button
              type="button"
              onClick={() => setShowMoreFields(!showMoreFields)}
              aria-expanded={showMoreFields}
              className="flex min-h-[36px] items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              {showMoreFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>{showMoreFields ? t('form.hideDetails') : t('form.moreDetails')}</span>
            </button>

            {showMoreFields && (
              <div className="space-y-4 border-t pt-4">
                {field('address', t('fields.address'), { autoComplete: 'street-address', placeholder: t('placeholders.enterStreetAddress') })}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {field('city', t('fields.city'), { placeholder: t('placeholders.enterCity') })}
                  {field('state', t('fields.state'), { placeholder: t('placeholders.enterState') })}
                  {field('zipCode', t('fields.zipCode'), { placeholder: t('placeholders.enterZipCode') })}
                </div>
                {field('idNumber', t('fields.idNumber'), {})}
                <div>
                  <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    {t('fields.notes')}
                  </Label>
                  <textarea
                    id="notes"
                    rows={2}
                    value={formData.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
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

