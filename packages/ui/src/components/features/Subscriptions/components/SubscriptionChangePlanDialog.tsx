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
  Badge
} from '@rentalshop/ui';
import { formatDate, formatCurrency } from '@rentalshop/ui';
import { ArrowRight, Check, X, Clock, DollarSign, HelpCircle, Info } from 'lucide-react';
import type { Subscription, Plan, BillingPeriod } from '@rentalshop/types';
import { calculateProration } from '@rentalshop/utils';

interface SubscriptionChangePlanDialogProps {
  subscription: Subscription | null;
  plans: Plan[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subscription: Subscription, newPlanId: number, period: BillingPeriod) => void;
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
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>(1);

  const handleSubmit = () => {
    if (!subscription || !selectedPlanId) return;
    onConfirm(subscription, selectedPlanId, selectedPeriod);
  };

  const handleClose = () => {
    setSelectedPlanId(null);
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
  const [showProrationInfo, setShowProrationInfo] = useState(false);

  // Calculate pricing dynamically from basePrice and discount percentages
  // This ensures we always use API data, not hard-coded values
  const calculatePricingForPeriod = (plan: Plan, period: BillingPeriod) => {
    const basePrice = plan.basePrice || 0;
    const currency = plan.currency || 'USD';
    
    // Discount percentages: Monthly (0%), Quarterly (0%), 6 Months (5%), Yearly (10%)
    let discount = 0;
    let months = 1;
    
    if (period === 1) {
      months = 1;
      discount = 0;
    } else if (period === 3) {
      months = 3;
      discount = 0;
    } else if (period === 6) {
      months = 6;
      discount = 5;
    } else if (period === 12) {
      months = 12;
      discount = 10;
    }
    
    const totalBasePrice = basePrice * months;
    const discountAmount = (totalBasePrice * discount) / 100;
    const finalPrice = totalBasePrice - discountAmount;
    
    return {
      price: finalPrice,
      discount,
      savings: discountAmount,
      discountedPrice: finalPrice,
      monthlyEquivalent: finalPrice / months
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-700" />
            Change Subscription Plan
          </DialogTitle>
          <DialogDescription>
            Change subscription plan for {subscription.merchant?.name || 'Unknown Merchant'}. 
            This will update the plan and pricing immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Current Subscription Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Current Subscription Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-gray-600">Current Plan</Label>
                  <p className="font-medium mt-1">{currentPlan?.name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Current Period Start</Label>
                  <p className="font-medium mt-1">
                    {subscription.currentPeriodStart 
                      ? formatDate(subscription.currentPeriodStart) 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Current Period End</Label>
                  <p className="font-medium mt-1">
                    {subscription.currentPeriodEnd 
                      ? formatDate(subscription.currentPeriodEnd) 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Next Billing Date</Label>
                  <p className="font-medium mt-1">
                    {subscription.currentPeriodEnd 
                      ? formatDate(subscription.currentPeriodEnd) 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Current Amount</Label>
                  <p className="font-medium mt-1">
                    {formatCurrency(
                      subscription.amount || 0, 
                      (subscription.currency || currentPlan?.currency || 'USD') as any
                    )}
                    /{subscription.interval || 'month'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Status</Label>
                  <p className="font-medium mt-1">
                    <Badge variant="outline">{subscription.status}</Badge>
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-gray-600">Days Remaining</Label>
                  <p className="font-medium mt-1">
                    {subscription.currentPeriodEnd 
                      ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                      : 'N/A'} days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Period Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Billing Period</Label>
            <Select value={selectedPeriod.toString()} onValueChange={(value) => setSelectedPeriod(parseInt(value) as BillingPeriod)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select billing period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Monthly (0% discount)</SelectItem>
                <SelectItem value="3">Quarterly (0% discount)</SelectItem>
                <SelectItem value="6">6 Months (5% discount)</SelectItem>
                <SelectItem value="12">Yearly (10% discount)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Available Plans */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Select New Plan</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {normalizedPlans.map((plan) => {
                // Calculate pricing dynamically from basePrice (from API)
                // This ensures we always use API data, not hard-coded values
                const periodPricing = calculatePricingForPeriod(plan, selectedPeriod);
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`cursor-pointer transition-all ${
                      selectedPlanId === plan.id 
                        ? 'ring-2 ring-blue-500 border-blue-500' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {selectedPlanId === plan.id && (
                          <Check className="h-5 w-5 text-blue-700" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {formatCurrency(periodPricing.price, plan.currency as any)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {selectedPeriod === 1 ? 'per month' : 
                             selectedPeriod === 3 ? 'per quarter' : 
                             selectedPeriod === 6 ? 'every 6 months' : 'per year'}
                          </div>
                          {periodPricing.discount > 0 && (
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                {periodPricing.discount}% off
                              </Badge>
                              <span className="text-xs text-green-600">
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

          {/* Change Summary */}
          {selectedPlan && currentPlan && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Plan Change Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Plan Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Current Plan</Label>
                      <p className="font-semibold mt-1">{currentPlan.name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatCurrency(currentPlan.basePrice, currentPlan.currency as any)}/month
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">New Plan</Label>
                      <p className="font-semibold mt-1 text-green-700">{selectedPlan.name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatCurrency(selectedPlan.basePrice, selectedPlan.currency as any)}/month
                      </p>
                    </div>
                  </div>

                  {/* Pricing Details */}
                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Billing Period:</span>
                        <span className="font-medium">
                          {selectedPeriod === 1 ? 'Monthly' : 
                           selectedPeriod === 3 ? 'Quarterly' : 
                           selectedPeriod === 6 ? '6 Months' : 'Yearly'}
                        </span>
                      </div>
                      {(() => {
                        const newPricing = calculatePricingForPeriod(selectedPlan, selectedPeriod);
                        const newMonthlyPrice = newPricing.monthlyEquivalent;
                        
                        // Calculate proration for remaining days in current period
                        const currentPeriodStart = subscription.currentPeriodStart 
                          ? new Date(subscription.currentPeriodStart) 
                          : new Date();
                        const currentPeriodEnd = subscription.currentPeriodEnd 
                          ? new Date(subscription.currentPeriodEnd) 
                          : new Date();
                        const currentMonthlyPrice = subscription.amount || currentPlan.basePrice || 0;
                        
                        const proration = calculateProration(
                          {
                            amount: currentMonthlyPrice,
                            currentPeriodStart,
                            currentPeriodEnd
                          },
                          newMonthlyPrice,
                          new Date()
                        );
                        
                        return (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">New Period Price:</span>
                              <span className="font-medium">
                                {formatCurrency(newPricing.price, selectedPlan.currency as any)}
                              </span>
                            </div>
                            {newPricing.discount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Discount:</span>
                                <span className="font-medium text-green-600">
                                  {newPricing.discount}% (Save {formatCurrency(newPricing.savings, selectedPlan.currency as any)})
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Monthly Equivalent:</span>
                              <span className="font-medium">
                                {formatCurrency(newPricing.monthlyEquivalent, selectedPlan.currency as any)}/month
                              </span>
                            </div>
                            
                            {/* Proration Calculation */}
                            {proration.daysRemaining > 0 && (
                              <div className="border-t pt-3 mt-3">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-yellow-800">Proration Calculation:</p>
                                    <button
                                      type="button"
                                      onClick={() => setShowProrationInfo(!showProrationInfo)}
                                      className="text-yellow-700 hover:text-yellow-900 transition-colors"
                                      title="How is proration calculated?"
                                    >
                                      <HelpCircle className="h-4 w-4" />
                                    </button>
                                  </div>
                                  
                                  {/* Proration Info Tooltip */}
                                  {showProrationInfo && (
                                    <div className="mb-2 p-2 bg-white border border-yellow-300 rounded text-xs text-gray-700">
                                      <div className="flex items-start gap-2">
                                        <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                        <div className="space-y-1">
                                          <p className="font-semibold text-yellow-800">How Proration Works:</p>
                                          <p>• <strong>Days Remaining:</strong> {proration.daysRemaining} days left in current billing period</p>
                                          <p>• <strong>Price Difference:</strong> New plan ({formatCurrency(newMonthlyPrice, (selectedPlan.currency || 'USD') as any)}) - Current plan ({formatCurrency(currentMonthlyPrice, (currentPlan.currency || 'USD') as any)}) = {formatCurrency(Math.abs(newMonthlyPrice - currentMonthlyPrice), (selectedPlan.currency || 'USD') as any)}/month</p>
                                          <p>• <strong>Daily Rate:</strong> {formatCurrency(Math.abs(newMonthlyPrice - currentMonthlyPrice), (selectedPlan.currency || 'USD') as any)} ÷ 30 days = {formatCurrency(Math.abs(newMonthlyPrice - currentMonthlyPrice) / 30, (selectedPlan.currency || 'USD') as any)}/day</p>
                                          <p>• <strong>Prorated Amount:</strong> {formatCurrency(Math.abs(newMonthlyPrice - currentMonthlyPrice) / 30, (selectedPlan.currency || 'USD') as any)} × {proration.daysRemaining} days = {formatCurrency(proration.chargeAmount || proration.creditAmount, (selectedPlan.currency || 'USD') as any)}</p>
                                          {proration.isUpgrade && (
                                            <p className="text-orange-600 font-medium">• You will be charged this amount for the remaining {proration.daysRemaining} days</p>
                                          )}
                                          {proration.isDowngrade && (
                                            <p className="text-green-600 font-medium">• You will receive this credit for the remaining {proration.daysRemaining} days</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Days Remaining in Current Period:</span>
                                      <span className="font-medium">{proration.daysRemaining} days</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Current Plan Monthly Price:</span>
                                      <span className="font-medium">
                                        {formatCurrency(currentMonthlyPrice, (currentPlan.currency || 'USD') as any)}/month
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">New Plan Monthly Price:</span>
                                      <span className="font-medium">
                                        {formatCurrency(newMonthlyPrice, (selectedPlan.currency || 'USD') as any)}/month
                                      </span>
                                    </div>
                                    {proration.isUpgrade && proration.chargeAmount > 0 && (
                                      <div className="flex justify-between pt-1 border-t">
                                        <span className="text-gray-700 font-medium">Additional Charge (Prorated):</span>
                                        <span className="font-bold text-orange-600">
                                          +{formatCurrency(proration.chargeAmount, (selectedPlan.currency || 'USD') as any)}
                                        </span>
                                      </div>
                                    )}
                                    {proration.isDowngrade && proration.creditAmount > 0 && (
                                      <div className="flex justify-between pt-1 border-t">
                                        <span className="text-gray-700 font-medium">Credit (Prorated):</span>
                                        <span className="font-bold text-green-600">
                                          -{formatCurrency(proration.creditAmount, (selectedPlan.currency || 'USD') as any)}
                                        </span>
                                      </div>
                                    )}
                                    <p className="text-xs text-gray-500 mt-2 italic">
                                      {proration.reason}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Effective Date Info */}
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">Important Information:</p>
                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                          <li>The plan change will take effect immediately (today: {formatDate(new Date())})</li>
                          <li>New billing cycle starts from today with the selected billing period</li>
                          <li>Next billing date: {(() => {
                            const newPricing = calculatePricingForPeriod(selectedPlan, selectedPeriod);
                            const periodDays = selectedPeriod === 1 ? 30 : selectedPeriod === 3 ? 90 : selectedPeriod === 6 ? 180 : 365;
                            const nextBilling = new Date();
                            nextBilling.setDate(nextBilling.getDate() + periodDays);
                            return formatDate(nextBilling);
                          })()}</li>
                          {(() => {
                            const currentPeriodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : new Date();
                            const proration = calculateProration(
                              {
                                amount: subscription.amount || currentPlan.basePrice || 0,
                                currentPeriodStart: subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart) : new Date(),
                                currentPeriodEnd
                              },
                              calculatePricingForPeriod(selectedPlan, selectedPeriod).monthlyEquivalent,
                              new Date()
                            );
                            if (proration.chargeAmount > 0) {
                              return <li className="text-orange-600">You will be charged {formatCurrency(proration.chargeAmount, (selectedPlan.currency || 'USD') as any)} for the prorated upgrade</li>;
                            } else if (proration.creditAmount > 0) {
                              return <li className="text-green-600">You will receive a credit of {formatCurrency(proration.creditAmount, (selectedPlan.currency || 'USD') as any)} for the prorated downgrade</li>;
                            }
                            return null;
                          })()}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 mt-4 border-t pt-4">
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
