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
} from '@rentalshop/ui/base';
import { formatDate, formatCurrency } from '@rentalshop/ui/base';
import { 
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

        <div className="space-y-4">
          {/* Compact summary card (only essentials) */}
          <Card>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
              <div>
                <label className="text-sm text-gray-500">Merchant</label>
                <p className="font-medium">{subscription.merchant?.name || 'Unknown Merchant'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Plan</label>
                <p className="font-medium">{subscription.plan?.name || 'Unknown Plan'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Billing Interval</label>
                <p className="font-medium">{subscription.billingInterval}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Amount</label>
                <p className="font-medium">{formatCurrency(subscription.amount, (subscription.plan?.currency || 'USD') as any)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Current Period</label>
                <p className="font-medium">
                  {formatDate(subscription.currentPeriodStart)}
                  <span className="mx-2">→</span>
                  {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <div className="mt-1">
                  <Badge variant={getStatusColor(subscription.status)}>{subscription.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <DialogFooter className="flex flex-wrap gap-2">
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
          {subscription.status === 'PAUSED' && onReactivate && (
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
