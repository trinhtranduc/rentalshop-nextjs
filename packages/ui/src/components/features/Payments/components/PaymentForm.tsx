"use client";

import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
  SearchableSelect
} from '@rentalshop/ui';
import { merchantsApi } from '@rentalshop/utils';
import { Calendar, DollarSign, CreditCard, User, Package } from 'lucide-react';

interface Merchant {
  id: number;
  name: string;
  email: string;
}

interface Payment {
  id: number;
  merchantId: number;
  planId: number;
  planVariantId: number;
  amount: number;
  currency: string;
  method: string;
  description: string;
  extendSubscription: boolean;
  monthsToExtend?: number;
  invoiceNumber?: string;
  transactionId?: string;
  startDate?: string;  // ✅ NEW: Payment period start date
  endDate?: string;    // ✅ NEW: Payment period end date
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Plan {
  id: number;
  name: string;
  price: number;
  currency: string;
  variants?: PlanVariant[]; // ✅ NEW: Include plan variants
}

interface PlanVariant {
  id: number;
  planId: number;
  name: string;
  duration: number;
  price: number;
  discount: number;
  savings: number;
  isActive: boolean;
  isPopular: boolean;
}


interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  merchants?: Merchant[];
  plans?: Plan[];
  planVariants?: PlanVariant[]; // ✅ REQUIRED: Plan variants
  // ✅ NEW: Edit mode support
  mode?: 'create' | 'edit';
  existingPayment?: Payment;
}

export interface PaymentFormData {
  merchantId: number;
  planId: number;
  planVariantId: number;  // ✅ REQUIRED: Plan variant ID (replaces billingCycleId)
  amount: number;
  currency: string;
  method: string;
  description: string;
  extendSubscription: boolean;
  monthsToExtend?: number;
  invoiceNumber?: string;
  transactionId?: string;
  startDate?: string;  // ✅ NEW: Payment period start date
  endDate?: string;    // ✅ NEW: Payment period end date
}

const PAYMENT_METHODS = [
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CASH', label: 'Cash' }
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' }
];

