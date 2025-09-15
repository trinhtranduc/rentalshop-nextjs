'use client'

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Badge,
  RadioGroup,
  RadioGroupItem,
  Label
} from '@rentalshop/ui';
import { 
  CheckCircle,
  Star,
  Package,
  Users,
  CreditCard,
  Calendar,
  DollarSign
} from 'lucide-react';
import { 
  BILLING_CYCLES,
  calculateDiscountedPrice,
  getBillingCycleDiscount,
  formatBillingCycle
} from '@rentalshop/constants';
import type { Plan, BillingCycle } from '@rentalshop/types';

interface PlanSelectionProps {
  plans: Plan[];
  selectedPlanId?: number;
  selectedBillingCycle?: BillingCycle;
  onPlanSelect: (planId: number, billingCycle: BillingCycle) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const PlanSelection: React.FC<PlanSelectionProps> = ({
  plans,
  selectedPlanId,
  selectedBillingCycle = 'monthly',
  onPlanSelect,
  loading = false,
  disabled = false
}) => {
  const [selectedPlan, setSelectedPlan] = useState<number | undefined>(selectedPlanId);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(selectedBillingCycle);

  useEffect(() => {
    if (selectedPlanId) {
      setSelectedPlan(selectedPlanId);
    }
  }, [selectedPlanId]);

  useEffect(() => {
    if (selectedBillingCycle) {
      setSelectedCycle(selectedBillingCycle);
    }
  }, [selectedBillingCycle]);

  const handlePlanSelect = (planId: number) => {
    setSelectedPlan(planId);
    onPlanSelect(planId, selectedCycle);
  };

  const handleBillingCycleSelect = (cycle: BillingCycle) => {
    setSelectedCycle(cycle);
    if (selectedPlan) {
      onPlanSelect(selectedPlan, cycle);
    }
  };

  const formatCurrency = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  const getLimitText = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toString();
  };

  const getPlanCardVariant = (plan: Plan) => {
    if (selectedPlan === plan.id) return 'default';
    if (plan.isPopular) return 'bordered';
    return 'bordered';
  };

  const getBillingCyclePrice = (plan: Plan, cycle: BillingCycle) => {
    const cycleOption = BILLING_CYCLES.find(option => option.value === cycle);
    if (!cycleOption) return plan.price;

    const totalPrice = plan.price * cycleOption.months;
    const discount = getBillingCycleDiscount(cycle);
    const discountAmount = totalPrice * (discount / 100);
    return totalPrice - discountAmount;
  };

  const getBillingCycleMonthlyPrice = (plan: Plan, cycle: BillingCycle) => {
    const totalPrice = getBillingCyclePrice(plan, cycle);
    const cycleOption = BILLING_CYCLES.find(option => option.value === cycle);
    return cycleOption ? totalPrice / cycleOption.months : plan.price;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-96 bg-bg-tertiary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Cycle Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Select Billing Cycle</h3>
          <p className="text-text-secondary">Choose how often you'd like to be billed</p>
        </div>
        
        <RadioGroup 
          value={selectedCycle} 
          onValueChange={handleBillingCycleSelect}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {BILLING_CYCLES.map((cycle) => (
            <div key={cycle.value}>
              <RadioGroupItem
                value={cycle.value}
                id={cycle.value}
                className="peer sr-only"
                disabled={disabled}
              />
              <Label
                htmlFor={cycle.value}
                className="flex flex-col items-center justify-between rounded-md border-2 border-border bg-bg-card p-4 hover:bg-bg-secondary cursor-pointer peer-data-[state=checked]:border-action-primary peer-data-[state=checked]:bg-action-primary/5 [&:has([data-state=checked])]:border-action-primary"
              >
                <div className="text-center">
                  <div className="font-medium text-text-primary">{cycle.label}</div>
                  <div className="text-sm text-text-secondary">{cycle.description}</div>
                  {getBillingCycleDiscount(cycle.value) > 0 && (
                    <Badge variant="default" className="mt-2">
                      {getBillingCycleDiscount(cycle.value)}% OFF
                    </Badge>
                  )}
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Plan Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Select Your Plan</h3>
          <p className="text-text-secondary">Choose the plan that best fits your business needs</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedPlan === plan.id ? 'ring-2 ring-action-primary' : ''
              } ${plan.isPopular ? 'ring-2 ring-action-primary' : ''}`}
              onClick={() => !disabled && handlePlanSelect(plan.id)}
            >
              <CardHeader>
                <div className="text-center">
                  {plan.isPopular && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-action-primary text-white mb-3">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </div>
                  )}
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-text-secondary text-sm mt-2">{plan.description}</p>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Pricing */}
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-text-primary">
                    {formatCurrency(getBillingCyclePrice(plan, selectedCycle), plan.currency)}
                  </div>
                  <div className="text-lg text-text-secondary">
                    per {formatBillingCycle(selectedCycle).toLowerCase()}
                  </div>
                  <div className="text-sm text-text-tertiary mt-1">
                    {formatCurrency(getBillingCycleMonthlyPrice(plan, selectedCycle), plan.currency)}/month
                  </div>
                  {getBillingCycleDiscount(selectedCycle) > 0 && (
                    <div className="text-sm text-action-success mt-1">
                      {getBillingCycleDiscount(selectedCycle)}% discount applied
                    </div>
                  )}
                  {plan.trialDays > 0 && (
                    <div className="text-sm text-action-primary mt-1">
                      {plan.trialDays}-day free trial
                    </div>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Outlets
                    </span>
                    <span className="font-medium">{getLimitText(plan.limits.outlets)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Users
                    </span>
                    <span className="font-medium">{getLimitText(plan.limits.users)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Products
                    </span>
                    <span className="font-medium">{getLimitText(plan.limits.products)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Customers
                    </span>
                    <span className="font-medium">{getLimitText(plan.limits.customers)}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {plan.features.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-action-success flex-shrink-0" />
                      <span className="text-text-secondary">{feature}</span>
                    </div>
                  ))}
                  {plan.features.length > 4 && (
                    <div className="text-sm text-text-tertiary">
                      +{plan.features.length - 4} more features
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                <div className="text-center">
                  {selectedPlan === plan.id ? (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-action-success text-white">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Selected
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={disabled}
                    >
                      Select Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
