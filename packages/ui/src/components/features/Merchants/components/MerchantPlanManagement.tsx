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
import { ManualRenewalModal } from '../../Subscriptions';
import { SubscriptionHistoryDialog } from '../../Subscriptions/components/SubscriptionHistoryDialog';
import { 
  CreditCard, 
  Clock, 
  ArrowRight,
  Pause,
  Play,
  Plus,
  X,
  History
} from 'lucide-react';
import { formatSubscriptionPeriod, formatDateTimeLong } from '@rentalshop/utils';
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
  currentUserRole?: string;
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
  loading = false,
  currentUserRole
}: MerchantPlanManagementProps) {
  // Get current subscription from merchant.subscription (single source of truth - always exists)
  const currentSubscription = merchant.subscription || subscriptions[0];

  // Debug: Log subscription status values
  console.log('🔍 MerchantPlanManagement Debug:', {
    merchantId: merchant.id,
    merchantName: merchant.name,
    subscription: currentSubscription,
    subscriptionStatus: currentSubscription?.status
  });

  // Normalize subscription status to lowercase for consistent comparison
  const subscriptionStatus = currentSubscription.status.toLowerCase();
  const isActiveStatus = subscriptionStatus === 'trial' || subscriptionStatus === 'active';
  const isPausedStatus = subscriptionStatus === 'paused' || subscriptionStatus === 'cancelled' || subscriptionStatus === 'expired';
  const isTrialStatus = subscriptionStatus === 'trial';
  const isActivePaidStatus = subscriptionStatus === 'active';
  const isPaused = subscriptionStatus === 'paused';
  
  // Check if current plan is Trial plan (free)
  const isTrialPlan = merchant.currentPlan?.name?.toLowerCase() === 'trial' || 
                      merchant.currentPlan?.price === 0 ||
                      currentSubscription.plan?.name?.toLowerCase() === 'trial';
  
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelType, setCancelType] = useState<'immediate' | 'end_of_period'>('end_of_period');
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renewalLoading, setRenewalLoading] = useState(false);
  
  // Change plan form state
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [changeReason, setChangeReason] = useState('');
  const [notifyMerchant, setNotifyMerchant] = useState(true);
  const [changeBillingInterval, setChangeBillingInterval] = useState<string>('month');

  // Reset form when dialog opens
  const handleOpenChangeDialog = () => {
    setShowChangeDialog(true);
    setSelectedPlanId('');
    setChangeReason('');
    setChangeBillingInterval('month');
    setNotifyMerchant(true);
  };

  // Ensure billing interval is always set when dialog opens
  useEffect(() => {
    if (showChangeDialog && !changeBillingInterval) {
      setChangeBillingInterval('month');
    }
  }, [showChangeDialog, changeBillingInterval]);

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


  const handleRenewal = async (paymentData: any) => {
    if (!currentSubscription || !onExtend) return;
    
    try {
      setRenewalLoading(true);
      
      // Pass the renewal data to parent handler
      await onExtend({
        subscription: currentSubscription,
        duration: 1,
        billingInterval: 'month',
        discount: 0,
        totalPrice: currentSubscription.amount,
        paymentData: paymentData // Include payment info
      } as any);
      
      setShowRenewalModal(false);
    } catch (error) {
      console.error('Failed to renew subscription:', error);
      throw error; // Re-throw for modal to handle
    } finally {
      setRenewalLoading(false);
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
    if (!selectedPlanId || !changeBillingInterval) return;

    setIsSubmitting(true);
    try {
      const selectedPlan = plans.find(p => p.id.toString() === selectedPlanId);
      const discount = getDiscountPercentage(changeBillingInterval);
      
      const planChangeData = {
        planId: Number(selectedPlanId),
        reason: changeReason.trim() || 'Plan changed by admin',
        notifyMerchant,
        billingInterval: changeBillingInterval,
        duration: 1, // Always 1 period
        discount: discount,
        totalPrice: selectedPlan ? calculateDiscountedPrice(selectedPlan.basePrice, changeBillingInterval, 1) : 0
      };
      
      await onPlanChange?.(planChangeData);
      setShowChangeDialog(false);
      // Reset form
      setSelectedPlanId('');
      setChangeReason('');
      setNotifyMerchant(true);
      setChangeBillingInterval('month');
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
      setShowResumeDialog(false);
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
            
            {/* View History Button - Top Right Corner */}
            {currentSubscription && (currentUserRole === 'ADMIN' || currentUserRole === 'MERCHANT') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryDialog(true)}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                View History
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(merchant.currentPlan || currentSubscription) ? (
            <div className="space-y-4">
              {/* Plan Name, Price & Status */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {merchant.currentPlan?.name || currentSubscription?.plan?.name || 'No plan assigned'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {merchant.currentPlan ? 
                      formatPrice(merchant.currentPlan.price, merchant.currentPlan.currency) + '/month' :
                      currentSubscription ? 
                        formatPrice(currentSubscription.amount, currentSubscription.currency) + '/month' :
                        'No pricing available'
                    }
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {/* Subscription Status - Highlighted */}
                  <div className={`px-3 py-1.5 rounded-lg font-semibold text-sm ${
                    currentSubscription?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    currentSubscription?.status === 'TRIAL' ? 'bg-blue-100 text-blue-800' :
                    currentSubscription?.status === 'PAUSED' ? 'bg-orange-100 text-orange-800' :
                    currentSubscription?.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                    currentSubscription?.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {currentSubscription?.status || 'Unknown'}
                  </div>
                </div>
              </div>

              {/* Subscription Period - Simplified */}
              {currentSubscription && (
                <div className="p-4 bg-gray-50 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Period:</span>
                    <span className="font-medium">
                      {formatDateTimeLong(currentSubscription.currentPeriodStart)} - {formatDateTimeLong(currentSubscription.currentPeriodEnd)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Billing Interval:</span>
                    <span className="font-medium capitalize">
                      {currentSubscription.interval || 'month'}
                    </span>
                  </div>
                  
                  {(currentSubscription as any).subscriptionPeriod?.daysRemaining !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {(currentSubscription as any).status === 'trial' ? 'Trial ends in:' : 'Renews in:'}
                      </span>
                      <span className={`font-medium ${
                        (currentSubscription as any).subscriptionPeriod?.daysRemaining <= 7 
                          ? 'text-orange-600' 
                          : 'text-gray-900'
                      }`}>
                        {(currentSubscription as any).subscriptionPeriod?.daysRemaining} days
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Only show action buttons for ADMIN and MERCHANT roles */}
              {(currentUserRole === 'ADMIN' || currentUserRole === 'MERCHANT') && (
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  {/* Trial Users: Show Upgrade Button */}
                  {isTrialPlan && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleOpenChangeDialog}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Upgrade to Paid Plan
                    </Button>
                  )}
                  
                  {/* Paid Users: Show Change Plan */}
                  {!isTrialPlan && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenChangeDialog}
                      className="flex items-center gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Change Plan
                    </Button>
                  )}
                
                {/* Renew/Extend - Only for PAID active subscriptions (NOT trial) */}
                {currentSubscription && isActiveStatus && !isTrialPlan && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRenewalModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Renew/Extend
                  </Button>
                )}
                
                {/* Pause - Only for ACTIVE PAID subscriptions (not trial) */}
                {currentSubscription && isActivePaidStatus && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSuspendDialog(true)}
                    className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                  >
                    <Pause className="h-4 w-4" />
                    Pause Plan
                  </Button>
                )}
                
                {/* Resume - Only for PAUSED subscriptions */}
                {currentSubscription && isPaused && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResumeDialog(true)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 text-green-600 hover:text-green-700"
                  >
                    <Play className="h-4 w-4" />
                    Resume Plan
                  </Button>
                )}
                
                {/* Cancel/End Trial - Different text based on status */}
                {currentSubscription && (isActiveStatus || isPausedStatus) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                    {isTrialStatus ? 'End Trial' : 'Cancel Plan'}
                  </Button>
                )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Subscription</h3>
              <p className="text-gray-500 mb-4">This merchant doesn't have an active subscription.</p>
              {/* Only show action buttons for ADMIN and MERCHANT roles */}
              {(currentUserRole === 'ADMIN' || currentUserRole === 'MERCHANT') && (
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
              )}
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
                      {formatDate(subscription.currentPeriodStart)} - {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}
                    </p>
                    {(subscription as any).changeReason && (
                      <p className="text-xs text-gray-400 mt-1">
                        Reason: {(subscription as any).changeReason}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatPrice(subscription.amount, (subscription as any).currency || 'USD')}
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


      {/* Manual Renewal Modal - Only for PAID plans */}
      {currentSubscription && !isTrialPlan && (
        <ManualRenewalModal
          isOpen={showRenewalModal}
          onClose={() => setShowRenewalModal(false)}
          subscription={{
            id: currentSubscription.id,
            merchantName: merchant.name,
            planName: merchant.currentPlan?.name || 'Unknown Plan',
            amount: merchant.currentPlan?.price || currentSubscription.amount || 0,
            currency: currentSubscription.currency || 'USD',
            currentPeriodEnd: currentSubscription.currentPeriodEnd 
              ? new Date(currentSubscription.currentPeriodEnd)
              : new Date()
          }}
          onRenew={handleRenewal}
          loading={renewalLoading}
        />
      )}

      {/* Change Plan Dialog - Simplified */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-500" />
              Change Subscription Plan
            </DialogTitle>
            <DialogDescription>
              Change the subscription plan for {merchant.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Plan Display */}
            {merchant.currentPlan && (
              <div className="p-4 bg-gray-50 border rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Current Plan</p>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-lg">{merchant.currentPlan.name}</p>
                  <p className="font-semibold text-lg">{formatPrice(merchant.currentPlan.price, merchant.currentPlan.currency)}/month</p>
                </div>
              </div>
            )}

            {/* Select New Plan */}
            <div>
              <Label htmlFor="planSelect">New Plan *</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name} - ${plan.basePrice}/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Billing Cycle */}
            <div>
              <Label htmlFor="changeBillingInterval">Billing Cycle *</Label>
              <Select value={changeBillingInterval} onValueChange={setChangeBillingInterval}>
                <SelectTrigger>
                  <SelectValue />
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
                Longer billing cycles offer better discounts
              </p>
            </div>

            {/* Pricing Summary */}
            {selectedPlanId && changeBillingInterval && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-900 mb-2">Pricing Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>New Plan:</span>
                    <span className="font-medium">
                      {plans.find(p => p.id.toString() === selectedPlanId)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Billing:</span>
                    <span className="font-medium">{formatBillingInterval(changeBillingInterval)}</span>
                  </div>
                  {getDiscountPercentage(changeBillingInterval) > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Discount:</span>
                      <span className="font-medium">{getDiscountPercentage(changeBillingInterval)}% off</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t text-base">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-blue-900">
                      {(() => {
                        const selectedPlan = plans.find(p => p.id.toString() === selectedPlanId);
                        if (!selectedPlan) return '$0.00';
                        const discount = getDiscountPercentage(changeBillingInterval);
                        const discountedPrice = selectedPlan.basePrice * (1 - discount / 100);
                        return formatPrice(discountedPrice, selectedPlan.currency);
                      })()}
                      /{changeBillingInterval}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Reason (Optional) */}
            <div>
              <Label htmlFor="changeReason">Reason for Change (Optional)</Label>
              <Textarea
                id="changeReason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g., Customer requested upgrade, Business growth, etc."
                rows={2}
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
                Send email notification to merchant
              </Label>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowChangeDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={!selectedPlanId || !changeBillingInterval || isSubmitting}
            >
              {isSubmitting ? 'Changing...' : 'Change Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Cancel Plan Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
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

      {/* Resume Plan Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              Resume Subscription
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to resume this subscription?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Resuming Subscription</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✓ Your subscription will be reactivated immediately</li>
                <li>✓ You will regain full access to all features</li>
                <li>✓ Billing will resume according to your current plan</li>
                <li>✓ All services will be restored</li>
              </ul>
            </div>

            {currentSubscription && (
              <div className="p-4 bg-gray-50 border rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-medium">{currentSubscription.plan?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{formatPrice(currentSubscription.amount, currentSubscription.currency)}/month</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowResumeDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleReactivate}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Resuming...' : 'Resume Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              Subscription Activity & Payment History
            </DialogTitle>
            <DialogDescription>
              View detailed activity and payment history for this subscription
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <SubscriptionHistoryDialog 
              subscriptionId={currentSubscription?.id}
              merchantId={merchant.id}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowHistoryDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MerchantPlanManagement;
