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
import { formatDate, formatCurrency, Badge, Card, CardContent } from '@rentalshop/ui';
import { ArrowRight, Package } from 'lucide-react';
import type { Subscription, Plan, BillingInterval, PlanLimitAddon } from '@rentalshop/types';

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
  onConfirm: (subscription: Subscription, newPlanId: number, interval: BillingInterval, startDate?: Date, reason?: string, sendEmail?: boolean, customPrice?: number) => void;
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
  const [addons, setAddons] = useState<PlanLimitAddon[]>([]);
  const [totalAddonLimits, setTotalAddonLimits] = useState({
    outlets: 0,
    users: 0,
    products: 0,
    customers: 0,
    orders: 0
  });
  const [manualPrice, setManualPrice] = useState<string>('');

  // Initialize start date to today when dialog opens
  React.useEffect(() => {
    if (isOpen && !startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setStartDate(today.toISOString().slice(0, 16));
    }
  }, [isOpen, startDate]);

  // Fetch addons when dialog opens
  React.useEffect(() => {
    if (isOpen && subscription?.merchantId) {
      const fetchAddons = async () => {
        try {
          const { planLimitAddonsApi } = await import('@rentalshop/utils');
          const result = await planLimitAddonsApi.getMerchantPlanLimitAddons(
            subscription.merchantId!,
            { isActive: true, page: 1, limit: 100, offset: 0 }
          );
          
          if (result.success && result.data) {
            const activeAddons = result.data.addons || [];
            setAddons(activeAddons);
            
            // Calculate total addon limits
            const totals = activeAddons.reduce(
              (acc, addon) => ({
                outlets: acc.outlets + (addon.outlets || 0),
                users: acc.users + (addon.users || 0),
                products: acc.products + (addon.products || 0),
                customers: acc.customers + (addon.customers || 0),
                orders: acc.orders + (addon.orders || 0)
              }),
              { outlets: 0, users: 0, products: 0, customers: 0, orders: 0 }
            );
            setTotalAddonLimits(totals);
          }
        } catch (error) {
          console.error('Error fetching addons:', error);
        }
      };
      
      fetchAddons();
    }
  }, [isOpen, subscription?.merchantId]);


  const handleSubmit = () => {
    if (!subscription || !selectedPlanId) return;
    const effectiveStartDate = startDate ? new Date(startDate) : new Date();
    const customPrice = manualPrice ? parseFloat(manualPrice) : undefined;
    onConfirm(subscription, selectedPlanId, selectedInterval, effectiveStartDate, reason || undefined, sendEmail, customPrice);
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

  // Calculate change plan price breakdown
  const calculateChangePlanBreakdown = () => {
    if (!subscription || !selectedPlan) return null;

    const now = new Date();
    const currentPeriodStart = subscription.currentPeriodStart 
      ? new Date(subscription.currentPeriodStart)
      : new Date();
    const currentPeriodEnd = subscription.currentPeriodEnd 
      ? new Date(subscription.currentPeriodEnd)
      : new Date();

    // Calculate old plan period
    const oldPeriodDays = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    const usedDays = Math.max(0, Math.ceil((now.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate old plan price
    const oldBillingInterval = subscription.billingInterval || 'monthly';
    const oldMonthlyPrice = subscription.plan?.basePrice || 0;
    const getOldPeriodPrice = (interval: string): number => {
      switch (interval) {
        case 'monthly': return oldMonthlyPrice;
        case 'quarterly': return oldMonthlyPrice * 3;
        case 'semi_annual': return oldMonthlyPrice * 6 * 0.95;
        case 'annual': return oldMonthlyPrice * 12 * 0.90;
        default: return oldMonthlyPrice;
      }
    };
    const oldPeriodPrice = getOldPeriodPrice(oldBillingInterval);
    const oldDailyPrice = oldPeriodPrice / oldPeriodDays;
    const oldUsedValue = (usedDays / oldPeriodDays) * oldPeriodPrice;
    const oldRemainingValue = remainingDays > 0 ? (remainingDays / oldPeriodDays) * oldPeriodPrice : 0;

    // Calculate new plan price
    const newPricing = calculatePricingForInterval(selectedPlan, selectedInterval);
    const newPlanPrice = newPricing.price;

    // Total = New Plan Price - Remaining Credit from Old Plan
    const totalPrice = Math.max(0, newPlanPrice - oldRemainingValue);

    return {
      oldPlan: {
        name: subscription.plan?.name || 'Unknown',
        periodStart: currentPeriodStart,
        periodEnd: currentPeriodEnd,
        periodDays: oldPeriodDays,
        usedDays: usedDays,
        remainingDays: remainingDays,
        periodPrice: oldPeriodPrice,
        usedValue: oldUsedValue,
        remainingValue: oldRemainingValue,
        dailyPrice: oldDailyPrice,
        currency: subscription.plan?.currency || 'VND'
      },
      newPlan: {
        name: selectedPlan.name,
        periodPrice: newPlanPrice,
        currency: selectedPlan.currency || 'VND',
        interval: selectedInterval
      },
      total: totalPrice,
      formula: {
        step1: `Old Plan (${subscription.plan?.name || 'Unknown'}): ${usedDays} days used / ${oldPeriodDays} days = ${formatCurrency(oldUsedValue, (subscription.plan?.currency || 'VND') as any)} used, ${remainingDays} days remaining = ${formatCurrency(oldRemainingValue, (subscription.plan?.currency || 'VND') as any)} remaining`,
        step2: `New Plan (${selectedPlan.name}): ${formatCurrency(newPlanPrice, (selectedPlan.currency || 'VND') as any)} for ${selectedInterval}`,
        step3: `Total: New Plan Price (${formatCurrency(newPlanPrice, (selectedPlan.currency || 'VND') as any)}) - Remaining Credit (${formatCurrency(oldRemainingValue, (subscription.plan?.currency || 'VND') as any)}) = ${formatCurrency(totalPrice, (selectedPlan.currency || 'VND') as any)}`
      }
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

  const computedEndDate = calculateEndDate(startDate, selectedInterval);
  const computedDuration = calculateDuration(startDate, selectedInterval);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-action-primary" />
            Change Subscription Plan
          </DialogTitle>
          <DialogDescription className="text-sm mt-1">
            {currentPlan?.name} • {formatCurrency(subscription.amount || 0, (subscription.currency || currentPlan?.currency || 'USD') as any)}/{subscription.interval || 'month'}
            {addons.length > 0 && (
              <span className="ml-2 text-xs">
                • {addons.length} addon{addons.length > 1 ? 's' : ''} active
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto">
          <div className="space-y-4">

          {/* Billing Period & Plan Selection - Compact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Billing Period</Label>
              <Select value={selectedInterval} onValueChange={(value) => setSelectedInterval(value as BillingInterval)}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select period" />
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate.split('T')[0]}
                onChange={(e) => setStartDate(e.target.value + 'T00:00:00')}
                className="w-full text-sm"
              />
            </div>
          </div>

          {/* End Date (computed) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={computedEndDate ? computedEndDate.toISOString().split('T')[0] : ''}
                readOnly
                className="w-full text-sm bg-muted/30"
              />
              {computedDuration && (
                <div className="text-[10px] text-muted-foreground">
                  Duration: {computedDuration.months} month{computedDuration.months !== 1 ? 's' : ''} (~{computedDuration.days} days)
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium"> </Label>
              <div className="h-9 flex items-center text-xs text-muted-foreground">
                {computedEndDate ? `Ends on ${formatDate(computedEndDate)}` : 'Select start date to calculate end date'}
              </div>
            </div>
          </div>

            {/* Select New Plan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Select New Plan</Label>
            {plans.length === 0 && (
              <Alert>
                <AlertDescription className="text-action-warning text-sm">
                  ⚠️ No plans available
                </AlertDescription>
              </Alert>
            )}
              <Select 
                value={selectedPlanId?.toString() || ''} 
                onValueChange={(value) => setSelectedPlanId(parseInt(value))}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
              {normalizedPlans.map((plan) => {
                const periodPricing = calculatePricingForInterval(plan, selectedInterval);
                    const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === selectedInterval);
                
                return (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-sm">{plan.name}</span>
                          <span className="ml-4 text-xs text-muted-foreground">
                            {formatCurrency(periodPricing.price, plan.currency as any)}
                            {cycleConfig && cycleConfig.months > 1 && ` (${cycleConfig.months}m)`}
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
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
              {(() => {
                const newPricing = calculatePricingForInterval(selectedPlan, selectedInterval);
                const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === selectedInterval);
                return (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">New Plan Price</p>
                          <p className="font-bold text-lg text-primary">
                            {formatCurrency(newPricing.price, selectedPlan.currency as any)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Monthly</p>
                          <p className="font-semibold text-sm">
                            {formatCurrency(newPricing.monthlyEquivalent, selectedPlan.currency as any)}/mo
                          </p>
                        </div>
                      </div>
                      
                      {/* Editable Price */}
                      <div className="space-y-1">
                        <Label htmlFor="manualPrice" className="text-xs font-medium">
                          Override Price (Optional)
                        </Label>
                        <Input
                          id="manualPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={manualPrice}
                          onChange={(e) => setManualPrice(e.target.value)}
                          placeholder={newPricing.price.toString()}
                          className="w-full text-sm"
                        />
                        <div className="text-xs text-muted-foreground">
                          Auto-calculated: {formatCurrency(newPricing.price, selectedPlan.currency as any)}
                        </div>
                      </div>

                      {/* Calculation Breakdown */}
                      {(() => {
                        const breakdown = calculateChangePlanBreakdown();
                        return breakdown ? (
                          <div className="pt-2 border-t border-gray-200 space-y-1">
                            <div className="text-xs font-semibold text-gray-700">Calculation Details:</div>
                            <div className="text-[10px] text-gray-600 space-y-0.5">
                              <div>1. {breakdown.formula.step1}</div>
                              <div>2. {breakdown.formula.step2}</div>
                              <div className="font-semibold text-gray-700">3. {breakdown.formula.step3}</div>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    {/* Active Addons - Compact */}
                    {addons.length > 0 && (
                      <div className="pt-2 border-t space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3 w-3 text-action-primary" />
                          <span className="text-xs font-semibold">Active Addons ({addons.length})</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Additional limits: {[
                            totalAddonLimits.outlets > 0 && `${totalAddonLimits.outlets} Outlets`,
                            totalAddonLimits.users > 0 && `${totalAddonLimits.users} Users`,
                            totalAddonLimits.products > 0 && `${totalAddonLimits.products} Products`,
                            totalAddonLimits.customers > 0 && `${totalAddonLimits.customers} Customers`,
                            totalAddonLimits.orders > 0 && `${totalAddonLimits.orders} Orders`
                          ].filter(Boolean).join(', ') || 'None'}
                        </div>
                        <div className="text-xs text-gray-500 italic">
                          Addons will remain active after plan change
                        </div>
                      </div>
                    )}

                    {/* Reason & Email - Compact */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div className="space-y-1">
                        <Label htmlFor="reason" className="text-xs font-medium">Reason (Optional)</Label>
                        <Input
                          id="reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason..."
                          className="w-full text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="sendEmail"
                            checked={sendEmail}
                            onChange={(e) => setSendEmail(e.target.checked)}
                            className="h-4 w-4 text-action-primary focus:ring-action-primary border-border rounded"
                          />
                          <Label htmlFor="sendEmail" className="text-xs font-normal cursor-pointer">
                            Send email notification
                          </Label>
                        </div>
                      </div>
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
