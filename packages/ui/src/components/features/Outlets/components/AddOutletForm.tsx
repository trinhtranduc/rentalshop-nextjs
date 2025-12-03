'use client'

import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button, Input, Label, Textarea } from '@rentalshop/ui';
import type { OutletCreateInput } from '@rentalshop/types';
import { useOutletsTranslations, useCommonTranslations } from '@rentalshop/hooks';

interface AddOutletFormProps {
  onSave: (outletData: OutletCreateInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  merchantId?: number;
}

export const AddOutletForm: React.FC<AddOutletFormProps> = ({
  onSave,
  onCancel,
  isSubmitting = false,
  merchantId
}) => {
  const t = useOutletsTranslations();
  const tc = useCommonTranslations();
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
    description: '',
    merchantId: merchantId || 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Outlet name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData as OutletCreateInput);
    } catch (error) {
      console.error('Error saving outlet:', error);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Outlet Name - Required */}
      <div>
        <Label htmlFor="name" className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {t('fields.name')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder={t('placeholders.enterOutletName')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-xs text-red-600 mt-1">{errors.name}</p>
        )}
      </div>

      {/* Address */}
      <div>
        <Label htmlFor="address" className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {t('fields.address')}
        </Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          placeholder={t('placeholders.enterStreetAddress')}
        />
      </div>

      {/* City, State, ZIP Code - In one row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            {t('fields.city')}
          </Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            placeholder={t('placeholders.enterCity')}
          />
        </div>

        <div>
          <Label htmlFor="state" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            {t('fields.state')}
          </Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
            placeholder={t('placeholders.enterState')}
          />
        </div>

        <div>
          <Label htmlFor="zipCode" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            {t('fields.zipCode')}
          </Label>
          <Input
            id="zipCode"
            value={formData.zipCode}
            onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
            placeholder={t('placeholders.enterZipCode')}
          />
        </div>
      </div>

      {/* Country */}
      <div>
        <Label htmlFor="country" className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {t('fields.country')}
        </Label>
        <Input
          id="country"
          value={formData.country}
          onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
          placeholder={t('placeholders.enterCountry')}
        />
      </div>

      {/* Phone */}
      <div>
        <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {t('fields.phone')}
        </Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          placeholder={t('placeholders.enterOutletPhone')}
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {t('fields.description')}
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder={t('placeholders.enterOutletDescription')}
          rows={3}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
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
          {isSubmitting ? tc('buttons.saving') : tc('buttons.save')}
        </Button>
      </div>
    </form>
  );
};

