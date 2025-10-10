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
  Label,
  Switch,
  Badge,
  StatusBadge,
  SearchableSelect
} from '../../../ui';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Building,
  CreditCard,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import type { 
  SubscriptionCreateInput, 
  SubscriptionUpdateInput,
  Subscription,
  Plan,
  Merchant
} from '@rentalshop/types';

interface SubscriptionFormData {
  merchantId: number;
  planId: number;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  amount: number;
  currency: string;
  interval: 'month' | 'quarter' | 'year';
  intervalCount: number;
  period: 1 | 3 | 12;
  discount: number;
  savings: number;
  platform: 'web-only' | 'mobile-only' | 'web-mobile' | 'desktop-only' | 'all-platforms';
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  cancelReason?: string;
  autoRenew: boolean;
  changeReason?: string;
  // Additional fields for form handling
  startDate?: Date;
  endDate?: Date;
  nextBillingDate?: Date;
}

interface SubscriptionFormProps {
  initialData?: Partial<SubscriptionFormData>;
  plans: Plan[];
  merchants: Merchant[];
  onSubmit: (data: SubscriptionCreateInput | SubscriptionUpdateInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  mode?: 'create' | 'edit' | 'view';
  title?: string;
  submitText?: string;
}

export function SubscriptionForm({
  initialData,
  plans,
  merchants,
  onSubmit,
  onCancel,
  loading = false,
  mode = 'create',
  title,
  submitText
}: SubscriptionFormProps) {
  const [formData, setFormData] = useState<SubscriptionFormData>({
    merchantId: initialData?.merchantId || 0,
    planId: initialData?.planId || 0,
    status: initialData?.status || 'trial',
    currentPeriodStart: initialData?.currentPeriodStart || new Date(),
    currentPeriodEnd: initialData?.currentPeriodEnd || new Date(),
    trialStart: initialData?.trialStart,
    trialEnd: initialData?.trialEnd,
    amount: initialData?.amount || 0,
    currency: initialData?.currency || 'USD',
    interval: initialData?.interval || 'month',
    intervalCount: initialData?.intervalCount || 1,
    period: initialData?.period || 1,
    discount: initialData?.discount || 0,
    savings: initialData?.savings || 0,
    platform: initialData?.platform || 'web-mobile',
    cancelAtPeriodEnd: initialData?.cancelAtPeriodEnd || false,
    canceledAt: initialData?.canceledAt,
    cancelReason: initialData?.cancelReason,
    autoRenew: initialData?.autoRenew ?? true,
    changeReason: initialData?.changeReason || '',
    // Initialize additional fields
    startDate: initialData?.currentPeriodStart || new Date(),
    endDate: initialData?.currentPeriodEnd || new Date(),
    nextBillingDate: initialData?.currentPeriodEnd || new Date()
  });

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planVariants, setPlanVariants] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [merchantOptions, setMerchantOptions] = useState<any[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);

  // Debug logging
  console.log('SubscriptionForm - merchants:', merchants);
  console.log('SubscriptionForm - plans:', plans);

  // Initialize merchant options
  useEffect(() => {
    const options = merchants.map(merchant => ({
      value: merchant.id.toString(),
      label: merchant.name,
      subtitle: merchant.email,
      description: `${merchant.city}, ${merchant.state}`,
      type: 'merchant' as const
    }));
    setMerchantOptions(options);

    // Set selected merchant if editing
    if (formData.merchantId && merchants.length > 0) {
      const merchant = merchants.find(m => m.id === formData.merchantId.toString());
      if (merchant) {
        setSelectedMerchant({
          value: merchant.id.toString(),
          label: merchant.name,
          subtitle: merchant.email,
          description: `${merchant.city}, ${merchant.state}`,
          type: 'merchant' as const
        });
      }
    }
  }, [merchants, formData.merchantId]);

  // Merchant search function
  const handleMerchantSearch = async (query: string) => {
    if (!query.trim()) {
      return merchantOptions;
    }
    
    const filtered = merchantOptions.filter(option =>
      option.label.toLowerCase().includes(query.toLowerCase()) ||
      option.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
      option.description?.toLowerCase().includes(query.toLowerCase())
    );
    
    return filtered;
  };

