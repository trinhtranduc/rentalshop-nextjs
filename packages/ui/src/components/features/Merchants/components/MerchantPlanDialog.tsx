"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Textarea,
  Input,
  Card,
  CardContent,
  Badge,
  StatusBadge
} from '../../../ui';
import { Calendar, CreditCard, Users, Package, Building2 } from 'lucide-react';
import type { Plan } from '@rentalshop/types';
import type { SubscriptionStatus } from '@rentalshop/constants';

interface MerchantPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (planData: {
    planId: number;
    billingCycle?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
    reason?: string;
    effectiveDate?: string;
    notifyMerchant?: boolean;
  }) => Promise<void>;
  merchant: {
    id: number;
    name: string;
    email: string;
    subscription?: {
      status: SubscriptionStatus; // ✅ Type safe with enum
      plan?: {
        id: number;
        name: string;
        basePrice: number;
        currency: string;
      };
    } | null;
    subscriptionStatus: SubscriptionStatus; // ✅ Type safe with enum
  };
  plans: Plan[];
  loading?: boolean;
}

export function MerchantPlanDialog({
  isOpen,
  onClose,
  onConfirm,
  merchant,
  plans,
  loading = false
}: MerchantPlanDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'quarterly' | 'semi_annual' | 'annual'>('monthly');
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notifyMerchant, setNotifyMerchant] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedPlanId(null);
      setSelectedBillingCycle('monthly');
      setReason('');
      setEffectiveDate(new Date().toISOString().slice(0, 16)); // Default to now
      setEndDate('');
      setNotifyMerchant(true);
    }
  }, [isOpen]);

  // Calculate derived values
  const selectedPlan = plans.find(plan => plan.id === selectedPlanId);
  const selectedPricing = selectedPlan?.pricing[selectedBillingCycle];

  // Calculate end date when effective date or billing cycle changes
  useEffect(() => {
    if (effectiveDate && selectedPlan) {
      const startDate = new Date(effectiveDate);
      const months = selectedBillingCycle === 'monthly' ? 1 : 
                    selectedBillingCycle === 'quarterly' ? 3 :
                    selectedBillingCycle === 'semi_annual' ? 6 : 12;
      const endDate = new Date(startDate.getTime() + (months * 30 * 24 * 60 * 60 * 1000));
      setEndDate(endDate.toISOString().slice(0, 16));
    } else {
      setEndDate('');
    }
  }, [effectiveDate, selectedBillingCycle, selectedPlan]);
  
  // Calculate pricing
  const monthlyPrice = selectedPricing?.price || selectedPlan?.basePrice || 0;
  const duration = selectedBillingCycle === 'monthly' ? 1 : 
                  selectedBillingCycle === 'quarterly' ? 3 : 12;
  const totalPrice = selectedPricing?.price || (selectedPlan?.basePrice || 0) * duration;
  
  // Calculate savings
  const basePrice = selectedPlan?.basePrice || 0;
  const totalBasePrice = basePrice * duration;
  const totalSavings = selectedPricing?.savings || (totalBasePrice - totalPrice);
  
  const currency = selectedPlan?.currency || 'USD';


  const handleSubmit = async () => {
    if (!selectedPlanId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        planId: selectedPlanId,
        billingCycle: selectedBillingCycle,
        reason: reason.trim() || undefined,
        effectiveDate: effectiveDate || undefined,
        notifyMerchant
      });
      onClose();
    } catch (error) {
      console.error('Error changing plan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'expired': return 'danger';
      case 'cancelled': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Change Merchant Plan
          </DialogTitle>
          <DialogDescription className="mt-1">
            Update the subscription plan for <strong>{merchant.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto">
          <div className="space-y-6">
          {/* Current Plan Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Current Plan
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {merchant.subscription?.plan ? (
                      <>
                        <span className="font-semibold text-lg">
                          {merchant.subscription.plan.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatPrice(merchant.subscription.plan.basePrice, merchant.subscription.plan.currency)}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">No plan assigned</span>
                    )}
                  </div>
                </div>
                <StatusBadge 
                  status={merchant.subscription?.status} 
                  size="sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="plan">Select New Plan</Label>
            <Select
              value={selectedPlanId?.toString() || ''}
              onValueChange={(value) => setSelectedPlanId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a plan..." />
              </SelectTrigger>
              <SelectContent>
                {plans
                  .filter(plan => plan.isActive)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{plan.name}</span>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-sm text-muted-foreground">
                            {formatPrice(plan.basePrice, plan.currency)}
                          </span>
                          {plan.isPopular && (
                            <Badge variant="secondary" className="text-xs">
                              Popular
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Cycle Selection */}
          {selectedPlan && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="billingCycle">Select Billing Cycle</Label>
              <Select
                value={selectedBillingCycle}
                onValueChange={(value) => setSelectedBillingCycle(value as 'monthly' | 'quarterly' | 'semi_annual' | 'annual')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose billing cycle..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">Monthly</span>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-sm text-gray-500">
                          {formatPrice(selectedPlan.pricing.monthly.price, selectedPlan.currency)}
                        </span>
                        {selectedPlan.pricing.monthly.discount > 0 && (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                            {selectedPlan.pricing.monthly.discount}% off
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="quarterly">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">Quarterly</span>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-sm text-gray-500">
                          {formatPrice(selectedPlan.pricing.quarterly.price, selectedPlan.currency)}
                        </span>
                        {selectedPlan.pricing.quarterly.discount > 0 && (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                            {selectedPlan.pricing.quarterly.discount}% off
                          </Badge>
                        )}
                        {selectedPlan.pricing.quarterly.savings > 0 && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                            Save {formatPrice(selectedPlan.pricing.quarterly.savings, selectedPlan.currency)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="semi_annual">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">Semi-Annual</span>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-sm text-gray-500">
                          {formatPrice(selectedPlan.pricing.semi_annual.price, selectedPlan.currency)}
                        </span>
                        {selectedPlan.pricing.semi_annual.discount > 0 && (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                            {selectedPlan.pricing.semi_annual.discount}% off
                          </Badge>
                        )}
                        {selectedPlan.pricing.semi_annual.savings > 0 && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                            Save {formatPrice(selectedPlan.pricing.semi_annual.savings, selectedPlan.currency)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="annual">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">Annual</span>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-sm text-gray-500">
                          {formatPrice(selectedPlan.pricing.annual.price, selectedPlan.currency)}
                        </span>
                        {selectedPlan.pricing.annual.discount > 0 && (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                            {selectedPlan.pricing.annual.discount}% off
                          </Badge>
                        )}
                        {selectedPlan.pricing.annual.savings > 0 && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                            Save {formatPrice(selectedPlan.pricing.annual.savings, selectedPlan.currency)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the billing frequency for this plan. Longer cycles offer better savings.
              </p>
            </div>
          )}

          {/* Total Summary */}
          {selectedPlan && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-lg text-blue-900">Plan Summary</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Plan:</span>
                    <span className="font-medium">{selectedPlan.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Billing Cycle:</span>
                    <span className="font-medium capitalize">{selectedBillingCycle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Price per {selectedBillingCycle === 'monthly' ? 'month' : selectedBillingCycle === 'quarterly' ? 'quarter' : 'year'}:</span>
                    <span className="font-medium">{formatPrice(monthlyPrice, currency)}</span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex items-center justify-between text-green-600">
                      <span className="text-sm">You Save:</span>
                      <span className="font-medium">{formatPrice(totalSavings, currency)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between text-lg font-bold text-blue-900">
                      <span>Total ({duration} month{duration > 1 ? 's' : ''}):</span>
                      <span>{formatPrice(totalPrice, currency)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Billed {selectedBillingCycle === 'monthly' ? 'monthly' : selectedBillingCycle === 'quarterly' ? 'every 3 months' : 'annually'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Plan Details */}
          {selectedPlan && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg">
                      {selectedPlan.name} - {selectedBillingCycle.charAt(0).toUpperCase() + selectedBillingCycle.slice(1)}
                    </h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {formatPrice(monthlyPrice, selectedPlan.currency)}
                      </div>
                      <div className="text-sm text-gray-500">
                        per {selectedBillingCycle === 'monthly' ? 'month' : selectedBillingCycle === 'quarterly' ? 'quarter' : 'year'}
                      </div>
                      {selectedPricing && selectedPricing.discount > 0 && (
                        <div className="text-xs text-green-600 font-medium">
                          Save {formatPrice(selectedPricing.savings, selectedPlan.currency)} ({selectedPricing.discount}% off)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span>Outlets: {selectedPlan.limits.outlets === -1 ? 'Unlimited' : selectedPlan.limits.outlets}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>Users: {selectedPlan.limits.users === -1 ? 'Unlimited' : selectedPlan.limits.users}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span>Products: {selectedPlan.limits.products === -1 ? 'Unlimited' : selectedPlan.limits.products}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>Customers: {selectedPlan.limits.customers === -1 ? 'Unlimited' : selectedPlan.limits.customers}</span>
                    </div>
                  </div>

                  {selectedPlan.features && selectedPlan.features.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Features:
                      </h5>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {selectedPlan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Effective Date */}
          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Effective Date</Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                id="effectiveDate"
                type="datetime-local"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              When should this plan change take effect?
            </p>
          </div>

          {/* End Date */}
          {endDate && (
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-text-tertiary" />
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  disabled
                  className="bg-bg-secondary"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically calculated based on {selectedBillingCycle === 'monthly' ? '1 month' : selectedBillingCycle === 'quarterly' ? '3 months' : '12 months'} duration
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for plan change..."
              rows={3}
            />
          </div>

          {/* Notify Merchant */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notifyMerchant"
              checked={notifyMerchant}
              onChange={(e) => setNotifyMerchant(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="notifyMerchant" className="text-sm">
              Notify merchant about this plan change
            </Label>
          </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedPlanId || isSubmitting}
            >
              {isSubmitting ? 'Changing Plan...' : 'Change Plan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MerchantPlanDialog;
