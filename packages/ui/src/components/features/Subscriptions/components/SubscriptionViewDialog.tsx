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
  ArrowRight,
  X
} from 'lucide-react';
import type { Subscription, Plan, Merchant } from '@rentalshop/types';

interface SubscriptionViewDialogProps {
  subscription: Subscription | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (subscription: Subscription) => void;
  onCancel?: (subscription: Subscription) => void;
  onExtend?: (subscription: Subscription) => void;
  onSuspend?: (subscription: Subscription, reason: string) => void;
  onReactivate?: (subscription: Subscription) => void;
  onChangePlan?: (subscription: Subscription) => void;
}

export function SubscriptionViewDialog({
  subscription,
  isOpen,
  onClose,
  onEdit,
  onCancel,
  onExtend,
  onSuspend,
  onReactivate,
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
  const debugMode = false; // Set to false in production
  
  const canCancel = debugMode ? !!onCancel : (isActive && !!onCancel);
  const canExtend = debugMode ? !!onExtend : (isActive && !!onExtend);
  const canChangePlan = debugMode ? !!onChangePlan : (isActive && !!onChangePlan);
  

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
    canExtend,
    canChangePlan,
    hasHandlers: {
      onCancel: !!onCancel,
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
                    {formatCurrency(subscription.amount, (subscription.plan?.currency || 'USD') as any)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Billing Interval</label>
                  <p className="text-sm">{subscription.billingInterval || 'month'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Currency</label>
                  <p className="text-sm">{subscription.plan?.currency || 'USD'}</p>
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
                  <p className="text-sm">{subscription.status || 'Unknown'}</p>
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
                    {subscription.plan ? formatCurrency(subscription.plan.basePrice, subscription.plan.currency as any) : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Billing Interval</label>
                  <p className="text-sm">{subscription.billingInterval || 'month'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-sm">{subscription.status || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Plan ID</label>
                  <p className="text-sm">{subscription.planId || 'Unknown'}</p>
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
                  <p className="text-sm">No trial data available</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Trial End</label>
                  <p className="text-sm">No trial data available</p>
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
          {subscription.status === 'cancelled' && (
            <Card>
              <CardHeader>
                <CardTitle>Cancellation Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cancelled At</label>
                    <p className="text-sm">{formatDate(subscription.updatedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cancellation Reason</label>
                    <p className="text-sm">No reason provided</p>
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
            {isActiveStatus && onSuspend && (
              <Button 
                variant="outline" 
                onClick={() => onSuspend(subscription, 'Paused from subscription view')}
                className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
              >
                <Pause className="h-4 w-4" />
                Pause Subscription
              </Button>
            )}
            {subscription.status === 'paused' && onReactivate && (
              <Button 
                variant="outline" 
                onClick={() => onReactivate(subscription)}
                className="flex items-center gap-2 text-green-600 hover:text-green-700"
              >
                <Play className="h-4 w-4" />
                Resume Subscription
              </Button>
            )}
            {canCancel && onCancel && (
              <Button 
                variant="destructive" 
                onClick={() => onCancel(subscription)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
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