  // Update selected plan when planId changes
  useEffect(() => {
    const plan = plans.find(p => p.id === formData.planId);
    setSelectedPlan(plan || null);
    
    if (plan) {
      // Load plan variants for this plan
      // This would typically come from an API call
      setPlanVariants([]); // Placeholder - you'd fetch actual variants
      
      // Update amount based on plan
      setFormData(prev => ({
        ...prev,
        amount: plan.basePrice,
        currency: plan.currency
      }));
    }
  }, [formData.planId, plans]);

  // Calculate trial end date when start date or plan changes
  useEffect(() => {
    if (selectedPlan && formData.status === 'trial' && selectedPlan.trialDays > 0) {
      const endDate = new Date(formData.startDate || formData.currentPeriodStart);
      endDate.setDate(endDate.getDate() + selectedPlan.trialDays);
      
      setFormData(prev => ({
        ...prev,
        endDate,
        nextBillingDate: endDate,
        amount: 0 // Trial is free
      }));
    }
  }, [selectedPlan, formData.startDate, formData.status]);

  // Calculate end date for active subscriptions
  useEffect(() => {
    if (formData.status === 'ACTIVE' && selectedPlan) {
      const endDate = new Date(formData.startDate || formData.currentPeriodStart);
      endDate.setMonth(endDate.getMonth() + 1); // Default to 1 month
      
      setFormData(prev => ({
        ...prev,
        endDate,
        nextBillingDate: endDate
      }));
    }
  }, [formData.startDate, formData.status, selectedPlan]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.merchantId) {
      newErrors.merchantId = 'Merchant is required';
    }

    if (!formData.planId) {
      newErrors.planId = 'Plan is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.nextBillingDate) {
      newErrors.nextBillingDate = 'Next billing date is required';
    }

    if (formData.amount < 0) {
      newErrors.amount = 'Amount cannot be negative';
    }

    if (formData.status === 'TRIAL' && !formData.endDate) {
      newErrors.endDate = 'End date is required for trial subscriptions';
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
      const submitData = {
        ...formData,
        startDate: formData.startDate,
        endDate: formData.endDate,
        nextBillingDate: formData.nextBillingDate
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting subscription:', error);
    }
  };

  const handleInputChange = (field: keyof SubscriptionFormData, value: any) => {
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

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'TRIAL': 'trial',
      'ACTIVE': 'active',
      'CANCELLED': 'cancelled',
      'SUSPENDED': 'warning'
    };

