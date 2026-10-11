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
import { formatCurrency, Badge, Card, CardContent } from '@rentalshop/ui';
import { ArrowRight, Package } from 'lucide-react';
import { calculatePlanChangeTotal, storedBillingInterval, formatInShopZone } from '@rentalshop/utils';
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
    // The API starts the new plan now and prices it from the plan (#779): no custom start date or price is sent.
    onConfirm(subscription, selectedPlanId, selectedInterval, new Date(), reason || undefined, sendEmail, undefined);
  };

  const handleClose = () => {
    setSelectedPlanId(null);
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

  // Same calculation as the API's changePlan (#779): credit for the unused Vietnam days of the current period,
  // new cycle price from the new plan, new period starts now and runs one cycle of calendar months.
  const oldInterval = storedBillingInterval(
    (subscription as any).interval ?? subscription.billingInterval,
    (subscription as any).intervalCount
  );
  const planChange = selectedPlan
    ? calculatePlanChangeTotal({
        subscription: {
          currentPeriodStart: subscription.currentPeriodStart || new Date(),
          currentPeriodEnd: subscription.currentPeriodEnd || new Date(),
          billingInterval: oldInterval,
          plan: { basePrice: subscription.plan?.basePrice || 0 },
        },
        newPlan: { basePrice: selectedPlan.basePrice || 0 },
        selectedInterval,
      })
    : null;
  const oldCurrency = (subscription.currency || subscription.plan?.currency || 'USD') as any;
  const newCurrency = (selectedPlan?.currency || oldCurrency) as any;
  const selectedCycle = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === selectedInterval);

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
              <div className="h-9 flex items-center text-sm text-muted-foreground">
                {planChange ? formatInShopZone(planChange.newPeriodStart) : 'Today'}
              </div>
            </div>
          </div>

          {/* End Date (computed on the Vietnam day, same as the API) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">End Date</Label>
              <div className="h-9 flex items-center text-sm text-muted-foreground">
                {planChange ? formatInShopZone(planChange.newPeriodEnd) : 'Select a plan to calculate the end date'}
              </div>
              {selectedCycle && (
                <div className="text-[10px] text-muted-foreground">
                  Duration: {selectedCycle.months} month{selectedCycle.months !== 1 ? 's' : ''}
                </div>
              )}
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
                return (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">New Plan Price</p>
                          <p className="font-bold text-lg text-primary">
                            {formatCurrency(planChange?.newPlanPeriodPrice ?? newPricing.price, newCurrency)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Monthly</p>
                          <p className="font-semibold text-sm">
                            {formatCurrency(newPricing.monthlyEquivalent, newCurrency)}/mo
                          </p>
                        </div>
                      </div>

                      {/* Breakdown: what the API charges */}
                      {planChange && (
                        <div className="pt-2 border-t border-gray-200 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>New cycle price ({selectedPlan.name}{selectedCycle ? `, ${selectedCycle.label}` : ''}):</span>
                            <span className="font-medium">{formatCurrency(planChange.newPlanPeriodPrice, newCurrency)}</span>
                          </div>
                          <div className="flex justify-between text-green-700">
                            <span>
                              Credit for {planChange.remainingDays} unused day{planChange.remainingDays !== 1 ? 's' : ''} of {planChange.oldPlanPeriodDays} ({currentPlan?.name || 'current plan'}):
                            </span>
                            <span className="font-medium">-{formatCurrency(planChange.remainingCreditValue, oldCurrency)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t font-semibold text-sm">
                            <span>Total due:</span>
                            <span className="text-primary">{formatCurrency(planChange.totalDue, newCurrency)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>New period:</span>
                            <span>{formatInShopZone(planChange.newPeriodStart)} - {formatInShopZone(planChange.newPeriodEnd)}</span>
                          </div>
                        </div>
                      )}
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
