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
  Label,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Textarea
} from '@rentalshop/ui';
import { formatDate, formatCurrency } from '@rentalshop/ui';
import { ArrowRight } from 'lucide-react';
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
  // Handles edge cases like month boundaries (e.g., Jan 31 -> Feb 28/29)
  const calculateEndDate = (startDateStr: string, interval: BillingInterval): Date | null => {
    if (!startDateStr) return null;
    const start = new Date(startDateStr);
    const end = new Date(start);
    const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === interval);
    if (!cycleConfig) return null;
    
    const originalDay = start.getDate();
    
    // Add months
    end.setMonth(end.getMonth() + cycleConfig.months);
    
    // Handle month boundary issues (e.g., Jan 31 -> Feb doesn't exist, use last day of Feb)
    if (end.getDate() !== originalDay) {
      // Move to first day of next month, then back one day to get last day of target month
      end.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }
    
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
            {/* Current Plan Info */}
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

            {/* Start Date and End Date */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-bg-secondary border border-border rounded-lg">
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm font-semibold">
                  End Date & Time
                </Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={(() => {
                    const endDate = calculateEndDate(startDate, selectedInterval);
                    if (!endDate) return '';
                    return endDate.toISOString().slice(0, 16);
                  })()}
                  readOnly
                  className="w-full bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const duration = calculateDuration(startDate, selectedInterval);
                    if (!duration) return '';
                    return `${duration.months} months (${duration.days} days)`;
                  })()}
                </p>
              </div>
            </div>

            {/* Select New Plan */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Select New Plan</Label>
            {plans.length === 0 && (
              <Alert>
                <AlertDescription className="text-action-warning">
                  ⚠️ No plans available. Please ensure plans are loaded from the database.
                </AlertDescription>
              </Alert>
            )}
              <Select 
                value={selectedPlanId?.toString() || ''} 
                onValueChange={(value) => setSelectedPlanId(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
              {normalizedPlans.map((plan) => {
                const periodPricing = calculatePricingForInterval(plan, selectedInterval);
                    const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === selectedInterval);
                
                return (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{plan.name}</span>
                          <span className="ml-4 text-sm text-muted-foreground">
                            {formatCurrency(periodPricing.price, plan.currency as any)}
                            {cycleConfig && cycleConfig.months > 1 && ` (${cycleConfig.months} months)`}
                              </span>
                        </div>
                      </SelectItem>
                );
              })}
                </SelectContent>
              </Select>
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

                      {/* Reason for Change */}
                    <div className="space-y-2 border-t pt-4">
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
        </div>

          {/* Action Buttons */}
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !selectedPlanId}
          >
            {loading ? 'Changing Plan...' : 'Change Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
