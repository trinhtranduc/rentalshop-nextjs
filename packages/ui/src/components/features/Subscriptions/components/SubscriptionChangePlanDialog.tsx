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
import { ArrowRight, Check, X, Clock, DollarSign } from 'lucide-react';
import type { Subscription, Plan, BillingPeriod } from '@rentalshop/types';

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

  const currentPlan = subscription.plan;
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const getFeatureComparison = (current: any, selected: any) => {
    const features = [
      { key: 'outlets', label: 'Max Outlets', current: current?.limits?.outlets, selected: selected?.limits?.outlets },
      { key: 'users', label: 'Max Users', current: current?.limits?.users, selected: selected?.limits?.users },
      { key: 'products', label: 'Max Products', current: current?.limits?.products, selected: selected?.limits?.products },
      { key: 'customers', label: 'Max Customers', current: current?.limits?.customers, selected: selected?.limits?.customers }
    ];

    return features.map(feature => ({
      ...feature,
      change: feature.selected > feature.current ? 'upgrade' : 
              feature.selected < feature.current ? 'downgrade' : 'same'
    }));
  };

  const features = getFeatureComparison(currentPlan, selectedPlan);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-600" />
            Change Subscription Plan
          </DialogTitle>
          <DialogDescription>
            Change subscription plan for {subscription.merchant?.name || 'Unknown Merchant'}. 
            This will update the plan and pricing immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{currentPlan?.name || 'Unknown Plan'}</h3>
                  <p className="text-sm text-gray-600">{currentPlan?.description || 'No description'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {currentPlan ? formatCurrency(currentPlan.basePrice, currentPlan.currency) : 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600">per month</p>
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
                <SelectItem value="3">Quarterly (10% discount)</SelectItem>
                <SelectItem value="12">Yearly (20% discount)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Available Plans */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Select New Plan</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const pricing = plan.pricing || {};
                const periodKey = selectedPeriod === 1 ? 'monthly' : selectedPeriod === 3 ? 'quarterly' : 'yearly';
                const periodPricing = pricing[periodKey] || { price: plan.basePrice, discount: 0, discountedPrice: plan.basePrice, savings: 0 };
                
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
                          <Check className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {formatCurrency(periodPricing.price, plan.currency)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {selectedPeriod === 1 ? 'per month' : 
                             selectedPeriod === 3 ? 'per quarter' : 'per year'}
                          </div>
                          {periodPricing.discount > 0 && (
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                {periodPricing.discount}% off
                              </Badge>
                              <span className="text-xs text-green-600">
                                Save {formatCurrency(periodPricing.savings, plan.currency)}
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

          {/* Plan Comparison */}
          {selectedPlan && (
            <Card>
              <CardHeader>
                <CardTitle>Plan Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="font-medium">Feature</div>
                    <div className="font-medium text-center">Current</div>
                    <div className="font-medium text-center">New Plan</div>
                  </div>
                  {features.map((feature) => (
                    <div key={feature.key} className="grid grid-cols-3 gap-4 text-sm">
                      <div>{feature.label}</div>
                      <div className="text-center">
                        {feature.current === -1 ? 'Unlimited' : feature.current}
                      </div>
                      <div className="text-center flex items-center justify-center gap-1">
                        {feature.selected === -1 ? 'Unlimited' : feature.selected}
                        {feature.change === 'upgrade' && (
                          <ArrowRight className="h-4 w-4 text-green-600" />
                        )}
                        {feature.change === 'downgrade' && (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Change Alert */}
          {selectedPlan && currentPlan && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Pricing Change:</p>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      From: {formatCurrency(currentPlan.basePrice, currentPlan.currency)}/month
                    </span>
                    <ArrowRight className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      To: {formatCurrency(selectedPlan.basePrice, selectedPlan.currency)}/month
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    The plan change will take effect immediately and billing will be updated accordingly.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
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
