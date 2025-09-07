import React from 'react';
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
  Badge,
  Separator
} from '@rentalshop/ui';
import { formatDate, formatCurrency } from '@rentalshop/ui';
import { 
  Edit, 
  Trash2, 
  Pause, 
  Play, 
  Clock, 
  ArrowRight 
} from 'lucide-react';
import type { Subscription, Plan, Merchant } from '@rentalshop/types';

interface SubscriptionViewDialogProps {
  subscription: Subscription | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (subscription: Subscription) => void;
  onCancel?: (subscription: Subscription) => void;
  onSuspend?: (subscription: Subscription) => void;
  onReactivate?: (subscription: Subscription) => void;
  onExtend?: (subscription: Subscription) => void;
  onChangePlan?: (subscription: Subscription) => void;
}

export function SubscriptionViewDialog({
  subscription,
  isOpen,
  onClose,
  onEdit,
  onCancel,
  onSuspend,
  onReactivate,
  onExtend,
  onChangePlan
}: SubscriptionViewDialogProps) {
  if (!subscription) return null;

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'past_due': return 'destructive';
      case 'cancelled': return 'destructive';
      case 'paused': return 'destructive';
      case 'expired': return 'destructive';
      default: return 'secondary';
    }
  };

  // More robust status checking - handle both uppercase and lowercase
  const normalizedStatus = subscription.status.toLowerCase();
  const isActive = ['active', 'trial', 'past_due'].includes(normalizedStatus);
  const isInactive = ['cancelled', 'paused', 'expired'].includes(normalizedStatus);
  
  // Handle edge cases where status might be different
  const isExpired = normalizedStatus === 'expired' || (subscription.status as string) === 'EXPIRED';
  const isActiveStatus = normalizedStatus === 'active' || (subscription.status as string) === 'ACTIVE';
  
  // For debugging - show all actions if handlers exist
  const debugMode = true; // Set to false in production
  
  const canCancel = debugMode ? !!onCancel : (isActive && !!onCancel);
  const canSuspend = debugMode ? !!onSuspend : (isActive && !!onSuspend);
  const canReactivate = debugMode ? !!onReactivate : (isInactive && !!onReactivate);
  const canExtend = debugMode ? !!onExtend : (isActive && !!onExtend);
  const canChangePlan = debugMode ? !!onChangePlan : (isActive && !!onChangePlan);
  
  // Show only one of suspend/reactivate based on status
  const showSuspend = (isActive || isActiveStatus) && !!onSuspend;
  const showReactivate = (isInactive || isExpired) && !!onReactivate;

  // Debug logging
  console.log('SubscriptionViewDialog Debug:', {
    subscription: subscription,
    originalStatus: subscription.status,
    normalizedStatus,
    isActive,
    isInactive,
    isExpired,
    isActiveStatus,
    canCancel,
    canSuspend,
    canReactivate,
    canExtend,
    canChangePlan,
    showSuspend,
    showReactivate,
    hasHandlers: {
      onCancel: !!onCancel,
      onSuspend: !!onSuspend,
      onReactivate: !!onReactivate,
      onExtend: !!onExtend,
      onChangePlan: !!onChangePlan
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Subscription Details</span>
            <Badge variant={getStatusColor(subscription.status)}>
              {subscription.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            View and manage subscription information for {subscription.merchant?.name || 'Unknown Merchant'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Subscription ID</label>
                  <p className="text-sm">{subscription.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Plan</label>
                  <p className="text-sm font-medium">{subscription.plan?.name || 'Unknown Plan'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-sm font-medium">
                    {formatCurrency(subscription.amount, subscription.currency as any)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Cancel at Period End</label>
                  <p className="text-sm">{subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Currency</label>
                  <p className="text-sm">{subscription.currency}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Merchant Information */}
          <Card>
            <CardHeader>
              <CardTitle>Merchant Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Merchant ID</label>
                  <p className="text-sm">{subscription.merchantId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Merchant Name</label>
                  <p className="text-sm font-medium">{subscription.merchant?.name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm">{subscription.merchant?.email || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Subscription Status</label>
                  <p className="text-sm">{subscription.merchant?.subscriptionStatus || 'Unknown'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Details */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Plan ID</label>
                  <p className="text-sm">{subscription.planId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Plan Name</label>
                  <p className="text-sm font-medium">{subscription.plan?.name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Plan Price</label>
                  <p className="text-sm font-medium">
                    {subscription.plan ? formatCurrency(subscription.plan.basePrice, subscription.currency as any) : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Interval</label>
                  <p className="text-sm">{subscription.interval || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Interval Count</label>
                  <p className="text-sm">{subscription.intervalCount || '1'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Period</label>
                  <p className="text-sm">{subscription.period || 'Unknown'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Period Start</label>
                  <p className="text-sm">{formatDate(subscription.currentPeriodStart)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Period End</label>
                  <p className="text-sm">{subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'No end date'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Trial Start</label>
                  <p className="text-sm">{subscription.trialStart ? formatDate(subscription.trialStart) : 'No trial'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Trial End</label>
                  <p className="text-sm">{subscription.trialEnd ? formatDate(subscription.trialEnd) : 'No trial'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-sm">{formatDate(subscription.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Updated At</label>
                  <p className="text-sm">{formatDate(subscription.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Information */}
          {subscription.canceledAt && (
            <Card>
              <CardHeader>
                <CardTitle>Cancellation Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cancelled At</label>
                    <p className="text-sm">{formatDate(subscription.canceledAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cancellation Reason</label>
                    <p className="text-sm">{subscription.cancelReason || 'No reason provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2 flex-wrap">
            {canExtend && onExtend && (
              <Button 
                variant="outline" 
                onClick={() => onExtend(subscription)}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Extend Subscription
              </Button>
            )}
            {canChangePlan && onChangePlan && (
              <Button 
                variant="outline" 
                onClick={() => onChangePlan(subscription)}
                className="flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Change Plan
              </Button>
            )}
            {showSuspend && (
              <Button 
                variant="outline" 
                onClick={() => onSuspend!(subscription)}
                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              >
                <Pause className="h-4 w-4" />
                Suspend
              </Button>
            )}
            {showReactivate && (
              <Button 
                variant="outline" 
                onClick={() => onReactivate!(subscription)}
                className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Play className="h-4 w-4" />
                Reactivate
              </Button>
            )}
            {canCancel && onCancel && (
              <Button 
                variant="destructive" 
                onClick={() => onCancel(subscription)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Cancel Subscription
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button 
                variant="outline" 
                onClick={() => onEdit(subscription)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
