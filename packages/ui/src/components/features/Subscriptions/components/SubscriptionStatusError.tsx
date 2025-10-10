// ============================================================================
// SUBSCRIPTION STATUS ERROR COMPONENT
// ============================================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../../../ui';
import { AlertTriangle, Clock, XCircle, RefreshCw, CreditCard } from 'lucide-react';
import type { Subscription } from '@rentalshop/types';

interface SubscriptionStatusErrorProps {
  subscription: Subscription | null;
  onReactivate?: () => void;
  onUpgrade?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

export function SubscriptionStatusError({
  subscription,
  onReactivate,
  onUpgrade,
  onContactSupport,
  className = ''
}: SubscriptionStatusErrorProps) {
  if (!subscription) return null;

  const getErrorConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paused':
        return {
          icon: Clock,
          title: 'Subscription Paused',
          message: 'Your subscription has been paused. Some features may be limited.',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          actions: [
            { label: 'Resume Subscription', onClick: onReactivate, variant: 'default' as const },
            { label: 'Contact Support', onClick: onContactSupport, variant: 'outline' as const }
          ]
        };
      case 'expired':
        return {
          icon: XCircle,
          title: 'Subscription Expired',
          message: 'Your subscription has expired. Please renew to continue using the service.',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          actions: [
            { label: 'Renew Subscription', onClick: onUpgrade, variant: 'default' as const },
            { label: 'Contact Support', onClick: onContactSupport, variant: 'outline' as const }
          ]
        };
      case 'cancelled':
        return {
          icon: XCircle,
          title: 'Subscription Cancelled',
          message: 'Your subscription has been cancelled. You can reactivate or choose a new plan.',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          actions: [
            { label: 'Choose New Plan', onClick: onUpgrade, variant: 'default' as const },
            { label: 'Contact Support', onClick: onContactSupport, variant: 'outline' as const }
          ]
        };
      case 'past_due':
        return {
          icon: AlertTriangle,
          title: 'Payment Past Due',
          message: 'Your payment is past due. Please update your payment method to avoid service interruption.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          actions: [
            { label: 'Update Payment', onClick: onUpgrade, variant: 'default' as const },
            { label: 'Contact Support', onClick: onContactSupport, variant: 'outline' as const }
          ]
        };
      default:
        return null;
    }
  };

  const errorConfig = getErrorConfig(subscription.status);
  if (!errorConfig) return null;

  const Icon = errorConfig.icon;

  return (
    <Card className={`${errorConfig.bgColor} ${errorConfig.borderColor} border-2 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 ${errorConfig.color}`}>
          <Icon className="h-5 w-5" />
          {errorConfig.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-700 mb-4">
          {errorConfig.message}
        </p>
        
        {/* Subscription Details */}
        <div className="bg-white/50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Plan:</span>
              <span className="ml-2 font-medium">{subscription.plan?.name || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className={`ml-2 font-medium ${errorConfig.color}`}>
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Amount:</span>
              <span className="ml-2 font-medium">
                ${subscription.amount?.toFixed(2) || '0.00'} / {subscription.billingInterval || 'month'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Last Updated:</span>
              <span className="ml-2 font-medium">
                {subscription.updatedAt ? new Date(subscription.updatedAt).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {errorConfig.actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              size="sm"
              onClick={action.onClick}
              className="flex items-center gap-2"
            >
              {action.variant === 'default' && <CreditCard className="h-4 w-4" />}
              {action.variant === 'outline' && <RefreshCw className="h-4 w-4" />}
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default SubscriptionStatusError;
