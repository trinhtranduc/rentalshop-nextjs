// ============================================================================
// PLAN SELECTION MODAL - For expired subscriptions
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator
} from '@rentalshop/ui';
import { 
  Check, 
  CreditCard, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  Clock,
  Shield,
  Zap
} from 'lucide-react';
import { Plan, BillingCycle } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planId: number, billingCycle: BillingCycle) => void;
  plans: Plan[];
  currentPlan?: Plan;
  loading?: boolean;
}

export interface BillingCycleOption {
  value: BillingCycle;
  label: string;
  months: number;
  discount: number;
  description: string;
}

// ============================================================================
// BILLING CYCLE OPTIONS
// ============================================================================

const BILLING_CYCLES: BillingCycleOption[] = [
  {
    value: 'monthly',
    label: 'Monthly',
    months: 1,
    discount: 0,
    description: 'Pay monthly, cancel anytime'
  },
  {
    value: 'quarterly',
    label: 'Quarterly',
    months: 3,
    discount: 10,
    description: 'Save 10% with quarterly billing'
  },
  {
    value: 'semi_annual',
    label: 'Semi-Annual',
    months: 6,
    discount: 15,
    description: 'Save 15% with semi-annual billing'
  },
  {
    value: 'annual',
    label: 'Annual',
    months: 12,
    discount: 25,
    description: 'Save 25% with annual billing'
  }
];

// ============================================================================
// PAYMENT METHODS
// ============================================================================

const PAYMENT_METHODS = [
  { value: 'STRIPE', label: 'Credit Card (Stripe)', icon: CreditCard },
  { value: 'PAYPAL', label: 'PayPal', icon: CreditCard },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: CreditCard },
  { value: 'MANUAL', label: 'Manual Payment', icon: CreditCard }
];

// ============================================================================
// COMPONENT
// ============================================================================

export const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
  plans,
  currentPlan,
  loading = false
}) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('STRIPE');
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);

  // Calculate price when plan or billing cycle changes
  useEffect(() => {
    if (selectedPlan) {
      const billingCycle = BILLING_CYCLES.find(bc => bc.value === selectedBillingCycle);
      if (billingCycle) {
        const basePrice = selectedPlan.price;
        const discount = billingCycle.discount / 100;
        const discountedPrice = basePrice * (1 - discount);
        const totalPrice = discountedPrice * billingCycle.months;
        setCalculatedPrice(Math.round(totalPrice * 100) / 100);
      }
    }
  }, [selectedPlan, selectedBillingCycle]);

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  const handleBillingCycleChange = (value: string) => {
    setSelectedBillingCycle(value as BillingCycle);
  };

  const handlePaymentMethodChange = (value: string) => {
    setSelectedPaymentMethod(value);
  };

  const handleConfirm = () => {
    if (selectedPlan) {
      onSelectPlan(selectedPlan.id, selectedBillingCycle);
    }
  };

  const getFeatureIcon = (feature: string) => {
    if (feature.toLowerCase().includes('unlimited')) return Zap;
    if (feature.toLowerCase().includes('security') || feature.toLowerCase().includes('secure')) return Shield;
    if (feature.toLowerCase().includes('support')) return Shield;
    return Check;
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const getBillingCycleInfo = () => {
    return BILLING_CYCLES.find(bc => bc.value === selectedBillingCycle);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Subscription Expired - Select a Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          {currentPlan && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-orange-700">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Current Plan: {currentPlan.name}</span>
                  <Badge variant="destructive">Expired</Badge>
                </div>
                <p className="text-sm text-orange-600 mt-1">
                  Your subscription has expired. Please select a new plan to continue using the service.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Plan Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose Your Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPlan?.id === plan.id 
                      ? 'ring-2 ring-blue-500 border-blue-500' 
                      : 'hover:border-gray-300'
                  } ${plan.isPopular ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => handlePlanSelect(plan)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {plan.isPopular && (
                        <Badge className="bg-blue-500">Most Popular</Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatPrice(plan.price, plan.currency)}
                      <span className="text-sm font-normal text-gray-500">
                        /{plan.billingCycle}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features || []).map((feature: string, index: number) => {
                        const Icon = getFeatureIcon(feature);
                        return (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Icon className="h-4 w-4 text-green-500" />
                            <span>{feature}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Billing Cycle Selection */}
          {selectedPlan && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choose Billing Cycle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {BILLING_CYCLES.map((cycle) => (
                  <Card 
                    key={cycle.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedBillingCycle === cycle.value 
                        ? 'ring-2 ring-blue-500 border-blue-500' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => handleBillingCycleChange(cycle.value)}
                  >
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <h4 className="font-semibold">{cycle.label}</h4>
                        {cycle.discount > 0 && (
                          <Badge className="mt-1 bg-green-500">
                            Save {cycle.discount}%
                          </Badge>
                        )}
                        <p className="text-xs text-gray-600 mt-2">
                          {cycle.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          {selectedPlan && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Method</h3>
              <Select value={selectedPaymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    return (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {method.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price Summary */}
          {selectedPlan && (
            <Card className="bg-gray-50">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Plan:</span>
                    <span>{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Billing Cycle:</span>
                    <span>{getBillingCycleInfo()?.label}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Base Price:</span>
                    <span>{formatPrice(selectedPlan.price, selectedPlan.currency)}</span>
                  </div>
                  {getBillingCycleInfo()?.discount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span className="font-medium">Discount ({getBillingCycleInfo()?.discount}%):</span>
                      <span>-{formatPrice(selectedPlan.price * getBillingCycleInfo()!.discount / 100, selectedPlan.currency)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600">
                      {formatPrice(calculatedPrice, selectedPlan.currency)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectedPlan || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Processing...' : 'Continue with Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
