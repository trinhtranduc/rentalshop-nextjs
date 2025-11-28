"use client";

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
  SubscriptionChangePlanDialog,
  SubscriptionExtendDialog 
} from '../../Subscriptions';
import { SubscriptionHistoryDialog } from '../../Subscriptions/components/SubscriptionHistoryDialog';
import type { BillingInterval } from '@rentalshop/types';
import { BILLING_CYCLES_ARRAY } from '@rentalshop/constants';
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
import type { Plan, Subscription } from '@rentalshop/types';

type BillingCycleConfig = {
  value: BillingInterval;
  label: string;
  months: number;
  discount: number;
  description: string;
};
import { SUBSCRIPTION_STATUS, normalizeSubscriptionStatus } from '@rentalshop/constants';
import type { SubscriptionStatus } from '@rentalshop/constants';

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
    subscriptionStatus?: SubscriptionStatus; // ✅ Type safe with enum
    subscription?: Subscription | null; // ✅ Unified Subscription type (no duplicate)
  };
  subscriptions?: Subscription[]; // ✅ Unified Subscription type
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
  const currentSubscription = merchant.subscription || subscriptions?.[0] || null;

  // Debug: Log subscription status values
  console.log('🔍 MerchantPlanManagement Debug:', {
    merchantId: merchant.id,
    merchantName: merchant.name,
    subscription: currentSubscription,
    subscriptionStatus: currentSubscription?.status
  });

  // Normalize subscription status - use enum for type safety
  // Use merchant.subscriptionStatus as fallback if subscription is not available
  const subscriptionStatus: SubscriptionStatus = normalizeSubscriptionStatus(currentSubscription?.status)
    || normalizeSubscriptionStatus(merchant.subscriptionStatus)
    || SUBSCRIPTION_STATUS.TRIAL; // Default to TRIAL if unknown
  
  // Use enum constants for comparisons (type safe)
  const isActiveStatus = subscriptionStatus === SUBSCRIPTION_STATUS.TRIAL || subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE;
  const isPausedStatus = subscriptionStatus === SUBSCRIPTION_STATUS.PAUSED 
    || subscriptionStatus === SUBSCRIPTION_STATUS.CANCELLED 
    || subscriptionStatus === SUBSCRIPTION_STATUS.EXPIRED;
  const isTrialStatus = subscriptionStatus === SUBSCRIPTION_STATUS.TRIAL;
  const isActivePaidStatus = subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE;
  const isPaused = subscriptionStatus === SUBSCRIPTION_STATUS.PAUSED;
  
  // Check if current plan is Trial plan (free)
  const isTrialPlan = currentSubscription?.plan?.name?.toLowerCase() === 'trial' || 
                      currentSubscription?.plan?.basePrice === 0;
  
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelType, setCancelType] = useState<'immediate' | 'end_of_period'>('end_of_period');
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Adapter function to convert SubscriptionChangePlanDialog callback to onPlanChange format
  const handleChangePlanConfirm = (
    subscription: Subscription,
    newPlanId: number,
    interval: BillingInterval,
    startDate?: Date,
    reason?: string,
    sendEmail?: boolean
  ) => {
    const selectedPlan = plans.find(p => p.id === newPlanId);
    if (!selectedPlan) return;

    // Get billing cycle config from constants
    const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === interval);
    if (!cycleConfig) return;
    
    // Calculate total price with discount
    const basePrice = selectedPlan.basePrice || 0;
    const totalBasePrice = basePrice * cycleConfig.months;
    const totalPrice = totalBasePrice * (1 - cycleConfig.discount / 100);

    // Convert to MerchantPlanManagement.onPlanChange format
    const planChangeData = {
      planId: newPlanId,
      planVariantId: undefined,
      reason: reason || 'Plan changed by admin',
      effectiveDate: startDate?.toISOString() || new Date().toISOString(),
      notifyMerchant: sendEmail ?? true,
      billingInterval: interval, // Use BillingInterval directly, no conversion
      duration: cycleConfig.months,
      discount: cycleConfig.discount,
      totalPrice
    };

    onPlanChange(planChangeData);
  };

  // Adapter function to convert SubscriptionExtendDialog callback to onExtend format
  const handleExtendConfirm = (
    subscription: Subscription,
    data: {
      newEndDate: Date;
      amount: number;
      method: string;
      description?: string;
    }
  ) => {
    // Calculate duration from newEndDate
    const currentEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : new Date();
    const extensionDays = Math.ceil((data.newEndDate.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.ceil(extensionDays / 30);
    
    // Map months to closest BillingInterval using BILLING_CYCLES_ARRAY
    const cycleConfig = BILLING_CYCLES_ARRAY.find((c: any) => {
      if (months <= 1) return c.months === 1;
      if (months <= 3) return c.months === 3;
      if (months <= 6) return c.months === 6;
      return c.months === 12;
    });
    const billingInterval: BillingInterval = (cycleConfig?.value || 'monthly') as BillingInterval;

    // Convert to MerchantPlanManagement.onExtend format
    const extendData = {
      subscription,
      duration: months,
      billingInterval, // Use BillingInterval directly
      discount: 0,
      totalPrice: data.amount
    };

    onExtend?.(extendData);
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
          {currentSubscription ? (
            <div className="space-y-4">
              {/* Plan Name, Price & Status */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {currentSubscription?.plan?.name || 'No plan assigned'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {currentSubscription ? 
                        formatPrice(currentSubscription.amount, (currentSubscription as any).currency || 'USD') + '/month' :
                        'No pricing available'
                    }
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {/* Subscription Status - Highlighted */}
                  <div className={`px-3 py-1.5 rounded-lg font-semibold text-sm ${
                    subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE ? 'bg-green-100 text-green-800' :
                    subscriptionStatus === SUBSCRIPTION_STATUS.TRIAL ? 'bg-blue-100 text-blue-800' :
                    subscriptionStatus === SUBSCRIPTION_STATUS.PAUSED ? 'bg-orange-100 text-orange-800' :
                    subscriptionStatus === SUBSCRIPTION_STATUS.CANCELLED ? 'bg-red-100 text-red-800' :
                    subscriptionStatus === SUBSCRIPTION_STATUS.EXPIRED ? 'bg-gray-100 text-gray-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {subscriptionStatus || 'Unknown'}
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
                      {(currentSubscription as any).interval || currentSubscription.billingInterval || 'month'}
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
                      onClick={() => setShowChangeDialog(true)}
                      className="flex items-center gap-2 bg-blue-700 hover:bg-blue-700"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Upgrade to Paid Plan
                    </Button>
                  )}
                  
                  {/* Change Plan - Show only for paid subscriptions (not trial) */}
                  {currentSubscription && isActiveStatus && !isTrialPlan && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChangeDialog(true)}
                      className="flex items-center gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Change Plan
                    </Button>
                  )}
                
                {/* Extend Plan - For active subscriptions (including trial) */}
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
                  <Button onClick={() => setShowChangeDialog(true)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Create Subscription
                  </Button>
                    
                  {/* Always show Change Plan button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangeDialog(true)}
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


      {/* Change Plan Dialog - Using shared component */}
      {currentSubscription && (
        <SubscriptionChangePlanDialog
          subscription={currentSubscription}
          plans={plans}
          isOpen={showChangeDialog}
          onClose={() => setShowChangeDialog(false)}
          onConfirm={handleChangePlanConfirm}
          loading={isSubmitting}
        />
      )}

      {/* Extend Dialog - Using shared component */}
      {currentSubscription && (
        <SubscriptionExtendDialog
          subscription={currentSubscription}
          isOpen={showExtendDialog}
          onClose={() => setShowExtendDialog(false)}
          onConfirm={handleExtendConfirm}
          loading={isSubmitting}
        />
      )}


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
                  <span className="font-medium">{formatPrice(currentSubscription.amount, (currentSubscription as any).currency || 'USD')}/month</span>
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
