// ============================================================================
// SUBSCRIPTION EXPIRY BANNER - Shows when subscription is expired or expiring soon
// ============================================================================

import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  CreditCard,
  ExternalLink,
  X
} from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@rentalshop/ui/base';
import { Subscription } from '@rentalshop/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionExpiryBannerProps {
  subscription: Subscription;
  onSelectPlan: () => void;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SubscriptionExpiryBanner: React.FC<SubscriptionExpiryBannerProps> = ({
  subscription,
  onSelectPlan,
  onDismiss,
  showDismiss = false
}) => {
  const isExpired = subscription.status === 'EXPIRED';
  const isExpiringSoon = subscription.status === 'ACTIVE' && 
    subscription.endDate && 
    new Date(subscription.endDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const getExpiryMessage = () => {
    if (isExpired) {
      return {
        title: 'Subscription Expired',
        message: 'Your subscription has expired. Please renew to continue using the service.',
        variant: 'destructive' as const,
        icon: AlertTriangle
      };
    }
    
    if (isExpiringSoon) {
      return {
        title: 'Subscription Expiring Soon',
        message: `Your subscription expires on ${new Date(subscription.endDate!).toLocaleDateString()}. Renew now to avoid service interruption.`,
        variant: 'warning' as const,
        icon: Clock
      };
    }

    return null;
  };

  const getDaysUntilExpiry = () => {
    if (!subscription.endDate) return null;
    const now = new Date();
    const expiryDate = new Date(subscription.endDate);
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const expiryInfo = getExpiryMessage();
  const daysUntilExpiry = getDaysUntilExpiry();

  if (!expiryInfo) return null;

  const Icon = expiryInfo.icon;

  return (
    <Card className={`border-l-4 ${
      expiryInfo.variant === 'destructive' 
        ? 'border-red-500 bg-red-50' 
        : 'border-orange-500 bg-orange-50'
    }`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Icon className={`h-5 w-5 mt-0.5 ${
              expiryInfo.variant === 'destructive' 
                ? 'text-red-500' 
                : 'text-orange-500'
            }`} />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${
                  expiryInfo.variant === 'destructive' 
                    ? 'text-red-800' 
                    : 'text-orange-800'
                }`}>
                  {expiryInfo.title}
                </h3>
                {daysUntilExpiry !== null && (
                  <Badge variant={expiryInfo.variant === 'destructive' ? 'destructive' : 'secondary'}>
                    {isExpired ? 'Expired' : `${daysUntilExpiry} days left`}
                  </Badge>
                )}
              </div>
              <p className={`text-sm ${
                expiryInfo.variant === 'destructive' 
                  ? 'text-red-700' 
                  : 'text-orange-700'
              }`}>
                {expiryInfo.message}
              </p>
              
              {/* Subscription Details */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    Plan: {subscription.plan?.name}
                  </span>
                </div>
                {subscription.endDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">
                      Expires: {new Date(subscription.endDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={onSelectPlan}
              className={`${
                expiryInfo.variant === 'destructive'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              } text-white`}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isExpired ? 'Renew Now' : 'Extend Plan'}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            
            {showDismiss && onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
