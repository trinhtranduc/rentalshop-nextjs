import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  StatusBadge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Textarea,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../../ui';
import { 
  CreditCard, 
  Clock, 
  ArrowRight,
  Pause,
  Play,
  Plus,
  X
} from 'lucide-react';
import { SubscriptionPeriodCard } from '../../Subscriptions/SubscriptionPeriodCard';
import { formatSubscriptionPeriod } from '@rentalshop/utils';
// Billing configuration (following Stripe's modern practices)
const BILLING_INTERVALS = [
  {
    id: 'month',
    name: 'Monthly',
    months: 1,
    discountPercentage: 0,
    description: 'No discount for monthly billing',
    isActive: true
  },
  {
    id: 'quarter',
    name: 'Quarterly',
    months: 3,
    discountPercentage: 5,
    description: '5% discount for quarterly billing',
    isActive: true
  },
  {
    id: 'semiAnnual',
    name: '6 Months',
    months: 6,
    discountPercentage: 10,
    description: '10% discount for 6-month billing',
    isActive: true
  },
  {
    id: 'year',
    name: 'Yearly',
    months: 12,
    discountPercentage: 20,
    description: '20% discount for yearly billing',
    isActive: true
  }
];

// Helper functions for billing
const getActiveBillingIntervals = () => BILLING_INTERVALS.filter(interval => interval.isActive);
const getDiscountPercentage = (intervalId: string) => {
  const interval = BILLING_INTERVALS.find(i => i.id === intervalId);
  return interval?.discountPercentage || 0;
};
const calculateDiscountedPrice = (basePrice: number, intervalId: string, duration: number = 1) => {
  const interval = BILLING_INTERVALS.find(i => i.id === intervalId);
  if (!interval) return basePrice * duration;
  
  const discount = interval.discountPercentage / 100;
  const discountedPrice = basePrice * (1 - discount);
  return discountedPrice * duration;
};
const formatBillingInterval = (intervalId: string) => {
  const interval = BILLING_INTERVALS.find(i => i.id === intervalId);
  if (!interval) return intervalId;
  
  const discount = interval.discountPercentage > 0 
    ? ` (${interval.discountPercentage}% discount)`
    : '';
  
  return `${interval.name}${discount}`;
};
import type { Plan, Subscription } from '@rentalshop/types';

interface MerchantPlanManagementProps {
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
  subscriptions?: Subscription[];
  plans?: Plan[];
  onPlanChange: (planData: {
    planId: number;
    planVariantId?: number;
    reason?: string;
    effectiveDate?: string;
    notifyMerchant?: boolean;
    billingInterval?: string;
    duration?: number;
    discount?: number;
    totalPrice?: number;
  }) => Promise<void>;
  onExtend?: (extendData: {
    subscription: Subscription;
    duration: number;
    billingInterval: string;
    discount: number;
    totalPrice: number;
  }) => Promise<void>;
  onCancel?: (subscription: Subscription, reason: string, cancelType: 'immediate' | 'end_of_period') => Promise<void>;
  onSuspend?: (subscription: Subscription, reason: string) => Promise<void>;
  onReactivate?: (subscription: Subscription) => Promise<void>;
  loading?: boolean;
}

