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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-3">
            <span>Subscription Details</span>
            <Badge variant={getStatusColor(subscription.status)}>
              {subscription.status}
            </Badge>
          </DialogTitle>
          <DialogDescription className="mt-1">
            View and manage subscription information for {subscription.merchant?.name || 'Unknown Merchant'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto">
        <div className="space-y-4">
          {/* Compact summary card (only essentials) */}
          <Card>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Merchant</label>
                <p className="text-sm font-semibold">{subscription.merchant?.name || 'Unknown Merchant'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Plan</label>
                <p className="text-sm font-semibold">{subscription.plan?.name || 'Unknown Plan'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Billing Interval</label>
                <p className="text-sm font-semibold">{subscription.billingInterval}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Amount</label>
                <p className="text-sm font-semibold">{formatCurrency(subscription.amount, (subscription.plan?.currency || 'USD') as any)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Current Period</label>
                <p className="text-sm font-semibold">
                  {formatDate(subscription.currentPeriodStart)}
                  <span className="mx-2">→</span>
                  {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                <div className="mt-1">
                  <Badge variant={getStatusColor(subscription.status)}>{subscription.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
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
                className="flex items-center gap-2 text-action-warning hover:text-action-warning"
            >
              <Pause className="h-4 w-4" />
              Pause Subscription
            </Button>
          )}
          {subscription.status === 'PAUSED' && onReactivate && (
            <Button 
              variant="outline" 
              onClick={() => onReactivate(subscription)}
                className="flex items-center gap-2 text-action-success hover:text-action-success"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
