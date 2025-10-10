import React from 'react';
import { X, Check, Star } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { formatCurrency } from '@rentalshop/utils';

// Local type definitions to avoid import issues
interface BillingCycle {
  value: string;
  label: string;
  months: number;
  discount: number;
}

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: string;
  billingCycleMonths: number;
  features: string[];
  limits: {
    outlets: number;
    users: number;
    products: number;
  };
  status: 'active' | 'inactive';
  isPopular?: boolean;
  trialDays: number;
}

interface PlanDetailModalProps {
  plan: Plan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: (planId: number, billingCycle: string) => void;
}

// Billing cycle options
const BILLING_CYCLES: BillingCycle[] = [
  { value: 'monthly', label: 'Monthly', months: 1, discount: 0 },
  { value: 'quarterly', label: 'Quarterly', months: 3, discount: 5 },
  { value: 'semi_annual', label: 'Semi-Annual', months: 6, discount: 10 },
  { value: 'annual', label: 'Annual', months: 12, discount: 20 }
];

// Helper functions
const getBillingCycleDiscount = (cycle: string): number => {
  const billingCycle = BILLING_CYCLES.find(bc => bc.value === cycle);
  return billingCycle?.discount || 0;
};

const calculateDiscountedPrice = (basePrice: number, cycle: string): number => {
  const discount = getBillingCycleDiscount(cycle);
  const billingCycle = BILLING_CYCLES.find(bc => bc.value === cycle);
  const months = billingCycle?.months || 1;
  
  const totalBeforeDiscount = basePrice * months;
  const discountAmount = (totalBeforeDiscount * discount) / 100;
  return totalBeforeDiscount - discountAmount;
};

const calculateSavings = (basePrice: number, cycle: string): number => {
  const discount = getBillingCycleDiscount(cycle);
  const billingCycle = BILLING_CYCLES.find(bc => bc.value === cycle);
  const months = billingCycle?.months || 1;
  
  const totalBeforeDiscount = basePrice * months;
  return (totalBeforeDiscount * discount) / 100;
};

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({
  plan,
  open,
  onOpenChange,
  onSubscribe
}) => {
  if (!plan) return null;

  const handleSubscribe = (billingCycle: string) => {
    onSubscribe(plan.id, billingCycle);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${open ? 'block' : 'hidden'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{plan.name} Plan</h2>
            {plan.isPopular && (
              <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <Star className="w-3 h-3 mr-1" />
                Popular
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Description */}
          <p className="text-gray-600 mb-6">{plan.description}</p>

          {/* Billing Cycle Options */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Choose Your Billing Cycle
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {BILLING_CYCLES.map((cycle) => {
                const discountedPrice = calculateDiscountedPrice(plan.price, cycle.value);
                const savings = calculateSavings(plan.price, cycle.value);
                const isSelected = plan.billingCycle === cycle.value;

                return (
                  <Card 
                    key={cycle.value}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSubscribe(cycle.value)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">
                          {cycle.label}
                        </CardTitle>
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(plan.price, plan.currency)}/month
                        </div>
                        
                        {cycle.discount > 0 && (
                          <div className="text-sm text-green-600 font-medium">
                            {cycle.discount}% discount
                          </div>
                        )}
                        
                        <div className="text-sm text-gray-600">
                          Total: {formatCurrency(discountedPrice, plan.currency)}
                        </div>
                        
                        {savings > 0 && (
                          <div className="text-xs text-green-600">
                            Save: {formatCurrency(savings, plan.currency)}
                          </div>
                        )}
                        
                        <Button 
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="w-full mt-3"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleSubscribe(cycle.value);
                          }}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Plan Features */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Limits</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {plan.limits.outlets === -1 ? 'Unlimited' : plan.limits.outlets} outlets
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {plan.limits.users === -1 ? 'Unlimited' : plan.limits.users} users
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {plan.limits.products === -1 ? 'Unlimited' : plan.limits.products} products
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Features</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Trial Information */}
          {plan.trialDays > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-blue-900">
                  {plan.trialDays}-day free trial included
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Start your {plan.trialDays}-day free trial today. No credit card required.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSubscribe(plan.billingCycle)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Subscribe to {plan.name} Plan
          </Button>
        </div>
      </div>
    </div>
  );
};
