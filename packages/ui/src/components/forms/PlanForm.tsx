'use client'

import React, { useState, useEffect, useRef } from 'react';
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
  Label,
  LimitInput
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
  Settings,
  Monitor,
  Smartphone,
  Globe
} from 'lucide-react';
import type { 
  PlanCreateInput, 
  PlanUpdateInput,
  Plan,
  BillingCycle
} from '@rentalshop/types';
// Import billing cycles - use the array directly from constants
// Note: BILLING_CYCLES_ARRAY should be exported from @rentalshop/constants
// For now, we'll define it locally based on the constants structure
const BILLING_CYCLES_ARRAY = [
  {
    value: 'monthly' as const,
    label: 'Monthly',
    months: 1,
    discount: 0,
    description: 'Pay monthly, cancel anytime'
  },
  {
    value: 'quarterly' as const,
    label: 'Quarterly',
    months: 3,
    discount: 0,
    description: 'Pay quarterly, cancel anytime'
  },
  {
    value: 'semi_annual' as const,
    label: 'Semi-Annual',
    months: 6,
    discount: 5,
    description: 'Save 5% with semi-annual billing'
  },
  {
    value: 'annual' as const,
    label: 'Annual',
    months: 12,
    discount: 10,
    description: 'Save 10% with annual billing'
  }
];
import { 
  calculateDiscountedPrice,
  getBillingCycleDiscount,
  formatBillingCycle,
  translatePlanFeature,
  AVAILABLE_PLAN_FEATURES,
  BASIC_PLAN_FEATURES,
  PROFESSIONAL_PLAN_FEATURES
} from '@rentalshop/utils';
import { usePlansTranslations } from '@rentalshop/hooks';

interface PlanFormData {
  name: string;
  description: string;
  basePrice: number | string;  // ✅ Can be number or "Liên hệ" (Contact)
  priceType: 'fixed' | 'contact';  // ✅ NEW: Price type selector
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
  mobileOnly: boolean;  // ✅ NEW: Mobile-only plan flag
  allowWebAccess: boolean;  // ✅ NEW: Allow web access
  allowMobileAccess: boolean;  // ✅ NEW: Allow mobile access
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
  const t = usePlansTranslations();
  
  // Helper function to translate feature names (using utility)
  const translateFeature = (feature: string): string => {
    return translatePlanFeature(feature, t);
  };
  
