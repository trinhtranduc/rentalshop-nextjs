"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { ResponsiveDialogFooter, DetailsToggle } from './ResponsiveDialogFooter';
import { ArrowRight, Package } from 'lucide-react';
import { calculatePlanChangeTotal, storedBillingInterval, formatInShopZone, canChangePlan, isNewPeriod } from '@rentalshop/utils';
import type { Subscription, Plan, BillingInterval, PlanLimitAddon } from '@rentalshop/types';

import { BILLING_CYCLES_ARRAY } from '@rentalshop/constants';

type BillingCycleConfig = {
  value: BillingInterval;
  label: string;
  months: number;
  discount: number;
  description: string;
};

export interface PlanChangePayment {
  method: string;
  transactionId: string;
  reference?: string;
}

export type PlanChangeConfirmResult = void | { success?: boolean; message?: string };

const PAYMENT_METHODS = [
  { value: 'TRANSFER', label: 'Bank transfer' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'MANUAL', label: 'Manual' },
];

interface SubscriptionChangePlanDialogProps {
  subscription: Subscription | null;
  plans: Plan[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subscription: Subscription, newPlanId: number, interval: BillingInterval, startDate?: Date, reason?: string, sendEmail?: boolean, customPrice?: number, payment?: PlanChangePayment) => PlanChangeConfirmResult | Promise<PlanChangeConfirmResult>;
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
  // Phone only: the price breakdown stays closed until asked for
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('monthly');
  const [reason, setReason] = useState<string>('');
  const [sendEmail, setSendEmail] = useState<boolean>(true);
  const [payMethod, setPayMethod] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [addons, setAddons] = useState<PlanLimitAddon[]>([]);
  // #870: priced add-ons count in the change (new cycle at today's price, credit for unused paid days), as the API
  const [addonTotals, setAddonTotals] = useState({ monthly: 0, paidMonthly: 0 });
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
      const fetchAddonTotals = async () => {
        try {
          const { addonPricesApi } = await import('@rentalshop/utils');
          const res = await addonPricesApi.listForMerchant(subscription.merchantId!);
          const renewal = res.success ? res.data?.renewal : null;
          setAddonTotals({ monthly: renewal?.addonMonthlyTotal || 0, paidMonthly: renewal?.addonPaidMonthlyTotal || 0 });
        } catch {
          setAddonTotals({ monthly: 0, paidMonthly: 0 });
        }
      };
      fetchAddonTotals();
    }
  }, [isOpen, subscription?.merchantId]);


  const handleSubmit = async () => {
    if (!subscription || !selectedPlanId) return;
    setErrorMessage('');
    setSubmitting(true);
    try {
      // The API starts the new plan now and prices it from the plan (#779): no custom start date or price is sent.
      const payment: PlanChangePayment | undefined = amountDue > 0
        ? { method: payMethod, transactionId: transactionId.trim() }
        : undefined;
      const result = await onConfirm(subscription, selectedPlanId, selectedInterval, new Date(), reason || undefined, sendEmail, undefined, payment);
      if (result && result.success === false) {
        setErrorMessage(result.message || 'The plan could not be changed.');
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'The plan could not be changed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPlanId(null);
    setReason('');
    setSendEmail(true);
    setPayMethod('');
    setTransactionId('');
    setErrorMessage('');
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
          status: subscription.status as any,
        },
        newPlan: { basePrice: selectedPlan.basePrice || 0 },
        selectedInterval,
        addonMonthlyTotal: addonTotals.monthly,
        paidAddonMonthlyTotal: addonTotals.paidMonthly,
      })
    : null;
  const oldCurrency = (subscription.currency || subscription.plan?.currency || 'USD') as any;
  const newCurrency = (selectedPlan?.currency || oldCurrency) as any;
  const selectedCycle = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === selectedInterval);

  // Plan rules (#785), same helper as the API: admin may change only in a new period, mid-period only upgrade.
  const currentPlanId = (subscription as any).planId ?? subscription.plan?.id ?? null;
  const currentBasePrice = subscription.plan?.basePrice || 0;
  const newPeriod = isNewPeriod({ status: subscription.status as any, currentPeriodEnd: subscription.currentPeriodEnd as any });
  const planRefusal = (plan: Plan): string | null => {
    const decision = canChangePlan({
      role: 'ADMIN',
      status: subscription.status as any,
      currentPlanId,
      currentPeriodEnd: subscription.currentPeriodEnd as any,
      currentBasePrice,
      newPlanId: plan.id,
      newBasePrice: plan.basePrice || 0,
    });
    if (decision.allowed) return null;
    if (currentPlanId != null && plan.id === currentPlanId) return 'Current plan';
    return 'Downgrade only in a new period';
  };
  const anyPlanSelectable = plans.some(p => planRefusal(p) === null);
  const amountDue = planChange?.totalDue ?? 0;
  const needsPayment = amountDue > 0;
  const paymentReady = !needsPayment || (payMethod !== '' && transactionId.trim() !== '');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="ar-dialog md:max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0 max-md:flex max-md:flex-col max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-full max-md:overflow-y-hidden max-md:rounded-none max-md:border-0 max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:[&>button]:right-1.5 max-md:[&>button]:top-1.5 max-md:[&>button]:p-3.5">
        <DialogHeader className="px-6 py-4 border-b border-ar-line shrink-0 max-md:px-4 max-md:pr-12">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-ar-primary" />
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
          {!newPeriod && (
            <p className="text-xs text-muted-foreground mt-1" data-testid="mid-period-info">
              Mid-period: upgrades only. A downgrade is possible in a new period.
            </p>
          )}
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0 max-md:px-4">
          <div className="space-y-4 max-md:space-y-0 max-md:grid max-md:grid-cols-2 max-md:gap-3">

          {/* Billing Period & Plan Selection - Compact */}
          <div className="grid grid-cols-2 gap-3 max-md:contents">
            <div className="space-y-1.5 max-md:col-span-2 max-md:order-2">
              <Label className="text-xs font-medium">Billing Period</Label>
              <Select value={selectedInterval} onValueChange={(value) => setSelectedInterval(value as BillingInterval)}>
                <SelectTrigger className="w-full text-sm max-md:min-h-11">
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
            <div className="space-y-1.5 max-md:order-3">
              <Label className="text-xs font-medium">Start Date</Label>
              <div className="h-9 max-md:h-auto max-md:min-h-9 flex items-center text-sm text-muted-foreground">
                {planChange ? formatInShopZone(planChange.newPeriodStart) : 'Today'}
              </div>
            </div>
          </div>

          {/* End Date (computed on the Vietnam day, same as the API) */}
          <div className="grid grid-cols-2 gap-3 max-md:contents">
            <div className="space-y-1.5 max-md:order-4">
              <Label className="text-xs font-medium">End Date</Label>
              <div className="h-9 max-md:h-auto max-md:min-h-9 flex items-center text-sm text-muted-foreground">
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
          <div className="space-y-1.5 max-md:col-span-2 max-md:order-1">
            <Label className="text-xs font-medium">Select New Plan</Label>
            {plans.length > 0 && !anyPlanSelectable && (
              <p className="text-xs text-action-warning" data-testid="no-plan-selectable">No plan can be chosen now.</p>
            )}
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
                <SelectTrigger className="w-full text-sm max-md:min-h-11">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
              {normalizedPlans.map((plan) => {
                const periodPricing = calculatePricingForInterval(plan, selectedInterval);
                    const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === selectedInterval);
                
                const refusal = planRefusal(plan);
                return (
                      <SelectItem key={plan.id} value={plan.id.toString()} disabled={refusal !== null}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-sm">
                            {plan.name}
                            {refusal && <span className="block text-[11px] font-normal text-muted-foreground">{refusal}</span>}
                          </span>
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
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3 max-md:col-span-2 max-md:order-5">
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
                        <DetailsToggle open={showDetails} onToggle={() => setShowDetails(v => !v)} />
                      )}
                      {planChange && (
                        <div className={`pt-2 border-t border-gray-200 space-y-1 text-xs ${showDetails ? '' : 'max-md:hidden'}`}>
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
                          {planChange.addonPeriodPrice > 0 && (
                            <div className="flex justify-between">
                              <span>Add-ons (new cycle):</span>
                              <span className="font-medium">{formatCurrency(planChange.addonPeriodPrice, newCurrency)}</span>
                            </div>
                          )}
                          {planChange.addonCreditValue > 0 && (
                            <div className="flex justify-between text-green-700">
                              <span>Add-on credit for unused days:</span>
                              <span className="font-medium">-{formatCurrency(planChange.addonCreditValue, oldCurrency)}</span>
                            </div>
                          )}
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
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t max-md:grid-cols-1">
                      <div className="space-y-1">
                        <Label htmlFor="reason" className="text-xs font-medium">Reason (Optional)</Label>
                        <Input
                          id="reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason..."
                          className="w-full text-sm max-md:min-h-11"
                        />
                      </div>
                      <div className="flex items-end">
                        <Label htmlFor="sendEmail" className="flex items-center gap-2 text-xs font-normal cursor-pointer max-md:min-h-11 max-md:w-full">
                          <input
                            type="checkbox"
                            id="sendEmail"
                            checked={sendEmail}
                            onChange={(e) => setSendEmail(e.target.checked)}
                            className="h-4 w-4 text-action-primary focus:ring-action-primary border-border rounded"
                          />
                          Send email notification
                        </Label>
                      </div>
                    </div>
                          </>
                        );
                      })()}
                    </div>
          )}

          {/* Payment: only when something is due (#785) */}
          {selectedPlan && needsPayment && (
            <div className="p-3 border rounded-lg space-y-3 max-md:col-span-2 max-md:order-6" data-testid="payment-block">
              <p className="text-xs font-semibold">Payment</p>
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Payment method *</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger className="w-full text-sm max-md:min-h-11" data-testid="payment-method">
                      <SelectValue placeholder="Select a method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="transactionId" className="text-xs font-medium">Transaction ID / reference *</Label>
                  <Input
                    id="transactionId"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. FT-123456"
                    className="w-full text-sm max-md:min-h-11"
                  />
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <Alert variant="destructive" className="max-md:col-span-2 max-md:order-7" data-testid="change-plan-error">
              <AlertDescription className="text-sm">{errorMessage}</AlertDescription>
            </Alert>
          )}
          </div>
        </div>

          {/* Action Buttons */}
        <ResponsiveDialogFooter
          className="ar-dialog-footer md:px-6 md:py-4 md:border-t md:border-ar-line"
          summaryLabel="Total due"
          summaryAmount={planChange ? formatCurrency(planChange.totalDue, newCurrency) : undefined}
          secondary={
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
          }
          primary={
            <Button
              onClick={handleSubmit}
              disabled={loading || submitting || !selectedPlanId || !paymentReady}
            >
              {loading || submitting ? 'Changing Plan...' : 'Change Plan'}
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  );
}
