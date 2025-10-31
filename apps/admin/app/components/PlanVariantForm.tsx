'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge
} from '@rentalshop/ui';
import { 
  X, 
  Calculator, 
  Percent, 
  DollarSign, 
  Clock,
  Package,
  Star,
  TrendingUp,
  Check
} from 'lucide-react';
import type { Subscription, Plan } from '@rentalshop/types';

interface PlanVariantFormProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: Subscription | null;
  plans: Plan[];
  onSave: (variant: Partial<Subscription>) => void;
}

export default function PlanVariantForm({ 
  isOpen, 
  onClose, 
  variant, 
  plans, 
  onSave 
}: PlanVariantFormProps) {
  const [formData, setFormData] = useState({
    planId: '',
    status: 'ACTIVE' as any,
    period: 1 as any,
    amount: 0,
    basePrice: 0,
    discount: 0,
    interval: 'month' as any,
    intervalCount: 1,
    currency: 'USD'
  });
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [calculatedSavings, setCalculatedSavings] = useState(0);

  useEffect(() => {
    if (variant) {
      setFormData({
        planId: variant.planId.toString(),
        status: variant.status,
        period: variant.period,
        amount: variant.amount,
        basePrice: variant.plan?.basePrice || 0,
        discount: variant.discount,
        interval: variant.interval,
        intervalCount: variant.intervalCount,
        currency: variant.currency
      });
    } else {
      setFormData({
        planId: '',
        status: 'ACTIVE' as any,
        period: 1 as any,
        amount: 0,
        basePrice: 0,
        discount: 0,
        interval: 'month' as any,
        intervalCount: 1,
        currency: 'USD'
      });
    }
  }, [variant, isOpen]);

  useEffect(() => {
    // Calculate price and savings when basePrice or discount changes
    if (formData.basePrice > 0) {
      const price = formData.basePrice * (1 - formData.discount / 100);
      const savings = formData.basePrice - price;
      setCalculatedPrice(price);
      setCalculatedSavings(savings);
    }
  }, [formData.basePrice, formData.discount]);

  const handlePlanChange = (planId: string) => {
    const selectedPlan = plans.find(plan => plan.id.toString() === planId);
    if (selectedPlan) {
      setFormData(prev => ({
        ...prev,
        planId,
        basePrice: selectedPlan.basePrice,
        amount: selectedPlan.basePrice * prev.period
      }));
    }
  };

  const handlePeriodChange = (period: number) => {
    const selectedPlan = plans.find(plan => plan.id.toString() === formData.planId);
    if (selectedPlan) {
      setFormData(prev => ({
        ...prev,
        period,
        amount: selectedPlan.basePrice * period,
        intervalCount: period === 1 ? 1 : period === 3 ? 3 : 1,
        interval: period === 12 ? 'year' : 'month'
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const subscriptionData = {
      ...formData,
      planId: formData.planId,
      amount: formData.amount || calculatedPrice,
      savings: calculatedSavings
    };
    
    onSave(subscriptionData);
  };

  const selectedPlan = plans.find(plan => plan.id.toString() === formData.planId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {variant ? 'Edit Subscription' : 'Create Subscription'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="planId">Plan *</Label>
            <Select value={formData.planId} onValueChange={handlePlanChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{plan.name}</span>
                      <Badge variant="outline">${plan.basePrice}/month</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label htmlFor="period">Billing Period *</Label>
            <Select 
              value={formData.period.toString()} 
              onValueChange={(value) => handlePeriodChange(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="3">3 Months (Quarterly)</SelectItem>
                <SelectItem value="12">12 Months (Yearly)</SelectItem>
              </SelectContent>
            </Select>
          </div>


          {/* Pricing Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Base Price Display */}
              {selectedPlan && (
                <div className="flex items-center gap-2 p-3 bg-bg-secondary rounded-lg">
                  <DollarSign className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-secondary">Base Price:</span>
                  <span className="font-medium">${selectedPlan.basePrice.toFixed(2)}/month</span>
                </div>
              )}

              {/* Discount */}
              <div className="space-y-2">
                <Label htmlFor="discount">Discount (%)</Label>
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-text-secondary" />
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.discount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      discount: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <span className="text-sm text-text-secondary">%</span>
                </div>
              </div>

              {/* Calculated Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">Final Price</span>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    ${calculatedPrice.toFixed(2)}
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-blue-700" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Savings</span>
                  </div>
                  <div className="text-lg font-bold text-blue-700">
                    ${calculatedSavings.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Custom Amount Override */}
              <div className="space-y-2">
                <Label htmlFor="amount">Custom Amount (optional)</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-text-secondary" />
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      amount: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="Leave empty to use calculated amount"
                  />
                </div>
                <p className="text-xs text-text-secondary">
                  Leave empty to use the calculated amount based on discount
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  status: value as any
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={formData.currency} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  currency: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit">
              <Check className="w-4 h-4 mr-2" />
              {variant ? 'Update Subscription' : 'Create Subscription'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
