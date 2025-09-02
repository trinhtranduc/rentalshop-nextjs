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
  Switch
} from '@rentalshop/ui';
import { Calendar, DollarSign, CreditCard, User, Package } from 'lucide-react';

interface Merchant {
  id: number;
  name: string;
  email: string;
}

interface Plan {
  id: number;
  name: string;
  price: number;
  currency: string;
}

interface BillingCycle {
  id: number;
  name: string;
  months: number;
  discount: number;
}

interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  merchants?: Merchant[];
  plans?: Plan[];
  billingCycles?: BillingCycle[];
}

export interface PaymentFormData {
  merchantId: number;
  planId: number;
  billingCycleId: number;
  amount: number;
  currency: string;
  method: string;
  description: string;
  extendSubscription: boolean;
  monthsToExtend?: number;
  invoiceNumber?: string;
  transactionId?: string;
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
  billingCycles = []
}) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    merchantId: 0,
    planId: 0,
    billingCycleId: 0,
    amount: 0,
    currency: 'USD',
    method: 'STRIPE',
    description: '',
    extendSubscription: false
  });

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle | null>(null);

  // Update amount when plan or billing cycle changes
  useEffect(() => {
    if (selectedPlan && selectedBillingCycle) {
      const baseAmount = selectedPlan.price;
      const discount = selectedBillingCycle.discount / 100;
      const discountedAmount = baseAmount * (1 - discount);
      const totalAmount = discountedAmount * selectedBillingCycle.months;
      
      setFormData(prev => ({
        ...prev,
        amount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
        currency: selectedPlan.currency
      }));
    }
  }, [selectedPlan, selectedBillingCycle]);

  const handleInputChange = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePlanChange = (planId: number) => {
    const plan = plans.find(p => p.id === planId);
    setSelectedPlan(plan || null);
    handleInputChange('planId', planId);
  };

  const handleBillingCycleChange = (billingCycleId: number) => {
    const billingCycle = billingCycles.find(bc => bc.id === billingCycleId);
    setSelectedBillingCycle(billingCycle || null);
    handleInputChange('billingCycleId', billingCycleId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.extendSubscription && !formData.monthsToExtend) {
      alert('Please specify months to extend when extending subscription');
      return;
    }
    
    onSubmit(formData);
  };

  const isFormValid = formData.merchantId && formData.planId && formData.billingCycleId && formData.amount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Create Manual Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Merchant Selection */}
          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant *</Label>
            <Select
              value={formData.merchantId.toString()}
              onValueChange={(value) => handleInputChange('merchantId', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a merchant" />
              </SelectTrigger>
              <SelectContent>
                {merchants.map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id.toString()}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {merchant.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="plan">Plan *</Label>
            <Select
              value={formData.planId.toString()}
              onValueChange={(value) => handlePlanChange(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      {plan.name} - ${plan.price} {plan.currency}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Cycle Selection */}
          <div className="space-y-2">
            <Label htmlFor="billingCycle">Billing Cycle *</Label>
            <Select
              value={formData.billingCycleId.toString()}
              onValueChange={(value) => handleBillingCycleChange(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a billing cycle" />
              </SelectTrigger>
              <SelectContent>
                {billingCycles.map((billingCycle) => (
                  <SelectItem key={billingCycle.id} value={billingCycle.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {billingCycle.name} ({billingCycle.months} months)
                      {billingCycle.discount > 0 && (
                        <span className="text-green-600">-{billingCycle.discount}%</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Display */}
          {formData.amount > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Amount:</span>
                <span className="text-xl font-bold text-blue-600">
                  ${formData.amount} {formData.currency}
                </span>
              </div>
              {selectedPlan && selectedBillingCycle && (
                <div className="text-sm text-gray-600 mt-1">
                  {selectedPlan.name} × {selectedBillingCycle.months} months
                  {selectedBillingCycle.discount > 0 && (
                    <span className="text-green-600 ml-2">
                      (with {selectedBillingCycle.discount}% discount)
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
              {loading ? 'Creating...' : 'Create Payment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
