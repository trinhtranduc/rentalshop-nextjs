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
import { useSettingsTranslations } from '@rentalshop/hooks';

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
  const t = useSettingsTranslations();
  
  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">{t('subscription.loading')}</span>
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
                    <h3 className="text-base font-semibold text-gray-900">{t('subscription.currentPlan')}</h3>
                    <p className="text-sm text-gray-600">{subscriptionData.subscription.plan?.name || 'Professional Plan'}</p>
                  </div>
                </div>
                <Badge 
                  variant={subscriptionData.isExpired ? 'destructive' : 'default'}
                  className={subscriptionData.isExpired ? 'bg-red-100 text-red-800' : subscriptionData.isExpiringSoon ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}
                >
                  {subscriptionData.isExpired ? t('subscription.expired') : subscriptionData.isExpiringSoon ? t('subscription.expiringSoon') : t('subscription.active')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{t('subscription.amount')}</span>
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    ${subscriptionData.subscription.amount || '0.00'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {subscriptionData.subscription.interval || 'monthly'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{t('subscription.nextBilling')}</span>
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    {subscriptionData.subscription.currentPeriodEnd ? 
                      new Date(subscriptionData.subscription.currentPeriodEnd).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) : 'N/A'}
                  </p>
                  {subscriptionData.daysUntilExpiry && (
                    <p className="text-xs text-gray-600">
                      {subscriptionData.daysUntilExpiry} {t('subscription.daysRemaining')}
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{t('subscription.status')}</span>
                  </div>
                  <p className="text-base font-semibold text-gray-900 capitalize">
                    {subscriptionData.subscription.status || t('subscription.active')}
                  </p>
                  <p className="text-xs text-gray-600">
                    {subscriptionData.subscription.cancelAtPeriodEnd ? t('subscription.cancelsAtPeriodEnd') : t('subscription.autoRenewalEnabled')}
                  </p>
                </div>
              </div>

              {subscriptionData.isExpiringSoon && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      {t('subscription.expiresIn')} {subscriptionData.daysUntilExpiry} {t('subscription.daysRemaining')}. 
                      {t('subscription.considerRenewing')}
                    </p>
                  </div>
                </div>
              )}

              {/* Show read-only message for all roles */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  {currentUserRole === 'OUTLET_ADMIN' 
                    ? t('subscription.contactMerchant')
                    : t('subscription.comingSoon')
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
            <h3 className="text-base font-semibold text-gray-900 mb-2">{t('subscription.noSubscription')}</h3>
            <p className="text-sm text-gray-600 mb-6">{t('subscription.noSubscriptionDesc')}</p>
            
            {/* Only show action button for ADMIN and MERCHANT roles */}
            {(currentUserRole === 'ADMIN' || currentUserRole === 'MERCHANT') && (
              <Button>
                {t('subscription.viewInvoices')}
              </Button>
            )}
            
            {/* Show read-only message for OUTLET_ADMIN */}
            {currentUserRole === 'OUTLET_ADMIN' && (
              <p className="text-sm text-gray-600">
                {t('subscription.contactAdmin')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
