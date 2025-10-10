"use client";

import React, { useState, useEffect } from 'react';
import { 
  Button,
  Input,
  Label,
  Textarea,
  Switch
} from '@rentalshop/ui';

// Local type definitions
interface BillingCycle {
  id: number;
  name: string;
  value: string;
  months: number;
  discount: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface BillingCycleFormProps {
  initialData?: Partial<BillingCycle>;
  onSubmit: (data: BillingCycleFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface BillingCycleFormData {
  name: string;
  value: string;
  months: number;
  discount: number;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

export const BillingCycleForm: React.FC<BillingCycleFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<BillingCycleFormData>({
    name: initialData.name || '',
    value: initialData.value || '',
    months: initialData.months || 1,
    discount: initialData.discount || 0,
    description: initialData.description || '',
    isActive: initialData.isActive !== undefined ? initialData.isActive : true,
    sortOrder: initialData.sortOrder || 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        value: initialData.value || '',
        months: initialData.months || 1,
        discount: initialData.discount || 0,
        description: initialData.description || '',
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
        sortOrder: initialData.sortOrder || 0
      });
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.value.trim()) {
      newErrors.value = 'Value is required';
    } else if (!/^[a-z_]+$/.test(formData.value)) {
      newErrors.value = 'Value must contain only lowercase letters and underscores';
    }

    if (formData.months < 1) {
      newErrors.months = 'Months must be at least 1';
    }

    if (formData.discount < 0 || formData.discount > 100) {
      newErrors.discount = 'Discount must be between 0 and 100';
    }

    if (formData.sortOrder < 0) {
      newErrors.sortOrder = 'Sort order must be non-negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof BillingCycleFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleNumberInputChange = (field: keyof BillingCycleFormData, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue)) {
      handleInputChange(field, numValue);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., Monthly, Quarterly"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="value">Value *</Label>
          <Input
            id="value"
            type="text"
            value={formData.value}
            onChange={(e) => handleInputChange('value', e.target.value)}
            placeholder="e.g., monthly, quarterly"
            className={errors.value ? 'border-red-500' : ''}
          />
          {errors.value && <p className="text-sm text-red-500">{errors.value}</p>}
          <p className="text-xs text-text-tertiary">
            Use lowercase letters and underscores only
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="months">Months *</Label>
          <Input
            id="months"
            type="number"
            value={formData.months}
            onChange={(e) => handleNumberInputChange('months', e.target.value)}
            placeholder="1"
            min="1"
            className={errors.months ? 'border-red-500' : ''}
          />
          {errors.months && <p className="text-sm text-red-500">{errors.months}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount">Discount (%)</Label>
          <Input
            id="discount"
            type="number"
            value={formData.discount}
            onChange={(e) => handleNumberInputChange('discount', e.target.value)}
            placeholder="0"
            min="0"
            max="100"
            step="0.1"
            className={errors.discount ? 'border-red-500' : ''}
          />
          {errors.discount && <p className="text-sm text-red-500">{errors.discount}</p>}
          <p className="text-xs text-text-tertiary">
            Percentage discount for this billing cycle (0-100)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            value={formData.sortOrder}
            onChange={(e) => handleNumberInputChange('sortOrder', e.target.value)}
            placeholder="0"
            min="0"
            className={errors.sortOrder ? 'border-red-500' : ''}
          />
          {errors.sortOrder && <p className="text-sm text-red-500">{errors.sortOrder}</p>}
          <p className="text-xs text-text-tertiary">
            Lower numbers appear first in lists
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="isActive">Active</Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
            />
            <span className="text-sm text-text-secondary">
              {formData.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-xs text-text-tertiary">
            Inactive billing cycles won't be available for selection
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe this billing cycle..."
          rows={3}
        />
        <p className="text-xs text-text-tertiary">
          Optional description for this billing cycle
        </p>
      </div>

      {/* Preview */}
      <div className="bg-bg-secondary p-4 rounded-lg">
        <h4 className="font-medium text-text-primary mb-2">Preview</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-text-secondary">Name:</span> {formData.name || 'Not set'}
          </div>
          <div>
            <span className="text-text-secondary">Value:</span> {formData.value || 'Not set'}
          </div>
          <div>
            <span className="text-text-secondary">Duration:</span> {formData.months} {formData.months === 1 ? 'month' : 'months'}
          </div>
          <div>
            <span className="text-text-secondary">Discount:</span> {formData.discount}%
          </div>
          <div>
            <span className="text-text-secondary">Status:</span> {formData.isActive ? 'Active' : 'Inactive'}
          </div>
          {formData.description && (
            <div>
              <span className="text-text-secondary">Description:</span> {formData.description}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-6 border-t">
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
        >
          {loading ? 'Saving...' : (initialData.id ? 'Update Billing Cycle' : 'Create Billing Cycle')}
        </Button>
      </div>
    </form>
  );
};
