"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  cn
} from '@rentalshop/ui';
import { SubscriptionFormSimple } from './SubscriptionFormSimple';
import { formatCurrency } from '@rentalshop/utils';
import { DollarSign, TrendingUp, Calendar, Percent } from 'lucide-react';
import type { Subscription, Plan, Merchant, SubscriptionUpdateInput, CurrencyCode } from '@rentalshop/types';

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

interface SubscriptionEditDialogProps {
  subscription: Subscription | null;
  plans: Plan[];
  merchants: Merchant[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SubscriptionUpdateInput) => Promise<void>;
  loading?: boolean;
}

export function SubscriptionEditDialog({
  subscription,
  plans,
  merchants,
  isOpen,
  onClose,
  onSave,
  loading = false
}: SubscriptionEditDialogProps) {
  const [formData, setFormData] = useState<Partial<SubscriptionFormData>>({});

  // Initialize form data when subscription changes
  useEffect(() => {
    if (subscription) {
      setFormData({
        planId: parseInt(subscription.planId),
        merchantId: parseInt(subscription.merchantId),
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        interval: subscription.interval,
        intervalCount: subscription.intervalCount,
        period: subscription.period,
        discount: subscription.discount,
        savings: subscription.savings,
        platform: (subscription as any).platform || 'web-mobile',
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        cancelReason: subscription.cancelReason,
        autoRenew: !subscription.cancelAtPeriodEnd,
        changeReason: ''
      });
    }
  }, [subscription]);

  const handleSubmit = async (data: SubscriptionUpdateInput) => {
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  };

  const handleCancel = () => {
    setFormData({});
    onClose();
  };

  // Calculate discount breakdown for each period
  const calculateDiscountBreakdown = (basePrice: number, currency: string) => {
    const periods = [
      { duration: 1, label: 'Monthly', discount: 0 },
      { duration: 3, label: 'Quarterly', discount: 10 },
      { duration: 6, label: '6 Months', discount: 15 },
      { duration: 12, label: 'Yearly', discount: 20 }
    ];

    return periods.map(period => {
      const discountedPrice = basePrice * (1 - period.discount / 100);
      const totalSavings = (basePrice * period.duration) - (discountedPrice * period.duration);
      
      return {
        ...period,
        originalPrice: basePrice * period.duration,
        discountedPrice: discountedPrice * period.duration,
        monthlyPrice: discountedPrice,
        totalSavings,
        savingsPercentage: period.discount
      };
    });
  };

  // Get selected plan for discount calculations
  const selectedPlan = plans.find(plan => plan.id === formData.planId);

  if (!subscription) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogDescription>
            Update subscription details for {subscription.merchant?.name || 'Merchant'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Subscription Form */}
          <div className="w-full">
            <SubscriptionFormSimple
              initialData={formData}
              plans={plans}
              merchants={merchants}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              loading={loading}
              mode="edit"
              title=""
              submitText=""
              showCard={false}
              showActions={false}
            />
          </div>

          {/* Discount Breakdown */}
          {selectedPlan && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Discount Breakdown by Period
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {calculateDiscountBreakdown(selectedPlan.basePrice, formData.currency || 'USD').map((period) => (
                      <div
                        key={period.duration}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all",
                          formData.period === period.duration
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-gray-900">{period.label}</span>
                            {period.savingsPercentage > 0 && (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                {period.savingsPercentage}% OFF
                              </Badge>
                            )}
                          </div>
                          {formData.period === period.duration && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              Current
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Monthly Price</div>
                            <div className="font-semibold">
                              {formatCurrency(period.monthlyPrice, formData.currency as CurrencyCode)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Total Price</div>
                            <div className="font-semibold">
                              {formatCurrency(period.discountedPrice, formData.currency as CurrencyCode)}
                            </div>
                          </div>
                        </div>

                        {period.savingsPercentage > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-gray-600">Total Savings</span>
                              </div>
                              <div className="font-semibold text-green-600">
                                {formatCurrency(period.totalSavings, formData.currency as CurrencyCode)}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              vs {formatCurrency(period.originalPrice, formData.currency as CurrencyCode)} at regular price
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </div>

              {/* Current Subscription Summary */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Current Subscription Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Plan</span>
                        <span className="font-semibold">{selectedPlan.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Billing Period</span>
                        <span className="font-semibold">
                          {formData.period === 1 ? 'Monthly' : 
                           formData.period === 3 ? 'Quarterly' : 
                           formData.period === 6 ? '6 Months' : 
                           formData.period === 12 ? 'Yearly' : 
                           `${formData.period || 1} months`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Amount</span>
                        <span className="font-semibold">
                          {formatCurrency(formData.amount || 0, formData.currency as CurrencyCode)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount Applied</span>
                        <span className="font-semibold text-green-600">
                          {formData.discount || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Platform</span>
                        <span className="font-semibold">
                          {formData.platform === 'web-only' ? 'Web Only' :
                           formData.platform === 'mobile-only' ? 'Mobile Only' :
                           formData.platform === 'web-mobile' ? 'Web & Mobile' :
                           formData.platform === 'desktop-only' ? 'Desktop Only' :
                           formData.platform === 'all-platforms' ? 'All Platforms' :
                           'Web & Mobile'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit(formData as SubscriptionUpdateInput)} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