    const mappedStatus = statusMap[status as keyof typeof statusMap] || status.toLowerCase();
    return <StatusBadge status={mappedStatus} />;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>{title || (mode === 'create' ? 'Create Subscription' : 'Edit Subscription')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Merchant Selection */}
          <div className="space-y-2">
            <Label htmlFor="merchantId" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Merchant *</span>
            </Label>
            <SearchableSelect
              value={formData.merchantId}
              onChange={(value) => handleInputChange('merchantId', value)}
              options={merchantOptions}
              onSearch={handleMerchantSearch}
              placeholder="Search for a merchant..."
              searchPlaceholder="Type merchant name, email, or location..."
              emptyText="No merchants found"
              displayMode="input"
              className={errors.merchantId ? 'border-red-500' : ''}
            />
            {errors.merchantId && (
              <p className="text-sm text-red-500 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.merchantId}</span>
              </p>
            )}
          </div>

          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="planId" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Plan *</span>
            </Label>
            <Select
              value={formData.planId.toString()}
              onValueChange={(value) => handleInputChange('planId', parseInt(value))}
              disabled={mode === 'view'}
            >
              <SelectTrigger className={errors.planId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{plan.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {formatCurrency(plan.basePrice, plan.currency)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.planId && (
              <p className="text-sm text-red-500 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.planId}</span>
              </p>
            )}
          </div>

          {/* Plan Variant Selection */}
          {planVariants.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="planVariantId">Plan Variant</Label>
              <Select
                value={formData.planVariantId?.toString() || ''}
                onValueChange={(value) => handleInputChange('planVariantId', value ? parseInt(value) : undefined)}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan variant" />
                </SelectTrigger>
                <SelectContent>
                  {planVariants.map(variant => (
                    <SelectItem key={variant.id} value={variant.id.toString()}>
                      {variant.name} - {formatCurrency(variant.price, formData.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Status</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={mode === 'view'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              {getStatusBadge(formData.status)}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPeriodStart" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Start Date *</span>
              </Label>
              <Input
                type="datetime-local"
                value={formData.startDate?.toISOString().slice(0, 16) || ''}
                onChange={(e) => handleInputChange('startDate', new Date(e.target.value))}
                disabled={mode === 'view'}
                className={errors.startDate ? 'border-red-500' : ''}
              />
              {errors.startDate && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.startDate}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextBillingDate" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Next Billing Date *</span>
              </Label>
              <Input
                type="datetime-local"
                value={formData.nextBillingDate.toISOString().slice(0, 16)}
                onChange={(e) => handleInputChange('nextBillingDate', new Date(e.target.value))}
                disabled={mode === 'view'}
                className={errors.nextBillingDate ? 'border-red-500' : ''}
              />
              {errors.nextBillingDate && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.nextBillingDate}</span>
                </p>
              )}
            </div>
          </div>

          {/* Trial End Date (for trial subscriptions) */}
          {formData.status === 'TRIAL' && formData.endDate && (
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Trial End Date</span>
              </Label>
              <Input
                type="datetime-local"
                value={formData.endDate.toISOString().slice(0, 16)}
                onChange={(e) => handleInputChange('endDate', new Date(e.target.value))}
                disabled={mode === 'view'}
                className={errors.endDate ? 'border-red-500' : ''}
              />
              {errors.endDate && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.endDate}</span>
                </p>
              )}
            </div>
          )}

          {/* End Date (for active subscriptions) */}
          {formData.status === 'ACTIVE' && formData.endDate && (
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>End Date</span>
              </Label>
              <Input
                type="datetime-local"
                value={formData.endDate.toISOString().slice(0, 16)}
                onChange={(e) => handleInputChange('endDate', new Date(e.target.value))}
                disabled={mode === 'view'}
              />
            </div>
          )}

          {/* Amount and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span>Amount *</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                disabled={mode === 'view' || formData.status === 'TRIAL'}
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.amount}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleInputChange('currency', value)}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Discount Percentage */}
          <div className="space-y-2">
            <Label htmlFor="discount" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Discount %</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.discount}
              onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
              placeholder="0.0"
              disabled={mode === 'view'}
              className="w-32"
            />
            <p className="text-xs text-gray-500">
              Enter discount percentage (0-100%)
            </p>
          </div>

          {/* Platform Support */}
          <div className="space-y-2">
            <Label htmlFor="platform" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Platform Support</span>
            </Label>
            <Select
              value={formData.platform}
              onValueChange={(value) => handleInputChange('platform', value)}
              disabled={mode === 'view'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform support" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web-only">Web Only</SelectItem>
                <SelectItem value="mobile-only">Mobile Only</SelectItem>
                <SelectItem value="web-mobile">Web & Mobile</SelectItem>
                <SelectItem value="desktop-only">Desktop Only</SelectItem>
                <SelectItem value="all-platforms">All Platforms</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Select which platforms this subscription supports
            </p>
          </div>

          {/* Auto Renew */}
          <div className="flex items-center space-x-2">
            <Switch
              id="autoRenew"
              checked={formData.autoRenew}
              onCheckedChange={(checked) => handleInputChange('autoRenew', checked)}
              disabled={mode === 'view'}
            />
            <Label htmlFor="autoRenew">Auto-renew subscription</Label>
          </div>

          {/* Change Reason */}
          <div className="space-y-2">
            <Label htmlFor="changeReason">Change Reason</Label>
            <Textarea
              id="changeReason"
              placeholder="Reason for this subscription change..."
              value={formData.changeReason || ''}
              onChange={(e) => handleInputChange('changeReason', e.target.value)}
              disabled={mode === 'view'}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        {mode !== 'view' && (
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : (submitText || 'Save Subscription')}
          </Button>
        )}
      </div>
    </form>
  );
}
