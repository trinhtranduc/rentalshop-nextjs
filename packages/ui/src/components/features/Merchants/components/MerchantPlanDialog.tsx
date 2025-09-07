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
import type { Plan, PlanVariant } from '@rentalshop/types';

interface MerchantPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (planData: {
    planId: number;
    planVariantId?: number;
    reason?: string;
    effectiveDate?: string;
    notifyMerchant?: boolean;
  }) => Promise<void>;
  merchant: {
    id: number;
    name: string;
    email: string;
    currentPlan?: {
      id: number;
      name: string;
      price: number;
      currency: string;
    } | null;
    subscriptionStatus: string;
  };
  plans: Plan[];
  planVariants: PlanVariant[];
  loading?: boolean;
}

export function MerchantPlanDialog({
  isOpen,
  onClose,
  onConfirm,
  merchant,
  plans,
  planVariants,
  loading = false
}: MerchantPlanDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notifyMerchant, setNotifyMerchant] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedPlanId(null);
      setSelectedVariantId(null);
      setReason('');
      setEffectiveDate(new Date().toISOString().slice(0, 16)); // Default to now
      setEndDate('');
      setNotifyMerchant(true);
    }
  }, [isOpen]);

  // Calculate derived values
  const selectedPlan = plans.find(plan => plan.id === selectedPlanId);
  const availableVariants = planVariants.filter(variant => variant.planId === selectedPlanId && variant.isActive);
  const selectedVariant = availableVariants.find(variant => variant.id === selectedVariantId);

  // Reset variant when plan changes
  useEffect(() => {
    setSelectedVariantId(null);
  }, [selectedPlanId]);

  // Calculate end date when effective date or duration changes
  useEffect(() => {
    if (effectiveDate && selectedVariant) {
      const startDate = new Date(effectiveDate);
      const endDate = new Date(startDate.getTime() + (selectedVariant.duration * 30 * 24 * 60 * 60 * 1000));
      setEndDate(endDate.toISOString().slice(0, 16));
    } else if (effectiveDate && selectedPlan && !selectedVariant) {
      // Default to 1 month if no variant selected
      const startDate = new Date(effectiveDate);
      const endDate = new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      setEndDate(endDate.toISOString().slice(0, 16));
    } else {
      setEndDate('');
    }
  }, [effectiveDate, selectedVariant, selectedPlan]);
  
  // Calculate total price
  const monthlyPrice = selectedVariant ? selectedVariant.price : (selectedPlan?.basePrice || 0);
  const duration = selectedVariant ? selectedVariant.duration : 1;
  const totalPrice = monthlyPrice * duration;
  
  // Calculate savings
  const basePrice = selectedPlan?.basePrice || 0;
  const totalBasePrice = basePrice * duration;
  const totalSavings = totalBasePrice - totalPrice;
  
  const currency = selectedPlan?.currency || 'USD';


  const handleSubmit = async () => {
    if (!selectedPlanId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        planId: selectedPlanId,
        planVariantId: selectedVariantId || undefined,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Change Merchant Plan
          </DialogTitle>
          <DialogDescription>
            Update the subscription plan for <strong>{merchant.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Plan Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">
                    Current Plan
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {merchant.currentPlan ? (
                      <>
                        <span className="font-semibold text-lg">
                          {merchant.currentPlan.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatPrice(merchant.currentPlan.price, merchant.currentPlan.currency)}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">No plan assigned</span>
                    )}
                  </div>
                </div>
                <StatusBadge 
                  status={getStatusColor(merchant.subscriptionStatus)} 
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
                          <span className="text-sm text-gray-500">
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

          {/* Plan Variant Selection */}
          {selectedPlan && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="variant">Select Duration</Label>
              <Select
                value={selectedVariantId?.toString() || ''}
                onValueChange={(value) => setSelectedVariantId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose duration..." />
                </SelectTrigger>
                <SelectContent>
                  {availableVariants.length > 0 ? (
                    availableVariants
                      .sort((a, b) => a.duration - b.duration)
                      .map((variant) => (
                        <SelectItem key={variant.id} value={variant.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{variant.name}</span>
                            <div className="flex items-center gap-2 ml-4">
                              <span className="text-sm text-gray-500">
                                {formatPrice(variant.price, selectedPlan.currency)}
                              </span>
                              {variant.discount > 0 && (
                                <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                                  {variant.discount}% off
                                </Badge>
                              )}
                              {variant.isPopular && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                  Popular
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="no-variants" disabled>
                      <span className="text-gray-500">No variants available for this plan</span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {availableVariants.length > 0 
                  ? `Choose the billing duration for this plan (${availableVariants.length} options available)`
                  : "This plan doesn't have duration variants"
                }
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
                  {selectedVariant && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Duration:</span>
                      <span className="font-medium">{selectedVariant.name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Monthly Price:</span>
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
                      {selectedVariant 
                        ? `Billed every ${selectedVariant.duration} month${selectedVariant.duration > 1 ? 's' : ''}`
                        : 'Billed monthly'
                      }
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
                      {selectedPlan.name}
                      {selectedVariant && ` - ${selectedVariant.name}`}
                    </h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {selectedVariant 
                          ? formatPrice(selectedVariant.price, selectedPlan.currency)
                          : formatPrice(selectedPlan.basePrice, selectedPlan.currency)
                        }
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedVariant 
                          ? `for ${selectedVariant.duration} month${selectedVariant.duration > 1 ? 's' : ''}`
                          : 'per month'
                        }
                      </div>
                      {selectedVariant && selectedVariant.discount > 0 && (
                        <div className="text-xs text-green-600 font-medium">
                          Save {formatPrice(selectedVariant.savings, selectedPlan.currency)} ({selectedVariant.discount}% off)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span>Outlets: {selectedPlan.maxOutlets === -1 ? 'Unlimited' : selectedPlan.maxOutlets}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>Users: {selectedPlan.maxUsers === -1 ? 'Unlimited' : selectedPlan.maxUsers}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span>Products: {selectedPlan.maxProducts === -1 ? 'Unlimited' : selectedPlan.maxProducts}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>Customers: {selectedPlan.maxCustomers === -1 ? 'Unlimited' : selectedPlan.maxCustomers}</span>
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
            <p className="text-xs text-gray-500">
              When should this plan change take effect?
            </p>
          </div>

          {/* End Date */}
          {endDate && (
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <p className="text-xs text-gray-500">
                {selectedVariant 
                  ? `Automatically calculated based on ${selectedVariant.duration} month duration`
                  : 'Automatically calculated based on 1 month duration'
                }
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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MerchantPlanDialog;