export function MerchantPlanManagement({
  merchant,
  subscriptions = [],
  plans = [],
  onPlanChange,
  onExtend,
  onCancel,
  onSuspend,
  onReactivate,
  loading = false
}: MerchantPlanManagementProps) {
  // Debug: Log subscription status values
  console.log('🔍 MerchantPlanManagement Debug:', {
    merchantId: merchant.id,
    merchantName: merchant.name,
    subscriptionStatus: merchant.subscriptionStatus,
    currentSubscription: subscriptions[0],
    subscriptionStatusFromSubscription: subscriptions[0]?.status
  });

  // Normalize subscription status to lowercase for consistent comparison
  const normalizedStatus = merchant.subscriptionStatus?.toLowerCase() || 'unknown';
  const isActiveStatus = normalizedStatus === 'trial' || normalizedStatus === 'active';
  const isPausedStatus = normalizedStatus === 'paused' || normalizedStatus === 'cancelled' || normalizedStatus === 'expired';
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [extendDuration, setExtendDuration] = useState<string>('1');
  const [extendBillingInterval, setExtendBillingInterval] = useState<string>('month');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelType, setCancelType] = useState<'immediate' | 'end_of_period'>('end_of_period');
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Change plan form state
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [changeReason, setChangeReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [notifyMerchant, setNotifyMerchant] = useState(true);
  const [changeBillingInterval, setChangeBillingInterval] = useState<string>('month');
  const [changeDuration, setChangeDuration] = useState<string>('1');

  // Reset form when dialog opens
  const handleOpenChangeDialog = () => {
    setShowChangeDialog(true);
    // Reset form state to ensure clean state
    setSelectedPlanId('');
    setChangeReason('');
    setEffectiveDate('');
    setNotifyMerchant(true);
    setChangeBillingInterval('month');
    setChangeDuration('1');
  };

  // Ensure billing interval is always set when dialog opens
  useEffect(() => {
    if (showChangeDialog && !changeBillingInterval) {
      setChangeBillingInterval('month');
    }
  }, [showChangeDialog, changeBillingInterval]);

  const currentSubscription = subscriptions[0]; // Most recent subscription

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get billing intervals from configuration
  const billingIntervals = getActiveBillingIntervals();

  // Calculate extended price with discount using centralized function
  const calculateExtendedPrice = () => {
    if (!currentSubscription?.amount) return 0;
    return calculateDiscountedPrice(
      currentSubscription.amount,
      extendBillingInterval,
      parseInt(extendDuration)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'expired': return 'danger';
      case 'cancelled': return 'danger';
      case 'paused': return 'warning';
      case 'suspended': return 'warning';
      case 'disabled': return 'danger';
      default: return 'secondary';
    }
  };


  const handleExtend = async () => {
    if (!currentSubscription) return;

    setIsSubmitting(true);
    try {
      const extendData = {
        subscription: currentSubscription,
        duration: parseInt(extendDuration),
        billingInterval: extendBillingInterval,
        discount: getDiscountPercentage(extendBillingInterval),
        totalPrice: calculateExtendedPrice()
      };
      await onExtend?.(extendData);
      setShowExtendDialog(false);
      // Reset form
      setExtendDuration('1');
      setExtendBillingInterval('month');
    } catch (error) {
      console.error('Error extending subscription:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!currentSubscription || !cancelReason.trim()) return;

    setIsSubmitting(true);
    try {
      await onCancel?.(currentSubscription, cancelReason.trim(), cancelType);
      setShowCancelDialog(false);
      setCancelReason('');
      setCancelType('end_of_period');
    } catch (error) {
      console.error('Error canceling subscription:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlanId || !changeReason.trim()) return;

    console.log('🔍 Form submission started');
    console.log('🔍 Current state values:', {
      selectedPlanId,
      changeReason,
      changeBillingInterval,
      changeDuration,
      effectiveDate,
      notifyMerchant
    });

    setIsSubmitting(true);
    try {
      const selectedPlan = plans.find(p => p.id.toString() === selectedPlanId);
      const discount = getDiscountPercentage(changeBillingInterval);
      const duration = parseInt(changeDuration) || 1;
      
      const planChangeData = {
        planId: Number(selectedPlanId),
        reason: changeReason.trim(),
        effectiveDate: effectiveDate || new Date().toISOString(),
        notifyMerchant,
        billingInterval: changeBillingInterval,
        duration: duration,
        discount: discount,
        totalPrice: selectedPlan ? calculateDiscountedPrice(selectedPlan.basePrice, changeBillingInterval, duration) : 0
      };
      
      console.log('🔍 Plan change data being sent:', planChangeData);
      console.log('🔍 Billing interval value:', changeBillingInterval);
      console.log('🔍 Billing interval in data:', planChangeData.billingInterval);
      
      await onPlanChange?.(planChangeData);
      setShowChangeDialog(false);
      setSelectedPlanId('');
      setChangeReason('');
      setEffectiveDate('');
      setNotifyMerchant(true);
      setChangeBillingInterval('month');
      setChangeDuration('1');
    } catch (error) {
      console.error('Error changing plan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleSuspend = async () => {
    if (!currentSubscription || !suspendReason.trim()) return;

    setIsSubmitting(true);
    try {
      await onSuspend?.(currentSubscription, suspendReason.trim());
      setShowSuspendDialog(false);
      setSuspendReason('');
    } catch (error) {
      console.error('Error suspending subscription:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    if (!currentSubscription) return;

    setIsSubmitting(true);
    try {
      await onReactivate?.(currentSubscription);
    } catch (error) {
      console.error('Error reactivating subscription:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Plan Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(merchant.currentPlan || currentSubscription) ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {merchant.currentPlan?.name || currentSubscription?.plan?.name || 'No plan assigned'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {merchant.currentPlan ? 
                      formatPrice(merchant.currentPlan.price, merchant.currentPlan.currency) :
                      currentSubscription ? 
                        formatPrice(currentSubscription.amount, currentSubscription.currency) :
                        'No pricing available'
                    }
                  </p>
                </div>
                <StatusBadge 
                  status={getStatusColor(merchant.subscriptionStatus)} 
                  size="sm"
                />
              </div>

              {currentSubscription && (
                <SubscriptionPeriodCard
                  period={{
                    startDate: new Date((currentSubscription as any).startDate),
                    endDate: new Date((currentSubscription as any).endDate || new Date()),
                    duration: (currentSubscription as any).interval || 'month',
                    isActive: (currentSubscription as any).status === 'active',
                    daysRemaining: (currentSubscription as any).subscriptionPeriod?.daysRemaining || 0,
                    nextBillingDate: new Date((currentSubscription as any).nextBillingDate || new Date()),
                    isTrial: (currentSubscription as any).status === 'trial',
                  }}
                  planName={currentSubscription.plan?.name}
                  amount={currentSubscription.amount}
                  currency={currentSubscription.currency}
                  className="mt-4"
                />
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4">
                {/* Debug: Show current status and button visibility */}
                <div className="w-full text-xs text-gray-500 mb-2">
                  Debug: Original = "{merchant.subscriptionStatus}" | Normalized = "{normalizedStatus}" | 
                  Extend: {currentSubscription && isActiveStatus ? 'YES' : 'NO'} | 
                  Pause: {isActiveStatus ? 'YES' : 'NO'} | 
                  Resume: {isPausedStatus ? 'YES' : 'NO'} | 
                  Cancel: {isActiveStatus || isPausedStatus ? 'YES' : 'NO'}
                </div>
                
                {/* Change Plan - Always Available */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenChangeDialog}
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  Change Plan
                </Button>
                
                {/* Extend Plan */}
                {currentSubscription && isActiveStatus && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExtendDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Extend Plan
                  </Button>
                )}
                
                {/* Pause/Resume Plan */}
                {currentSubscription && (
                  <>
                    {isActiveStatus ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSuspendDialog(true)}
                        className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                      >
                        <Pause className="h-4 w-4" />
                        Pause Plan
                      </Button>
                    ) : (
                <Button
                  variant="outline"
                  size="sm"
                        onClick={handleReactivate}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 text-green-600 hover:text-green-700"
                      >
                        <Play className="h-4 w-4" />
                        Resume Plan
                </Button>
                    )}
                  </>
                )}
                
                {/* Cancel Plan (Permanent) */}
                {currentSubscription && (isActiveStatus || isPausedStatus) && (
                <Button
                  variant="outline"
                  size="sm"
                    onClick={() => setShowCancelDialog(true)}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                    Cancel Plan
                </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Subscription</h3>
              <p className="text-gray-500 mb-4">This merchant doesn't have an active subscription.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={handleOpenChangeDialog}>
                <CreditCard className="h-4 w-4 mr-2" />
                Create Subscription
              </Button>
                
                {/* Always show Change Plan button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenChangeDialog}
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  Change Plan
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Subscription History */}
      {subscriptions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Plan History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscriptions.slice(1).map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{(subscription as any).planName || 'Unknown Plan'}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate((subscription as any).startDate)} - {(subscription as any).endDate ? formatDate((subscription as any).endDate) : 'N/A'}
                    </p>
                    {(subscription as any).changeReason && (
                      <p className="text-xs text-gray-400 mt-1">
                        Reason: {(subscription as any).changeReason}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatPrice(subscription.amount, subscription.currency)}
                    </p>
                    <StatusBadge 
                      status={getStatusColor(subscription.status)} 
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Extend Plan Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-500" />
              Extend Plan
            </DialogTitle>
            <DialogDescription>
              Extend the current plan for {merchant.name}. Choose billing interval to get discounts on longer commitments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">

            {/* Extension Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="extendDuration">Duration</Label>
                <Input
                  id="extendDuration"
                  type="number"
                  min="1"
                  max="12"
                  value={extendDuration}
                  onChange={(e) => setExtendDuration(e.target.value)}
                  placeholder="1"
                />
              </div>

              <div>
                <Label htmlFor="extendBillingInterval">Billing Interval</Label>
                <Select value={extendBillingInterval} onValueChange={setExtendBillingInterval}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select interval..." />
                  </SelectTrigger>
                  <SelectContent>
                    {billingIntervals.map((interval: any) => (
                      <SelectItem key={interval.id} value={interval.id}>
                        {formatBillingInterval(interval.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Simple Extension Summary */}
            {currentSubscription?.amount && extendDuration && extendBillingInterval && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-blue-900">Plan Extension</p>
                    <p className="text-sm text-gray-600">
                      {merchant.currentPlan?.name || 'Current Plan'} • {formatBillingInterval(extendBillingInterval)} • {extendDuration} period(s)
                      {getDiscountPercentage(extendBillingInterval) > 0 && ` • ${getDiscountPercentage(extendBillingInterval)}% off`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">
                      {formatPrice(calculateExtendedPrice(), currentSubscription.currency)}
                    </p>
                    <p className="text-sm text-gray-500">
                      New end: {(() => {
                        const currentEndDate = (currentSubscription as any)?.endDate ? new Date((currentSubscription as any).endDate) : new Date();
                        const duration = parseInt(extendDuration) || 1;
                        const interval = extendBillingInterval;
                        const months = interval === 'month' ? 1 : interval === 'quarter' ? 3 : interval === 'semiAnnual' ? 6 : 12;
                        const newEndDate = new Date(currentEndDate);
                        newEndDate.setMonth(newEndDate.getMonth() + (months * duration));
                        return formatDate(newEndDate);
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <p className="text-sm text-blue-700 font-medium">
                  Extension will be added to the current plan period
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowExtendDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExtend}
              disabled={isSubmitting || !extendDuration || !extendBillingInterval}
            >
              {isSubmitting ? 'Extending...' : 'Extend Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-500" />
              Change Plan
            </DialogTitle>
            <DialogDescription>
              Change the subscription plan for {merchant.name}. This will update their billing and features.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <p className="text-sm text-blue-700 font-medium">
                  Plan changes take effect immediately with proration
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="planSelect">Select New Plan</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span>{plan.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            ${plan.basePrice}/{plan.currency}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input
                  id="effectiveDate"
                  type="datetime-local"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for immediate change
                </p>
              </div>
            </div>

            {/* Billing Interval Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="changeBillingInterval">Billing Interval</Label>
                <Select 
                  value={changeBillingInterval || 'month'} 
                  onValueChange={(value) => {
                    console.log('🔍 Setting billing interval to:', value);
                    setChangeBillingInterval(value);
                    console.log('🔍 Billing interval state updated to:', value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing interval..." />
                  </SelectTrigger>
                  <SelectContent>
                    {billingIntervals.map((interval: any) => (
                      <SelectItem key={interval.id} value={interval.id}>
                        {formatBillingInterval(interval.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose longer intervals for better discounts
                </p>
              </div>

              <div>
                <Label htmlFor="changeDuration">Duration (Optional)</Label>
                <Input
                  id="changeDuration"
                  type="number"
                  min="1"
                  max="12"
                  value={changeDuration}
                  onChange={(e) => setChangeDuration(e.target.value)}
                  placeholder="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of billing periods (default: 1)
                </p>
              </div>
            </div>

            {/* Simple Plan Change Summary */}
            {selectedPlanId && changeBillingInterval && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-blue-900">Plan Change</p>
                    <p className="text-sm text-gray-600">
                      {plans.find(p => p.id.toString() === selectedPlanId)?.name} • {formatBillingInterval(changeBillingInterval)} • {changeDuration || 1} period(s)
                      {getDiscountPercentage(changeBillingInterval) > 0 && ` • ${getDiscountPercentage(changeBillingInterval)}% off`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">
                      {(() => {
                        const selectedPlan = plans.find(p => p.id.toString() === selectedPlanId);
                        if (!selectedPlan) return '$0.00';
                        const duration = parseInt(changeDuration) || 1;
                        const interval = changeBillingInterval;
                        const months = interval === 'month' ? 1 : interval === 'quarter' ? 3 : interval === 'semiAnnual' ? 6 : 12;
                        const totalMonths = months * duration;
                        const discount = getDiscountPercentage(changeBillingInterval);
                        const discountedPrice = selectedPlan.basePrice * (1 - discount / 100);
                        const totalPrice = discountedPrice * duration;
                        return formatPrice(totalPrice, selectedPlan.currency);
                      })()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Ends: {(() => {
                        const startDate = effectiveDate ? new Date(effectiveDate) : new Date();
                        const duration = parseInt(changeDuration) || 1;
                        const interval = changeBillingInterval;
                        const months = interval === 'month' ? 1 : interval === 'quarter' ? 3 : interval === 'semiAnnual' ? 6 : 12;
                        const endDate = new Date(startDate);
                        endDate.setMonth(endDate.getMonth() + (months * duration));
                        return formatDate(endDate);
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="changeReason">Reason for Change</Label>
              <Textarea
                id="changeReason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Enter reason for changing the plan..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifyMerchant"
                checked={notifyMerchant}
                onChange={(e) => setNotifyMerchant(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="notifyMerchant" className="text-sm">
                Notify merchant about this change
              </Label>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowChangeDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={!selectedPlanId || !changeReason.trim() || !changeBillingInterval || isSubmitting}
            >
              {isSubmitting ? 'Changing...' : 'Change Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Cancel Plan Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              Cancel Plan
            </DialogTitle>
            <DialogDescription>
              Permanently cancel the current plan for {merchant.name}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <X className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700 font-medium">
                  Warning: This will permanently cancel the subscription
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="cancelType">Cancellation Type</Label>
              <Select value={cancelType} onValueChange={(value: 'immediate' | 'end_of_period') => setCancelType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="end_of_period">End of Current Period (Recommended)</SelectItem>
                  <SelectItem value="immediate">Immediate Cancellation</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {cancelType === 'end_of_period' 
                  ? 'Customer keeps access until current billing period ends'
                  : 'Customer loses access immediately'
                }
              </p>
            </div>

            <div>
              <Label htmlFor="cancelReason">Reason for Cancellation</Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason for canceling this plan..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim() || isSubmitting}
            >
              {isSubmitting ? 'Canceling...' : 'Cancel Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Plan Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5 text-orange-500" />
              Pause Plan
            </DialogTitle>
            <DialogDescription>
              Pause the current plan for {merchant.name}. The plan can be resumed later without losing subscription history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <p className="text-sm text-orange-700 font-medium">
                  Pausing preserves subscription history and makes reactivation easier
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="suspendReason">Reason for Pausing</Label>
              <Textarea
                id="suspendReason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason for pausing this plan..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!suspendReason.trim() || isSubmitting}
            >
              {isSubmitting ? 'Pausing...' : 'Pause Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MerchantPlanManagement;
