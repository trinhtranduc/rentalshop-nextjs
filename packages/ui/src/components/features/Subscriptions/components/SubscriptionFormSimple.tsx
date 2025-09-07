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
  interval: 'month' | 'quarter' | '6months' | 'year';
  intervalCount: number;
  period: 1 | 3 | 6 | 12;
  discount: number;
  savings: number;
  platform: 'web-only' | 'mobile-only' | 'web-mobile' | 'desktop-only' | 'all-platforms';
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  cancelReason?: string;
  autoRenew: boolean;
  changeReason?: string;
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
  showCard?: boolean;
  showActions?: boolean;
}

export function SubscriptionFormSimple({
  initialData,
  plans,
  merchants,
  onSubmit,
  onCancel,
  loading = false,
  mode = 'create',
  title,
  submitText,
  showCard = true,
  showActions = true
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
    changeReason: initialData?.changeReason || ''
  });

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [merchantOptions, setMerchantOptions] = useState<any[]>([]);

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
  }, [merchants]);

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
    const plan = plans.find(p => p.publicId === formData.planId);
    setSelectedPlan(plan || null);
  }, [formData.planId, plans]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.merchantId) {
      newErrors.merchantId = 'Merchant is required';
    }

    if (!formData.planId) {
      newErrors.planId = 'Plan is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
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
        merchantId: formData.merchantId,
        planId: formData.planId,
        status: formData.status,
        currentPeriodStart: formData.currentPeriodStart,
        currentPeriodEnd: formData.currentPeriodEnd,
        trialStart: formData.trialStart,
        trialEnd: formData.trialEnd,
        amount: formData.amount,
        currency: formData.currency,
        interval: formData.interval,
        intervalCount: formData.intervalCount,
        period: formData.period,
        discount: formData.discount,
        savings: formData.savings,
        platform: formData.platform,
        cancelAtPeriodEnd: formData.cancelAtPeriodEnd,
        canceledAt: formData.canceledAt,
        cancelReason: formData.cancelReason,
        autoRenew: formData.autoRenew,
        changeReason: formData.changeReason
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting subscription:', error);
    }
  };

  // Helper function to get discount percentage based on period
  const getDiscountPercentage = (period: number): number => {
    const discountMap: Record<number, number> = {
      1: 0,    // Monthly: 0% discount
      3: 10,   // Quarterly: 10% discount
      6: 15,   // 6 Months: 15% discount
      12: 20   // Yearly: 20% discount
    };
    return discountMap[period] || 0;
  };

  // Helper function to calculate pricing with discount
  const calculatePricingWithDiscount = (basePrice: number, period: number) => {
    const discount = getDiscountPercentage(period);
    const totalMonths = period;
    const totalBasePrice = basePrice * totalMonths;
    const discountAmount = (totalBasePrice * discount) / 100;
    const finalPrice = totalBasePrice - discountAmount;
    const monthlyEquivalent = finalPrice / totalMonths;
    
    return {
      basePrice: totalBasePrice,
      discount,
      finalPrice,
      savings: discountAmount,
      monthlyEquivalent
    };
  };

  const handleInputChange = (field: keyof SubscriptionFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Map interval to period when interval changes
      if (field === 'interval') {
        const intervalToPeriodMap: Record<string, 1 | 3 | 6 | 12> = {
          'month': 1,
          'quarter': 3,
          '6months': 6,
          'year': 12
        };
        newData.period = intervalToPeriodMap[value] || 1;
        
        // Calculate new pricing with discount
        if (selectedPlan) {
          const pricing = calculatePricingWithDiscount(selectedPlan.basePrice, newData.period);
          newData.amount = pricing.finalPrice;
          newData.discount = pricing.discount;
          newData.savings = pricing.savings;
        }
      }
      
      return newData;
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formContent = (
    <div className="space-y-6">
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
              className={`w-full ${errors.merchantId ? 'border-red-500' : ''}`}
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
              <SelectTrigger className={`w-full ${errors.planId ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.length > 0 ? (
                  plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.publicId.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{plan.name}</span>
                        <span className="text-sm text-gray-500">
                          {formatCurrency(plan.basePrice, plan.currency)}/{plan.currency}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-plans" disabled>
                    No plans available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.planId && (
              <p className="text-sm text-red-500 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.planId}</span>
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="flex items-center space-x-2">
              <StatusBadge status={formData.status} />
              <span>Status</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={mode === 'view'}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Amount *</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              disabled={mode === 'view'}
              className={`w-full ${errors.amount ? 'border-red-500' : ''}`}
            />
            {errors.amount && (
              <p className="text-sm text-red-500 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.amount}</span>
              </p>
            )}
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => handleInputChange('currency', value)}
              disabled={mode === 'view'}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
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
              <SelectTrigger className="w-full">
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

          {/* Billing Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval">Billing Interval</Label>
            <Select
              value={formData.interval}
              onValueChange={(value) => handleInputChange('interval', value)}
              disabled={mode === 'view'}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">
                  <div className="flex items-center justify-between w-full">
                    <span>Monthly</span>
                    <span className="text-gray-500 text-sm">(0% discount)</span>
                  </div>
                </SelectItem>
                <SelectItem value="quarter">
                  <div className="flex items-center justify-between w-full">
                    <span>Quarterly</span>
                    <span className="text-green-600 text-sm font-medium">(10% discount)</span>
                  </div>
                </SelectItem>
                <SelectItem value="6months">
                  <div className="flex items-center justify-between w-full">
                    <span>6 Months</span>
                    <span className="text-green-600 text-sm font-medium">(15% discount)</span>
                  </div>
                </SelectItem>
                <SelectItem value="year">
                  <div className="flex items-center justify-between w-full">
                    <span>Yearly</span>
                    <span className="text-green-600 text-sm font-medium">(20% discount)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto Renew */}
          <div className="flex items-center space-x-2">
            <Switch
              id="autoRenew"
              checked={formData.autoRenew}
              onCheckedChange={(checked) => handleInputChange('autoRenew', checked)}
              disabled={mode === 'view'}
            />
            <Label htmlFor="autoRenew">Auto Renew</Label>
          </div>

          {/* Change Reason */}
          {mode !== 'view' && (
            <div className="space-y-2">
              <Label htmlFor="changeReason">Change Reason</Label>
              <Textarea
                value={formData.changeReason || ''}
                onChange={(e) => handleInputChange('changeReason', e.target.value)}
                placeholder="Reason for this change..."
                rows={3}
              />
            </div>
          )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showCard ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>{title || (mode === 'create' ? 'Create Subscription' : 'Edit Subscription')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formContent}
          </CardContent>
        </Card>
      ) : (
        formContent
      )}

      {/* Form Actions */}
      {showActions && mode !== 'view' && (
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (submitText || 'Save')}
          </Button>
        </div>
      )}
    </form>
  );
}
