'use client'

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Label,
  Card
} from '@rentalshop/ui/base';
import { formatDate, formatCurrency } from '@rentalshop/utils';
import { Check, CreditCard, Building2, Sparkles } from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  limits?: any;
  features?: string[];
  isPopular?: boolean;
}

interface UpgradeTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: {
    id: number;
    merchantName: string;
  };
  plans: Plan[];
  onUpgrade: (planId: number, billingCycle: string, paymentMethod: string) => Promise<void>;
  loading?: boolean;
}

export function UpgradeTrialModal({
  isOpen,
  onClose,
  subscription,
  plans,
  onUpgrade,
  loading = false
}: UpgradeTrialModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'month' | 'quarter' | 'year'>('month');
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'TRANSFER'>('STRIPE');

  // Select first non-trial plan by default
  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      const firstPaidPlan = plans.find(p => p.name !== 'Trial' && p.basePrice > 0);
      if (firstPaidPlan) {
        setSelectedPlan(firstPaidPlan);
      }
    }
  }, [plans, selectedPlan]);

  const calculatePrice = (basePrice: number, cycle: string) => {
    switch (cycle) {
      case 'quarter':
        return basePrice * 3 * 0.9; // 10% discount
      case 'year':
        return basePrice * 12 * 0.8; // 20% discount
      default:
        return basePrice;
    }
  };

  const getSavings = (basePrice: number, cycle: string) => {
    const fullPrice = cycle === 'quarter' ? basePrice * 3 : cycle === 'year' ? basePrice * 12 : basePrice;
    const discountedPrice = calculatePrice(basePrice, cycle);
    return fullPrice - discountedPrice;
  };

  const getNextBillingDate = () => {
    const now = new Date();
    const next = new Date(now);
    switch (billingCycle) {
      case 'quarter':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'year':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }
    return next;
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;

    try {
      await onUpgrade(selectedPlan.id, billingCycle, paymentMethod);
      onClose();
    } catch (error) {
      console.error('Upgrade failed:', error);
    }
  };

  const paidPlans = plans.filter(p => p.name !== 'Trial' && p.basePrice > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📈 Upgrade Subscription</DialogTitle>
          <DialogDescription>
            Upgrade from Trial to a paid plan to unlock all features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-900">Currently on Trial</p>
                <p className="text-sm text-yellow-700">Upgrade now to continue using {subscription.merchantName}</p>
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Choose a Plan *</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paidPlans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    selectedPlan?.id === plan.id 
                      ? 'border-blue-500 bg-blue-50 shadow-lg' 
                      : 'hover:border-gray-400'
                  } ${plan.isPopular ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <div className="p-4 space-y-3">
                    {plan.isPopular && (
                      <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded inline-block">
                        POPULAR
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(plan.basePrice, 'USD')}
                      <span className="text-sm text-gray-600 font-normal">/month</span>
                    </div>
                    {plan.limits && (
                      <ul className="text-sm space-y-1">
                        <li>• {plan.limits.outlets || 0} outlets</li>
                        <li>• {plan.limits.users || 0} users</li>
                        <li>• {plan.limits.products === 999999 ? 'Unlimited' : plan.limits.products} products</li>
                      </ul>
                    )}
                    {selectedPlan?.id === plan.id && (
                      <div className="flex items-center gap-1 text-blue-700 font-medium">
                        <Check className="w-4 h-4" />
                        Selected
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Billing Cycle */}
          {selectedPlan && (
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Billing Cycle *</Label>
              <div className="space-y-2">
                <div 
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    billingCycle === 'month' ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setBillingCycle('month')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={billingCycle === 'month'}
                      onChange={() => setBillingCycle('month')}
                      className="cursor-pointer"
                    />
                    <div>
                      <p className="font-medium">Monthly</p>
                      <p className="text-sm text-gray-600">{formatCurrency(selectedPlan.basePrice, 'USD')}/month</p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    billingCycle === 'quarter' ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setBillingCycle('quarter')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={billingCycle === 'quarter'}
                      onChange={() => setBillingCycle('quarter')}
                      className="cursor-pointer"
                    />
                    <div>
                      <p className="font-medium">Quarterly</p>
                      <p className="text-sm text-gray-600">{formatCurrency(calculatePrice(selectedPlan.basePrice, 'quarter'), 'USD')}/quarter</p>
                    </div>
                  </div>
                  <div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                    Save 10%
                  </div>
                </div>

                <div 
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    billingCycle === 'year' ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setBillingCycle('year')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={billingCycle === 'year'}
                      onChange={() => setBillingCycle('year')}
                      className="cursor-pointer"
                    />
                    <div>
                      <p className="font-medium">Yearly</p>
                      <p className="text-sm text-gray-600">{formatCurrency(calculatePrice(selectedPlan.basePrice, 'year'), 'USD')}/year</p>
                    </div>
                  </div>
                  <div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                    Save 20%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method */}
          {selectedPlan && (
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Payment Method *</Label>
              <div className="space-y-2">
                <div 
                  className={`flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                    paymentMethod === 'STRIPE' ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setPaymentMethod('STRIPE')}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === 'STRIPE'}
                    onChange={() => setPaymentMethod('STRIPE')}
                    className="cursor-pointer"
                  />
                  <Label className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="w-4 h-4" />
                    <span>Stripe (Card Payment)</span>
                  </Label>
                </div>
                <div 
                  className={`flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                    paymentMethod === 'TRANSFER' ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setPaymentMethod('TRANSFER')}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === 'TRANSFER'}
                    onChange={() => setPaymentMethod('TRANSFER')}
                    className="cursor-pointer"
                  />
                  <Label className="flex items-center gap-2 cursor-pointer flex-1">
                    <Building2 className="w-4 h-4" />
                    <span>Bank Transfer</span>
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Payment Summary */}
          {selectedPlan && (
            <Card className="bg-gray-50 border-gray-200">
              <div className="p-4 space-y-2">
                <h3 className="font-semibold">Payment Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>First payment:</span>
                    <span className="font-semibold">
                      {formatCurrency(calculatePrice(selectedPlan.basePrice, billingCycle), 'USD')}
                      {billingCycle === 'quarter' && ' (3 months)'}
                      {billingCycle === 'year' && ' (12 months)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next billing:</span>
                    <span>{formatDate(getNextBillingDate(), 'MMM dd, yyyy')}</span>
                  </div>
                  {getSavings(selectedPlan.basePrice, billingCycle) > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>You save:</span>
                      <span>{formatCurrency(getSavings(selectedPlan.basePrice, billingCycle), 'USD')}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedPlan}>
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Processing...
              </>
            ) : (
              <>🚀 Upgrade Now</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