export const PaymentForm: React.FC<PaymentFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  merchants = [],
  plans = [],
  planVariants = [], // ✅ REQUIRED: Plan variants
  mode = 'create', // ✅ NEW: Default to create mode
  existingPayment // ✅ NEW: Existing payment data for edit mode
}) => {
  // ✅ Initialize form data based on mode
  const [formData, setFormData] = useState<PaymentFormData>(() => {
    if (mode === 'edit' && existingPayment) {
      return {
        merchantId: existingPayment.merchantId,
        planId: existingPayment.planId,
        planVariantId: existingPayment.planVariantId,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        method: existingPayment.method,
        description: existingPayment.description,
        extendSubscription: existingPayment.extendSubscription,
        monthsToExtend: existingPayment.monthsToExtend,
        invoiceNumber: existingPayment.invoiceNumber,
        transactionId: existingPayment.transactionId,
        startDate: existingPayment.startDate,
        endDate: existingPayment.endDate
      };
    }
    
    // Default values for create mode
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().split('T')[0];
    
    return {
      merchantId: 0,
      planId: 0,
      planVariantId: 0,
      amount: 0,
      currency: 'USD',
      method: 'STRIPE',
      description: '',
      extendSubscription: false,
      startDate: today,
      endDate: nextMonthStr
    };
  });

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPlanVariant, setSelectedPlanVariant] = useState<PlanVariant | null>(null);
  const [isSearchingMerchants, setIsSearchingMerchants] = useState(false);

  // ✅ Search merchants function for SearchableSelect
  const searchMerchants = React.useCallback(async (query: string) => {
    console.log('🔍 PaymentForm: searchMerchants called with query:', query);
    
    if (!query.trim()) {
      console.log('🔍 PaymentForm: Empty query, returning empty array');
      return [];
    }
    
    setIsSearchingMerchants(true);
    console.log('🔍 PaymentForm: Starting API call for query:', query);
    
    try {
      const response = await merchantsApi.searchMerchants({
        q: query,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc'
      });
      
      console.log('🔍 PaymentForm: API response:', response);
      
      if (response.success && response.data) {
        const results = response.data.merchants.map(merchant => {
          // Build comprehensive description with detailed contact info
          const descriptionParts = [];
          
          // Primary contact info
          if (merchant.phone) descriptionParts.push(`${merchant.phone}`);
          if (merchant.email) descriptionParts.push(`${merchant.email}`);
          
          // Address information
          const addressParts = [];
          if (merchant.address) addressParts.push(merchant.address);
          if (merchant.city) addressParts.push(merchant.city);
          if (merchant.state) addressParts.push(merchant.state);
          if (merchant.zipCode) addressParts.push(merchant.zipCode);
          if (merchant.country) addressParts.push(merchant.country);
          
          if (addressParts.length > 0) {
            descriptionParts.push(`${addressParts.join(', ')}`);
          }
          
          // Business info
          if (merchant.businessType) descriptionParts.push(`Business: ${merchant.businessType}`);
          if (merchant.website) descriptionParts.push(`Website: ${merchant.website}`);
          
          return {
            value: merchant.id.toString(),
            label: merchant.name,
            description: descriptionParts.join('\n') || 'No contact info',
            type: 'default' as const
          };
        });
        console.log('🔍 PaymentForm: Returning results:', results);
        return results;
      }
      console.log('🔍 PaymentForm: No success or data, returning empty array');
      return [];
    } catch (error) {
      console.error('🔍 PaymentForm: Error searching merchants:', error);
      return [];
    } finally {
      setIsSearchingMerchants(false);
      console.log('🔍 PaymentForm: Search completed for query:', query);
    }
  }, []);

  // ✅ Initialize selected plan and plan variant when in edit mode
  useEffect(() => {
    if (mode === 'edit' && existingPayment && plans.length > 0 && planVariants.length > 0) {
      const plan = plans.find(p => p.id === existingPayment.planId);
      const planVariant = planVariants.find(v => v.id === existingPayment.planVariantId);
      
      if (plan) setSelectedPlan(plan);
      if (planVariant) setSelectedPlanVariant(planVariant);
    }
  }, [mode, existingPayment, plans, planVariants]);

  // Update amount when plan or plan variant changes
  useEffect(() => {
    if (selectedPlan && selectedPlanVariant) {
      const totalAmount = selectedPlanVariant.price;
      const currency = selectedPlan.currency;
      
      setFormData(prev => ({
        ...prev,
        amount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
        currency: currency
      }));
    }
  }, [selectedPlan, selectedPlanVariant]);

  const handleInputChange = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // ✅ Auto-update end date when start date changes and plan variant is selected
    if (field === 'startDate' && selectedPlanVariant && value) {
      const startDate = new Date(value);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + selectedPlanVariant.duration);
      
      const endDateStr = endDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, endDate: endDateStr }));
    }
  };

  const handlePlanChange = (planId: number) => {
    const plan = plans.find(p => p.id === planId);
    setSelectedPlan(plan || null);
    setSelectedPlanVariant(null); // ✅ Reset plan variant when plan changes
    handleInputChange('planId', planId);
    handleInputChange('planVariantId', 0); // ✅ Reset plan variant ID
  };

  const handlePlanVariantChange = (planVariantId: number) => {
    const planVariant = planVariants.find(v => v.id === planVariantId);
    setSelectedPlanVariant(planVariant || null);
    handleInputChange('planVariantId', planVariantId);
    
    // ✅ Auto-update end date based on plan variant duration
    if (planVariant && formData.startDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + planVariant.duration);
      
      const endDateStr = endDate.toISOString().split('T')[0];
      handleInputChange('endDate', endDateStr);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.extendSubscription && !formData.monthsToExtend) {
      alert('Please specify months to extend when extending subscription');
      return;
    }
    
    // Validate date range
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (endDate <= startDate) {
        alert('End date must be after start date');
        return;
      }
    }
    
    // ✅ Submit form data - parent component handles create vs edit logic
    onSubmit(formData);
  };

  // ✅ Updated validation: plan variant and dates are required
  const isFormValid = formData.merchantId && 
                     formData.planId && 
                     formData.planVariantId > 0 && 
                     formData.amount > 0 &&
                     formData.startDate &&
                     formData.endDate;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          {mode === 'edit' ? 'Edit Payment' : 'Create Manual Payment'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Merchant Selection */}
          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant *</Label>
            <SearchableSelect
              value={formData.merchantId}
              onChange={(merchantId) => handleInputChange('merchantId', merchantId)}
              onSearch={searchMerchants}
              placeholder="Search merchants..."
              searchPlaceholder="Type to search merchants..."
              emptyText="No merchants found. Try a different search term."
              displayMode="input"
            />
            {isSearchingMerchants && (
              <p className="text-sm text-blue-500">Searching merchants...</p>
            )}
            {/* Debug information */}
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-gray-400">
                Debug: Using API search for merchants
              </p>
            )}
          </div>

          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="plan">Plan *</Label>
            <SearchableSelect
              value={formData.planId}
              onChange={(planId) => handlePlanChange(planId)}
              options={plans.map(plan => ({
                value: plan.id.toString(),
                label: `${plan.name} - $${plan.price} ${plan.currency}`,
                description: `Base price: $${plan.price}`,
                type: 'default' as const
              }))}
              placeholder="Search plans..."
              searchPlaceholder="Type to search plans..."
              emptyText="No plans found. Please add plans first."
              displayMode="input"
            />
            {plans.length === 0 && (
              <p className="text-sm text-red-500">No plans available. Please add plans first.</p>
            )}
            {/* Debug information */}
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-gray-400">
                Debug: {plans.length} plans loaded
              </p>
            )}
          </div>

          {/* Plan Variant Selection */}
          {selectedPlan && (
            <div className="space-y-2">
              <Label htmlFor="planVariant">Plan Variant *</Label>
              <SearchableSelect
                value={formData.planVariantId}
                onChange={(planVariantId) => handlePlanVariantChange(planVariantId)}
                options={planVariants
                  .filter(variant => variant.planId === selectedPlan.id && variant.isActive)
                  .map(variant => ({
                    value: variant.id.toString(),
                    label: `${variant.name} (${variant.duration} months) - $${variant.price} ${selectedPlan.currency}`,
                    description: variant.discount > 0 
                      ? `Save $${variant.savings} with ${variant.discount}% discount`
                      : `Standard pricing`,
                    type: 'default' as const
                  }))}
                placeholder="Search plan variants..."
                searchPlaceholder="Type to search plan variants..."
                emptyText="No plan variants found for this plan."
                displayMode="input"
              />
              {planVariants.length === 0 ? (
                <p className="text-sm text-red-500">No plan variants available for this plan. Please add plan variants first.</p>
              ) : (
                <p className="text-sm text-gray-500">
                  Select a specific plan variant for precise pricing and duration.
                </p>
              )}
              {/* Debug information */}
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-gray-400">
                  Debug: {planVariants.length} plan variants loaded, {planVariants.filter(v => v.planId === selectedPlan.id && v.isActive).length} for selected plan
                </p>
              )}
            </div>
          )}


          {/* Amount Display */}
          {formData.amount > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Amount:</span>
                <span className="text-xl font-bold text-blue-600">
                  ${formData.amount} {formData.currency}
                </span>
              </div>
              {/* Show plan variant info */}
              {selectedPlan && selectedPlanVariant && (
                <div className="text-sm text-gray-600 mt-1">
                  {selectedPlan.name} - {selectedPlanVariant.name} ({selectedPlanVariant.duration} months)
                  {selectedPlanVariant.discount > 0 && (
                    <span className="text-green-600 ml-2">
                      (Save ${selectedPlanVariant.savings} with {selectedPlanVariant.discount}% discount)
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="method">Payment Method *</Label>
            <Select
              value={formData.method}
              onValueChange={(value) => handleInputChange('method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      {method.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Extend Subscription Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="extendSubscription">Extend Existing Subscription</Label>
              <p className="text-sm text-gray-600">
                Check this to extend the merchant's current subscription instead of creating a new one
              </p>
            </div>
            <Switch
              checked={formData.extendSubscription}
              onCheckedChange={(checked) => handleInputChange('extendSubscription', checked)}
            />
          </div>

          {/* Months to Extend */}
          {formData.extendSubscription && (
            <div className="space-y-2">
              <Label htmlFor="monthsToExtend">Months to Extend *</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={formData.monthsToExtend || ''}
                onChange={(e) => handleInputChange('monthsToExtend', parseInt(e.target.value))}
                placeholder="Enter number of months"
              />
            </div>
          )}

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number (Optional)</Label>
              <Input
                value={formData.invoiceNumber || ''}
                onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                placeholder="e.g., INV-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
              <Input
                value={formData.transactionId || ''}
                onChange={(e) => handleInputChange('transactionId', e.target.value)}
                placeholder="e.g., txn_123456789"
              />
            </div>
          </div>

          {/* Payment Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                type="date"
                value={formData.startDate || ''}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Payment description or notes..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
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
              disabled={!isFormValid || loading}
              className="min-w-[120px]"
            >
              {loading 
                ? (mode === 'edit' ? 'Updating...' : 'Creating...') 
                : (mode === 'edit' ? 'Update Payment' : 'Create Payment')
              }
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
