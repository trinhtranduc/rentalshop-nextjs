'use client';

import React from 'react';
import { 
  Card, 
  CardContent,
  Button,
  Badge
} from '@rentalshop/ui';
import { 
  CreditCard, 
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionSectionProps {
  subscriptionData: any;
  subscriptionLoading: boolean;
  currentUserRole?: string;
}

// ============================================================================
// SUBSCRIPTION SECTION COMPONENT
// ============================================================================

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({
  subscriptionData,
  subscriptionLoading,
  currentUserRole
}) => {
  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading subscription data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (subscriptionData?.hasSubscription) {
    return (
      <div className="space-y-6">
        {/* Current Plan Card */}
        <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                    <p className="text-sm text-gray-600">{subscriptionData.subscription.plan?.name || 'Professional Plan'}</p>
                  </div>
                </div>
                <Badge 
                  variant={subscriptionData.isExpired ? 'destructive' : 'default'}
                  className={subscriptionData.isExpired ? 'bg-red-100 text-red-800' : subscriptionData.isExpiringSoon ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}
                >
                  {subscriptionData.isExpired ? 'Expired' : subscriptionData.isExpiringSoon ? 'Expiring Soon' : 'Active'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Amount</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    ${subscriptionData.subscription.amount || '0.00'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {subscriptionData.subscription.interval || 'monthly'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Next Billing</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {subscriptionData.subscription.currentPeriodEnd ? 
                      new Date(subscriptionData.subscription.currentPeriodEnd).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) : 'N/A'}
                  </p>
                  {subscriptionData.daysUntilExpiry && (
                    <p className="text-xs text-gray-600">
                      {subscriptionData.daysUntilExpiry} days remaining
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Status</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 capitalize">
                    {subscriptionData.subscription.status || 'Active'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {subscriptionData.subscription.cancelAtPeriodEnd ? 'Cancels at period end' : 'Auto-renewal enabled'}
                  </p>
                </div>
              </div>

              {subscriptionData.isExpiringSoon && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      Your subscription expires in {subscriptionData.daysUntilExpiry} days. 
                      Consider renewing to avoid service interruption.
                    </p>
                  </div>
                </div>
              )}

              {/* Show read-only message for all roles */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  {currentUserRole === 'OUTLET_ADMIN' 
                    ? 'Contact your merchant administrator to manage subscription settings.'
                    : 'Subscription management features coming soon.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h3>
            <p className="text-gray-600 mb-6">You don't have an active subscription. Choose a plan to get started.</p>
            
            {/* Only show action button for ADMIN and MERCHANT roles */}
            {(currentUserRole === 'ADMIN' || currentUserRole === 'MERCHANT') && (
              <Button>
                View Available Plans
              </Button>
            )}
            
            {/* Show read-only message for OUTLET_ADMIN */}
            {currentUserRole === 'OUTLET_ADMIN' && (
              <p className="text-sm text-gray-600">
                Contact your merchant administrator to set up a subscription.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
