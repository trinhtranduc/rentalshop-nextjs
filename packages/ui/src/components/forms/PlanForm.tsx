'use client'

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  Textarea, 
  Badge,
  Switch,
  Label
} from '../ui';
import { 
  Package, 
  DollarSign, 
  Users, 
  CreditCard,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Star,
  Settings
} from 'lucide-react';
import type { 
  PlanCreateInput, 
  PlanUpdateInput,
  Plan,
  BillingCycle
} from '@rentalshop/types';
import { 
  BILLING_CYCLES,
  calculateDiscountedPrice,
  getBillingCycleDiscount,
  formatBillingCycle
} from '@rentalshop/constants';

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  billingCycleMonths: number;
  trialDays: number;
  maxOutlets: number;
  maxUsers: number;
  maxProducts: number;
  maxCustomers: number;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}

interface PlanFormProps {
  initialData?: Partial<PlanFormData>;
  onSubmit: (data: PlanCreateInput | PlanUpdateInput) => void;
  onCancel?: () => void;
  loading?: boolean;
  title?: string;
  submitText?: string | React.ReactNode;
  mode?: 'create' | 'edit';
  hideHeader?: boolean;
  hideSubmitButton?: boolean;
  formId?: string;
}

export const PlanForm: React.FC<PlanFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  title = 'Plan Information',
  submitText = 'Save Plan',
  mode = 'create',
  hideHeader = false,
  hideSubmitButton = false,
  formId
}) => {
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    description: '',
    price: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    billingCycleMonths: 1,
    trialDays: 0,
    maxOutlets: 1,
    maxUsers: 1,
    maxProducts: 10,
    maxCustomers: 50,
    features: [],
    isActive: true,
    isPopular: false,
    sortOrder: 0,
    ...initialData
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PlanFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  const handleInputChange = (field: keyof PlanFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBillingCycleChange = (cycle: BillingCycle) => {
    const cycleOption = BILLING_CYCLES.find(option => option.value === cycle);
    setFormData(prev => ({ 
      ...prev, 
      billingCycle: cycle,
      billingCycleMonths: cycleOption?.months || 1
    }));
    if (errors.billingCycle) {
      setErrors(prev => ({ ...prev, billingCycle: '' }));
    }
  };

  const handleNumberInputChange = (field: keyof PlanFormData, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    handleInputChange(field, numValue);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PlanFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Plan description is required';
    }

    if (formData.price < 0) {
      newErrors.price = 'Price must be non-negative';
    }

    if (formData.trialDays < 0) {
      newErrors.trialDays = 'Trial days must be non-negative';
    }

    if (formData.maxOutlets < -1) {
      newErrors.maxOutlets = 'Max outlets must be -1 (unlimited) or positive';
    }

    if (formData.maxUsers < -1) {
      newErrors.maxUsers = 'Max users must be -1 (unlimited) or positive';
    }

    if (formData.maxProducts < -1) {
      newErrors.maxProducts = 'Max products must be -1 (unlimited) or positive';
    }

    if (formData.maxCustomers < -1) {
      newErrors.maxCustomers = 'Max customers must be -1 (unlimited) or positive';
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
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting plan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      handleInputChange('features', [...formData.features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    handleInputChange('features', formData.features.filter((_, i) => i !== index));
  };

  const getLimitText = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toString();
  };

  const formatCurrency = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
            <p className="text-text-secondary mt-1">
              {mode === 'create' ? 'Create a new subscription plan' : 'Update plan information'}
            </p>
          </div>
          {mode === 'edit' && (
            <Badge variant={formData.isActive ? 'default' : 'secondary'}>
              {formData.isActive ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>
      )}

      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter plan name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
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
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this plan offers"
                rows={3}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Active Plan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPopular"
                  checked={formData.isPopular}
                  onCheckedChange={(checked) => handleInputChange('isPopular', checked)}
                />
                <Label htmlFor="isPopular" className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  Popular Plan
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0"
                  className={errors.price ? 'border-red-500' : ''}
                />
                {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="VND">VND (₫)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingCycle">Billing Cycle</Label>
                <Select value={formData.billingCycle} onValueChange={handleBillingCycleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((cycle) => (
                      <SelectItem key={cycle.value} value={cycle.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{cycle.label}</span>
                          <span className="text-xs text-text-tertiary">{cycle.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trialDays">Trial Days</Label>
              <Input
                id="trialDays"
                type="number"
                value={formData.trialDays}
                onChange={(e) => handleNumberInputChange('trialDays', e.target.value)}
                placeholder="0"
                min="0"
                className={errors.trialDays ? 'border-red-500' : ''}
              />
              {errors.trialDays && <p className="text-sm text-red-500">{errors.trialDays}</p>}
            </div>

            {/* Price Preview */}
            <div className="bg-bg-secondary p-4 rounded-lg">
              <div className="text-sm text-text-secondary mb-2">Price Preview:</div>
              <div className="text-2xl font-bold text-text-primary">
                {formatCurrency(formData.price, formData.currency)}
                <span className="text-lg text-text-secondary font-normal ml-2">
                  /{formatBillingCycle(formData.billingCycle).toLowerCase()}
                </span>
              </div>
              
              {/* Show discount if applicable */}
              {getBillingCycleDiscount(formData.billingCycle) > 0 && (
                <div className="text-sm text-action-success mt-1">
                  {getBillingCycleDiscount(formData.billingCycle)}% discount applied
                </div>
              )}
              
              {/* Show total price for longer cycles */}
              {formData.billingCycleMonths > 1 && (
                <div className="text-sm text-text-secondary mt-1">
                  Total: {formatCurrency(calculateDiscountedPrice(formData.price, formData.billingCycle), formData.currency)} for {formData.billingCycleMonths} months
                </div>
              )}
              
              {formData.trialDays > 0 && (
                <div className="text-sm text-action-primary mt-1">
                  {formData.trialDays}-day free trial
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Usage Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxOutlets">Max Outlets</Label>
                <Input
                  id="maxOutlets"
                  type="number"
                  value={formData.maxOutlets}
                  onChange={(e) => handleNumberInputChange('maxOutlets', e.target.value)}
                  placeholder="1"
                  min="-1"
                  className={errors.maxOutlets ? 'border-red-500' : ''}
                />
                {errors.maxOutlets && <p className="text-sm text-red-500">{errors.maxOutlets}</p>}
                <p className="text-xs text-text-tertiary">Use -1 for unlimited</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUsers">Max Users</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={formData.maxUsers}
                  onChange={(e) => handleNumberInputChange('maxUsers', e.target.value)}
                  placeholder="1"
                  min="-1"
                  className={errors.maxUsers ? 'border-red-500' : ''}
                />
                {errors.maxUsers && <p className="text-sm text-red-500">{errors.maxUsers}</p>}
                <p className="text-xs text-text-tertiary">Use -1 for unlimited</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxProducts">Max Products</Label>
                <Input
                  id="maxProducts"
                  type="number"
                  value={formData.maxProducts}
                  onChange={(e) => handleNumberInputChange('maxProducts', e.target.value)}
                  placeholder="10"
                  min="-1"
                  className={errors.maxProducts ? 'border-red-500' : ''}
                />
                {errors.maxProducts && <p className="text-sm text-red-500">{errors.maxProducts}</p>}
                <p className="text-xs text-text-tertiary">Use -1 for unlimited</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCustomers">Max Customers</Label>
                <Input
                  id="maxCustomers"
                  type="number"
                  value={formData.maxCustomers}
                  onChange={(e) => handleNumberInputChange('maxCustomers', e.target.value)}
                  placeholder="50"
                  min="-1"
                  className={errors.maxCustomers ? 'border-red-500' : ''}
                />
                {errors.maxCustomers && <p className="text-sm text-red-500">{errors.maxCustomers}</p>}
                <p className="text-xs text-text-tertiary">Use -1 for unlimited</p>
              </div>
            </div>

            {/* Limits Preview */}
            <div className="bg-bg-secondary p-4 rounded-lg">
              <div className="text-sm text-text-secondary mb-2">Limits Preview:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-text-tertiary" />
                    <span className="text-text-secondary">Outlets:</span>
                  </div>
                  <div className="font-medium text-text-primary">{getLimitText(formData.maxOutlets)}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-text-tertiary" />
                    <span className="text-text-secondary">Users:</span>
                  </div>
                  <div className="font-medium text-text-primary">{getLimitText(formData.maxUsers)}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-text-tertiary" />
                    <span className="text-text-secondary">Products:</span>
                  </div>
                  <div className="font-medium text-text-primary">{getLimitText(formData.maxProducts)}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-text-tertiary" />
                    <span className="text-text-secondary">Customers:</span>
                  </div>
                  <div className="font-medium text-text-primary">{getLimitText(formData.maxCustomers)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add a feature..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              />
              <Button type="button" onClick={addFeature} disabled={!newFeature.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {formData.features.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-text-primary">Plan Features:</div>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between bg-bg-secondary p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-action-success" />
                        <span className="text-sm text-text-primary">{feature}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4 text-text-tertiary" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {!hideSubmitButton && (
          <div className="flex items-center justify-end space-x-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || loading}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                submitText
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