  // Helper function to parse features from various formats
  const parseFeatures = (features: any): string[] => {
    if (!features) return [];
    if (Array.isArray(features)) return features;
    if (typeof features === 'string') {
      try {
        const parsed = JSON.parse(features);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Determine initial price type (check basePrice and description)
  const getInitialPriceType = (): 'fixed' | 'contact' => {
    // Check if basePrice is string (already contact)
    if (typeof initialData?.basePrice === 'string') {
      const priceStr = initialData.basePrice.toLowerCase();
      const contactText = t('fields.contactPrice').toLowerCase();
      if (priceStr === 'liên hệ' || priceStr === 'contact' || priceStr === contactText) {
        return 'contact';
      }
    }
    
    // Check if basePrice is 0 and description contains contact text
    if (initialData?.basePrice === 0 && initialData?.description) {
      const desc = initialData.description.toLowerCase();
      const contactText = t('fields.contactPrice').toLowerCase();
      if (desc.includes('liên hệ') || desc.includes('contact') || desc.includes(contactText)) {
        return 'contact';
      }
    }
    
    return 'fixed';
  };

  // Get initial basePrice value
  const getInitialBasePrice = (): number | string => {
    const priceType = getInitialPriceType();
    if (priceType === 'contact') {
      return t('fields.contactPrice');
    }
    return typeof initialData?.basePrice === 'number' ? initialData.basePrice : 0;
  };

  // Initialize form data with proper defaults
  const initialPriceType = getInitialPriceType();
  const initialBasePrice = getInitialBasePrice();
  
  // Extract limits from initialData - handle both direct limits object and nested structure
  const limits = (initialData as any)?.limits || {};
  const initialAllowWebAccess = limits.allowWebAccess !== undefined 
    ? limits.allowWebAccess 
    : true;
  const initialAllowMobileAccess = limits.allowMobileAccess !== undefined 
    ? limits.allowMobileAccess 
    : true;

  // Get limit values - check both limits object and direct properties (for backward compatibility)
  const getLimitValue = (limitKey: string, directKey: string, defaultValue: number) => {
    // First check limits object (correct structure from API)
    if (limits[limitKey] !== undefined) {
      return limits[limitKey];
    }
    // Fallback to direct property (backward compatibility)
    if ((initialData as any)?.[directKey] !== undefined) {
      return (initialData as any)[directKey];
    }
    return defaultValue;
  };

  const [formData, setFormData] = useState<PlanFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    basePrice: initialBasePrice,
    priceType: initialPriceType,
    currency: initialData?.currency || 'USD',
    billingCycle: (initialData as any)?.billingCycle || 'monthly',
    billingCycleMonths: (initialData as any)?.billingCycleMonths || 1,
    trialDays: initialData?.trialDays || 0,
    maxOutlets: getLimitValue('outlets', 'maxOutlets', 1),
    maxUsers: getLimitValue('users', 'maxUsers', 1),
    maxProducts: getLimitValue('products', 'maxProducts', 10),
    maxCustomers: getLimitValue('customers', 'maxCustomers', 50),
    features: parseFeatures(initialData?.features || []),
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    isPopular: initialData?.isPopular !== undefined ? initialData.isPopular : false,
    mobileOnly: (initialData as any)?.mobileOnly || false,
    allowWebAccess: initialAllowWebAccess,
    allowMobileAccess: initialAllowMobileAccess,
    sortOrder: initialData?.sortOrder || 0,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PlanFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update formData when initialData changes (only when plan ID changes to prevent infinite loops)
  const planId = (initialData as any)?.id;
  const prevPlanIdRef = useRef<number | undefined>(undefined);
  
  useEffect(() => {
    // Only update if plan ID changed (new plan loaded)
    if (!planId || planId === prevPlanIdRef.current) {
      return;
    }
    
    const limits = (initialData as any)?.limits || {};
    
    setFormData(prev => ({
      ...prev,
      name: initialData.name || prev.name,
      description: initialData.description || prev.description,
      basePrice: getInitialBasePrice(),
      priceType: getInitialPriceType(),
      currency: initialData.currency || prev.currency,
      trialDays: initialData.trialDays ?? prev.trialDays,
      maxOutlets: limits.outlets ?? prev.maxOutlets,
      maxUsers: limits.users ?? prev.maxUsers,
      maxProducts: limits.products ?? prev.maxProducts,
      maxCustomers: limits.customers ?? prev.maxCustomers,
      features: parseFeatures(initialData?.features || []),
      isActive: initialData.isActive ?? prev.isActive,
      isPopular: initialData.isPopular ?? prev.isPopular,
      allowWebAccess: limits.allowWebAccess ?? prev.allowWebAccess,
      allowMobileAccess: limits.allowMobileAccess ?? prev.allowMobileAccess,
      sortOrder: initialData.sortOrder ?? prev.sortOrder,
    }));
    
    prevPlanIdRef.current = planId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const handleInputChange = (field: keyof PlanFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBillingCycleChange = (cycle: BillingCycle) => {
    const cycleOption = BILLING_CYCLES_ARRAY.find((option: any) => option.value === cycle);
    setFormData(prev => ({ 
      ...prev, 
      billingCycle: cycle,
      billingCycleMonths: cycleOption?.months || 1
    }));
    if (errors.billingCycle) {
      setErrors(prev => ({ ...prev, billingCycle: '' }));
    }
  };


  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PlanFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Plan description is required';
    }

    // Validate basePrice: can be number >= 0 or "Liên hệ"
    if (typeof formData.basePrice === 'number' && formData.basePrice < 0) {
      newErrors.basePrice = 'Price must be non-negative';
    }
    if (typeof formData.basePrice === 'string' && formData.basePrice.trim() === '') {
      newErrors.basePrice = 'Price is required';
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
      // Transform formData to match PlanCreateInput/PlanUpdateInput
      // Convert basePrice: if priceType is 'contact', use 0; otherwise use number
      const basePriceValue = formData.priceType === 'contact' 
        ? 0  // Use 0 as placeholder for "Liên hệ"
        : typeof formData.basePrice === 'number' 
          ? formData.basePrice 
          : parseFloat(String(formData.basePrice)) || 0;

      // Include platform access in limits
      const limits = {
        outlets: formData.maxOutlets,
        users: formData.maxUsers,
        products: formData.maxProducts,
        customers: formData.maxCustomers,
        orders: 0, // Default, can be updated later
        allowWebAccess: formData.allowWebAccess,
        allowMobileAccess: formData.allowMobileAccess,
      };

      // Build submit data
      const submitData: any = {
        name: formData.name,
        description: formData.description,
        basePrice: basePriceValue,
        currency: formData.currency,
        trialDays: formData.trialDays,
        limits: limits,
        features: formData.features,
        isActive: formData.isActive,
        isPopular: formData.isPopular,
        sortOrder: formData.sortOrder,
      };

      // If priceType is 'contact', append to description
      if (formData.priceType === 'contact') {
        submitData.description = formData.description 
          ? `${formData.description} (${t('fields.contactPrice')})`
          : t('fields.contactPrice');
      }
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting plan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFeature = (featureKey: string) => {
    const currentFeatures = Array.isArray(formData.features) ? formData.features : [];
    if (currentFeatures.includes(featureKey)) {
      handleInputChange('features', currentFeatures.filter(f => f !== featureKey));
    } else {
      handleInputChange('features', [...currentFeatures, featureKey]);
    }
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
                  onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 0)}
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
              <div className="flex items-center space-x-2">
                <Switch
                  id="mobileOnly"
                  checked={formData.mobileOnly}
                  onCheckedChange={(checked) => handleInputChange('mobileOnly', checked)}
                />
                <Label htmlFor="mobileOnly" className="flex items-center gap-1">
                  <Settings className="w-4 h-4" />
                  Mobile Only
                </Label>
              </div>
            </div>

            {/* Platform Access Controls */}
            <div className="pt-4 border-t border-border">
              <div className="mb-4">
                <Label className="text-sm font-medium mb-1 block">{t('fields.platformAccess')}</Label>
                <p className="text-xs text-text-tertiary">
                  {t('fields.selectPlatforms')}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Web Access Card */}
                <div className={`relative border-2 rounded-lg p-4 transition-all ${
                  formData.allowWebAccess 
                    ? 'border-action-primary bg-action-primary/5' 
                    : 'border-border bg-bg-secondary'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        formData.allowWebAccess 
                          ? 'bg-action-primary/10 text-action-primary' 
                          : 'bg-bg-tertiary text-text-tertiary'
                      }`}>
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Label htmlFor="allowWebAccess" className="cursor-pointer font-medium text-text-primary">
                            {t('fields.webAccess')}
                          </Label>
                        </div>
                        <p className="text-xs text-text-tertiary">
                          {t('fields.webAccessDescription')}
                        </p>
                      </div>
                    </div>
                  <Switch
                    id="allowWebAccess"
                    checked={formData.allowWebAccess}
                    onCheckedChange={(checked) => handleInputChange('allowWebAccess', checked)}
                      className="ml-2"
                  />
                  </div>
                </div>

                {/* Mobile Access Card */}
                <div className={`relative border-2 rounded-lg p-4 transition-all ${
                  formData.allowMobileAccess 
                    ? 'border-action-primary bg-action-primary/5' 
                    : 'border-border bg-bg-secondary'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        formData.allowMobileAccess 
                          ? 'bg-action-primary/10 text-action-primary' 
                          : 'bg-bg-tertiary text-text-tertiary'
                      }`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Label htmlFor="allowMobileAccess" className="cursor-pointer font-medium text-text-primary">
                            {t('fields.mobileAccess')}
                  </Label>
                </div>
                        <p className="text-xs text-text-tertiary">
                          {t('fields.mobileAccessDescription')}
                        </p>
                      </div>
                    </div>
                  <Switch
                    id="allowMobileAccess"
                    checked={formData.allowMobileAccess}
                    onCheckedChange={(checked) => handleInputChange('allowMobileAccess', checked)}
                      className="ml-2"
                  />
                </div>
              </div>
              </div>

              {/* Platform Access Summary */}
              {(!formData.allowWebAccess && !formData.allowMobileAccess) && (
                <div className="mt-3 p-3 bg-action-warning/10 border border-action-warning/20 rounded-lg">
                  <p className="text-xs text-action-warning flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    <span>{t('fields.noPlatformAccessWarning')}</span>
                  </p>
                </div>
              )}

              {formData.allowWebAccess && formData.allowMobileAccess && (
                <div className="mt-3 p-3 bg-action-success/10 border border-action-success/20 rounded-lg">
                  <p className="text-xs text-action-success flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>{t('fields.allPlatformsEnabled')}</span>
                  </p>
                </div>
              )}
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
                <Label>{t('fields.basePrice')} *</Label>
                
                {/* Price Type Selector */}
                <div className="flex gap-4 mb-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="priceTypeFixed"
                      name="priceType"
                      checked={formData.priceType === 'fixed'}
                      onChange={() => {
                        handleInputChange('priceType', 'fixed');
                        handleInputChange('basePrice', 0);
                      }}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="priceTypeFixed" className="cursor-pointer">
                      {t('fields.enterPrice')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="priceTypeContact"
                      name="priceType"
                      checked={formData.priceType === 'contact'}
                      onChange={() => {
                        handleInputChange('priceType', 'contact');
                        handleInputChange('basePrice', t('fields.contactPrice'));
                      }}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="priceTypeContact" className="cursor-pointer">
                      {t('fields.contactPrice')}
                    </Label>
                  </div>
                </div>

                {/* Price Input */}
                {formData.priceType === 'fixed' ? (
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    value={typeof formData.basePrice === 'number' ? formData.basePrice : 0}
                    onChange={(e) => {
                      const numValue = parseFloat(e.target.value);
                      handleInputChange('basePrice', isNaN(numValue) ? 0 : numValue);
                    }}
                    placeholder="0.00"
                    min="0"
                    className={errors.basePrice ? 'border-red-500' : ''}
                  />
                ) : (
                  <div className="p-3 bg-bg-secondary rounded-lg border border-border">
                    <span className="text-text-primary font-medium">{t('fields.contactPrice')}</span>
                  </div>
                )}
                
                {errors.basePrice && <p className="text-sm text-red-500">{errors.basePrice}</p>}
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
                    {BILLING_CYCLES_ARRAY.map((cycle: any) => (
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
                onChange={(e) => handleInputChange('trialDays', parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className={errors.trialDays ? 'border-red-500' : ''}
              />
              {errors.trialDays && <p className="text-sm text-red-500">{errors.trialDays}</p>}
            </div>

            {/* Price Preview */}
            <div className="bg-bg-secondary p-4 rounded-lg space-y-3">
              <div className="text-sm text-text-secondary mb-2">{t('pricing.basePrice')}:</div>
              <div className="text-2xl font-bold text-text-primary">
                {formData.priceType === 'contact' ? (
                  <span>{t('fields.contactPrice')}</span>
                ) : (
                  formatCurrency(typeof formData.basePrice === 'number' ? formData.basePrice : 0, formData.currency)
                )}
                {formData.priceType === 'fixed' && (
                <span className="text-lg text-text-secondary font-normal ml-2">
                  /{formatBillingCycle(formData.billingCycle).toLowerCase()}
                </span>
                )}
              </div>
              
              {/* Add-on Users Pricing (30,000 VND per additional user) */}
              {formData.priceType === 'fixed' && formData.currency === 'VND' && formData.maxUsers > 1 && formData.maxUsers !== -1 && (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-text-secondary">{t('pricing.addOnUserDescription')}</span>
                    <span className="font-medium text-text-primary">
                      {formatCurrency((formData.maxUsers - 1) * 30000, formData.currency)}
                    </span>
                  </div>
                  <div className="text-xs text-text-tertiary">
                    ({formData.maxUsers - 1} {t('pricing.addOnUsers')} × 30,000 VND)
                  </div>
                </div>
              )}

              {/* Calculate total price with add-on users */}
              {(() => {
                if (formData.priceType !== 'fixed' || typeof formData.basePrice !== 'number') return null;
                
                const basePrice = formData.basePrice;
                const addOnUsersPrice = (formData.currency === 'VND' && formData.maxUsers > 1 && formData.maxUsers !== -1) 
                  ? (formData.maxUsers - 1) * 30000 
                  : 0;
                const totalBeforeDiscount = basePrice + addOnUsersPrice;
                const discount = getBillingCycleDiscount(formData.billingCycle);
                const discountAmount = (totalBeforeDiscount * discount) / 100;
                const finalPrice = totalBeforeDiscount - discountAmount;
                
                return (
                  <>
                    {/* Total Price with Add-on Users */}
                    {(addOnUsersPrice > 0 || discount > 0) && (
                      <div className="pt-3 border-t border-border space-y-2">
                        {addOnUsersPrice > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">{t('pricing.basePrice')}:</span>
                            <span className="font-medium text-text-primary">
                              {formatCurrency(basePrice, formData.currency)}
                            </span>
                          </div>
                        )}
                        {addOnUsersPrice > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">{t('pricing.addOnUserPrice')}:</span>
                            <span className="font-medium text-text-primary">
                              {formatCurrency(addOnUsersPrice, formData.currency)}
                            </span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">Discount ({discount}%):</span>
                            <span className="font-medium text-action-success">
                              -{formatCurrency(discountAmount, formData.currency)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="text-sm font-medium text-text-primary">{t('pricing.totalPrice')}:</span>
                          <span className="text-xl font-bold text-action-primary">
                            {formatCurrency(finalPrice, formData.currency)}
                            <span className="text-lg text-text-secondary font-normal ml-2">
                              /{formatBillingCycle(formData.billingCycle).toLowerCase()}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Show discount if applicable (simple case) */}
                    {addOnUsersPrice === 0 && discount > 0 && (
                <div className="text-sm text-action-success mt-1">
                        {discount}% discount applied
                </div>
              )}
                  </>
                );
              })()}
              
              {/* Show total price for longer cycles */}
              {formData.billingCycleMonths > 1 && formData.priceType === 'fixed' && typeof formData.basePrice === 'number' && (
                <div className="text-sm text-text-secondary mt-1">
                  {(() => {
                    const discount = getBillingCycleDiscount(formData.billingCycle);
                    const totalPrice = formData.basePrice * formData.billingCycleMonths;
                    const discountedPrice = calculateDiscountedPrice(totalPrice, discount);
                    return `Total: ${formatCurrency(discountedPrice, formData.currency)} for ${formData.billingCycleMonths} months`;
                  })()}
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
              <LimitInput
                id="maxOutlets"
                label="Max Outlets"
                value={formData.maxOutlets}
                onChange={(value) => handleInputChange('maxOutlets', value)}
                placeholder="-1 (unlimited)"
                helpText="Use -1 for unlimited"
                error={!!errors.maxOutlets}
              />
              {errors.maxOutlets && <p className="text-sm text-red-500">{errors.maxOutlets}</p>}

              <LimitInput
                id="maxUsers"
                label="Max Users"
                value={formData.maxUsers}
                onChange={(value) => handleInputChange('maxUsers', value)}
                placeholder="-1 (unlimited)"
                helpText="Use -1 for unlimited"
                error={!!errors.maxUsers}
              />
              {errors.maxUsers && <p className="text-sm text-red-500">{errors.maxUsers}</p>}

              <LimitInput
                id="maxProducts"
                label="Max Products"
                value={formData.maxProducts}
                onChange={(value) => handleInputChange('maxProducts', value)}
                placeholder="-1 (unlimited)"
                helpText="Use -1 for unlimited"
                error={!!errors.maxProducts}
              />
              {errors.maxProducts && <p className="text-sm text-red-500">{errors.maxProducts}</p>}

              <LimitInput
                id="maxCustomers"
                label="Max Customers"
                value={formData.maxCustomers}
                onChange={(value) => handleInputChange('maxCustomers', value)}
                placeholder="-1 (unlimited)"
                helpText="Use -1 for unlimited"
                error={!!errors.maxCustomers}
              />
              {errors.maxCustomers && <p className="text-sm text-red-500">{errors.maxCustomers}</p>}
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
              {t('fields.features')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-text-secondary">
                {t('fields.selectFeatures') || 'Select features included in this plan'}
              </div>
              <div className="text-sm text-text-primary font-medium">
                {formData.features.length} {formData.features.length === 1 ? 'feature' : 'features'} selected
              </div>
            </div>

            {/* Quick Select Buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('features', [...BASIC_PLAN_FEATURES])}
                className="text-xs"
              >
                Use Basic Plan Features ({BASIC_PLAN_FEATURES.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('features', [...PROFESSIONAL_PLAN_FEATURES])}
                className="text-xs"
              >
                Use Professional Plan Features ({PROFESSIONAL_PLAN_FEATURES.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('features', [])}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_PLAN_FEATURES.map((featureKey: string) => {
                const isSelected = formData.features.includes(featureKey);
                return (
                  <div
                    key={featureKey}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-action-primary bg-action-primary/5'
                        : 'border-border bg-bg-secondary hover:border-action-primary/50'
                    }`}
                    onClick={() => toggleFeature(featureKey)}
                  >
                    <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-action-primary bg-action-primary'
                        : 'border-border'
                    }`}>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-text-inverted" />
                      )}
                    </div>
                    <span className="text-sm text-text-primary flex-1">
                      {translateFeature(featureKey)}
                    </span>
                </div>
                );
              })}
            </div>

            {formData.features.length === 0 && (
              <div className="text-sm text-text-tertiary text-center py-4">
                {t('fields.noFeaturesSelected') || 'No features selected'}
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
