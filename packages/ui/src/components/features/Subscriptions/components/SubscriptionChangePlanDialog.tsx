"use client";

import React, { useState } from 'react';
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
  Label,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Input,
  Textarea
} from '@rentalshop/ui';
import { formatDate, formatCurrency } from '@rentalshop/ui';
import { ArrowRight, Check, Clock } from 'lucide-react';
import type { Subscription, Plan, BillingInterval } from '@rentalshop/types';

import { BILLING_CYCLES_ARRAY } from '@rentalshop/constants';

type BillingCycleConfig = {
  value: BillingInterval;
  label: string;
  months: number;
  discount: number;
  description: string;
};

interface SubscriptionChangePlanDialogProps {
  subscription: Subscription | null;
  plans: Plan[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subscription: Subscription, newPlanId: number, interval: BillingInterval, startDate?: Date, reason?: string, sendEmail?: boolean) => void;
  loading?: boolean;
}

export function SubscriptionChangePlanDialog({
  subscription,
  plans,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}: SubscriptionChangePlanDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('monthly');
  const [startDate, setStartDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [sendEmail, setSendEmail] = useState<boolean>(true);

  // Initialize start date to today when dialog opens
  React.useEffect(() => {
    if (isOpen && !startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setStartDate(today.toISOString().slice(0, 16));
    }
  }, [isOpen, startDate]);


  const handleSubmit = () => {
    if (!subscription || !selectedPlanId) return;
    const effectiveStartDate = startDate ? new Date(startDate) : new Date();
    onConfirm(subscription, selectedPlanId, selectedInterval, effectiveStartDate, reason || undefined, sendEmail);
  };

  const handleClose = () => {
    setSelectedPlanId(null);
    setStartDate('');
    setReason('');
    setSendEmail(true);
    onClose();
  };

  if (!subscription) return null;

  // Helper to parse limits if they come as a string
  const parseLimits = (limits: any) => {
    if (!limits) return {};
    if (typeof limits === 'string') {
      try {
        return JSON.parse(limits);
      } catch {
        return {};
      }
    }
    return limits;
  };

  const currentPlan = subscription.plan;
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // Ensure limits are parsed for all plans
  const normalizedPlans = plans.map(plan => ({
    ...plan,
    limits: parseLimits(plan.limits)
  }));

  const normalizedCurrentPlan = {
    ...currentPlan,
    limits: parseLimits(currentPlan?.limits)
  };

  const normalizedSelectedPlan = selectedPlan ? {
    ...selectedPlan,
    limits: parseLimits(selectedPlan.limits)
  } : null;

  const getFeatureComparison = (current: any, selected: any) => {
    const currentLimits = parseLimits(current?.limits);
    const selectedLimits = parseLimits(selected?.limits);
    
    const features = [
      { key: 'outlets', label: 'Max Outlets', current: currentLimits?.outlets, selected: selectedLimits?.outlets },
      { key: 'users', label: 'Max Users', current: currentLimits?.users, selected: selectedLimits?.users },
      { key: 'products', label: 'Max Products', current: currentLimits?.products, selected: selectedLimits?.products },
      { key: 'customers', label: 'Max Customers', current: currentLimits?.customers, selected: selectedLimits?.customers }
    ];

    return features.map(feature => ({
      ...feature,
      change: feature.selected > feature.current ? 'upgrade' : 
              feature.selected < feature.current ? 'downgrade' : 'same'
    }));
  };

  const features = getFeatureComparison(normalizedCurrentPlan, normalizedSelectedPlan);

  // Calculate pricing dynamically from basePrice and discount percentages
  // This ensures we always use API data, not hard-coded values
  const calculatePricingForInterval = (plan: Plan, interval: BillingInterval) => {
    const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === interval);
    if (!cycleConfig) return { price: 0, discount: 0, savings: 0, discountedPrice: 0, monthlyEquivalent: 0 };
    
    const basePrice = plan.basePrice || 0;
    const months = cycleConfig.months;
    const discount = cycleConfig.discount / 100; // Convert percentage to decimal
    const totalBasePrice = basePrice * months;
    const discountAmount = totalBasePrice * discount;
    const finalPrice = totalBasePrice - discountAmount;
    
    return {
      price: finalPrice,
      discount: cycleConfig.discount,
      savings: discountAmount,
      discountedPrice: finalPrice,
      monthlyEquivalent: finalPrice / months
    };
  };

  // Calculate end date from start date and billing interval
  const calculateEndDate = (startDateStr: string, interval: BillingInterval): Date | null => {
    if (!startDateStr) return null;
    const start = new Date(startDateStr);
    const end = new Date(start);
    const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === interval);
    if (!cycleConfig) return null;
    
    end.setMonth(end.getMonth() + cycleConfig.months);
    return end;
  };

  // Calculate duration in days and months
  const calculateDuration = (startDateStr: string, interval: BillingInterval): { days: number; months: number } | null => {
    const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === interval);
    if (!cycleConfig) return null;
    
    const start = new Date(startDateStr);
    const end = calculateEndDate(startDateStr, interval);
    if (!end) return null;
    
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return {
      days,
      months: cycleConfig.months
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-action-primary" />
            Change Subscription Plan
          </DialogTitle>
          <DialogDescription className="mt-1">
            Change subscription plan for {subscription.merchant?.name || 'Unknown Merchant'}. 
            This will update the plan and pricing immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Current Plan Info - Simplified */}
            <div className="flex items-center justify-between p-3 bg-action-primary/10 border border-action-primary/20 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="font-semibold">{currentPlan?.name || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current Amount</p>
                <p className="font-semibold">
                  {formatCurrency(
                    subscription.amount || 0, 
                    (subscription.currency || currentPlan?.currency || 'USD') as any
                  )}
                  /{subscription.interval || 'month'}
                </p>
              </div>
            </div>

          {/* Billing Period Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Billing Period</Label>
            <Select value={selectedInterval} onValueChange={(value) => setSelectedInterval(value as BillingInterval)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select billing period" />
              </SelectTrigger>
              <SelectContent>
                {BILLING_CYCLES_ARRAY.map((cycle: BillingCycleConfig) => (
                  <SelectItem key={cycle.value} value={cycle.value}>
                    {cycle.label} {cycle.discount > 0 && `(${cycle.discount}% off)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Available Plans */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Select New Plan</Label>
            {plans.length === 0 && (
              <Alert>
                <AlertDescription className="text-action-warning">
                  ⚠️ No plans available. Please ensure plans are loaded from the database.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {normalizedPlans.map((plan) => {
                // Calculate pricing dynamically from basePrice (from API)
                // This ensures we always use API data, not hard-coded values
                const periodPricing = calculatePricingForInterval(plan, selectedInterval);
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`cursor-pointer transition-all ${
                      selectedPlanId === plan.id 
                        ? 'ring-2 ring-action-primary border-action-primary' 
                        : 'hover:border-border'
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {selectedPlanId === plan.id && (
                          <Check className="h-5 w-5 text-action-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {formatCurrency(periodPricing.price, plan.currency as any)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {(() => {
                              const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === selectedInterval);
                              if (!cycleConfig) return 'per month';
                              if (cycleConfig.months === 1) return 'per month';
                              if (cycleConfig.months === 3) return 'per quarter';
                              if (cycleConfig.months === 6) return 'every 6 months';
                              return 'per year';
                            })()}
                          </div>
                          {periodPricing.discount > 0 && (
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <Badge variant="outline" className="text-action-success border-action-success/20">
                                {periodPricing.discount}% off
                              </Badge>
                              <span className="text-xs text-action-success">
                                Save {formatCurrency(periodPricing.savings, plan.currency as any)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>Outlets: {plan.limits.outlets === -1 ? 'Unlimited' : plan.limits.outlets}</div>
                          <div>Users: {plan.limits.users === -1 ? 'Unlimited' : plan.limits.users}</div>
                          <div>Products: {plan.limits.products === -1 ? 'Unlimited' : plan.limits.products}</div>
                          <div>Customers: {plan.limits.customers === -1 ? 'Unlimited' : plan.limits.customers}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>



            {/* Summary - Show when plan is selected */}
            {selectedPlan && (
              <div className="space-y-4 p-4 bg-bg-secondary border border-border rounded-lg">
                {(() => {
                  const newPricing = calculatePricingForInterval(selectedPlan, selectedInterval);
                  const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === selectedInterval);
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">New Plan</p>
                          <p className="font-semibold">{selectedPlan.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Billing Period</p>
                          <p className="font-semibold">{cycleConfig?.label || selectedInterval}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Price</p>
                        <p className="font-bold text-lg">
                          {formatCurrency(newPricing.price, selectedPlan.currency as any)}
                      </p>
                    </div>
                        <div>
                          <p className="text-muted-foreground">Monthly Equivalent</p>
                        <p className="font-semibold">
                          {formatCurrency(newPricing.monthlyEquivalent, selectedPlan.currency as any)}/month
                      </p>
                    </div>
                  </div>

                    {/* Start Date Selection */}
                    <div className="space-y-2 border-t pt-4">
                      <Label htmlFor="startDate" className="text-sm font-semibold">
                        Start Date & Time
                      </Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    {/* Reason for Change */}
                    <div className="space-y-2">
                      <Label htmlFor="reason" className="text-sm font-semibold">
                        Reason (Optional)
                      </Label>
                      <Textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for change..."
                        rows={2}
                        className="w-full"
                      />
                            </div>
                            
                    {/* Send Email Notification */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="sendEmail"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="h-4 w-4 text-action-primary focus:ring-action-primary border-border rounded"
                      />
                      <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                        Send email notification to merchant
                      </Label>
                              </div>
                      </>
                    );
                  })()}
                </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !selectedPlanId}
            >
              {loading ? 'Changing Plan...' : 'Change Plan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
