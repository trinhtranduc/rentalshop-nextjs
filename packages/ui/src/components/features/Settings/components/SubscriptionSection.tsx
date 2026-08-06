'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@rentalshop/ui';
import { 
  CreditCard, 
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  History,
  TrendingUp,
  Landmark
} from 'lucide-react';
import { useSettingsTranslations } from '@rentalshop/hooks';
import { subscriptionsApi } from '@rentalshop/utils';
import { SubscriptionActivityTimeline } from '../../Subscriptions';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionSectionProps {
  subscriptionData: any;
  subscriptionLoading: boolean;
  currentUserRole?: string;
  /** Merchant: open upgrade / change plan (e.g. Lemon Squeezy checkout) */
  onUpgradeClick?: () => void;
  /** Merchant: open extend / renew flow (e.g. bank transfer proof) */
  onExtendClick?: () => void;
  /** Merchant with no subscription: primary CTA instead of “View invoices” */
  onChoosePlanClick?: () => void;
}

// ============================================================================
// SUBSCRIPTION SECTION COMPONENT
// ============================================================================

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({
  subscriptionData,
  subscriptionLoading,
  currentUserRole,
  onUpgradeClick,
  onExtendClick,
  onChoosePlanClick,
}) => {
  const t = useSettingsTranslations();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleViewHistory = async () => {
    setShowHistoryModal(true);
    await fetchSubscriptionHistory();
  };

  /**
   * Why activities + payments (not listing other Subscription rows):
   * Merchants typically keep one subscription that is renewed/extended in place.
   * Real history lives on SubscriptionActivity + Payment for that id.
   * The old path called GET /subscriptions and read `data.subscriptions` (wrong
   * shape — API returns `data: Subscription[]`) then filtered out the current
   * subscription, so the modal almost always showed empty.
   */
  const fetchSubscriptionHistory = async () => {
    const subscriptionId = subscriptionData?.subscription?.id as number | undefined;
    if (!subscriptionId) {
      setActivities([]);
      setPayments([]);
      return;
    }

    try {
      setHistoryLoading(true);
      const [activitiesResult, paymentsResult] = await Promise.all([
        subscriptionsApi.getActivities(subscriptionId, 50),
        subscriptionsApi.getPayments(subscriptionId, 50),
      ]);

      setActivities(
        activitiesResult.success && Array.isArray(activitiesResult.data)
          ? activitiesResult.data
          : []
      );
      setPayments(
        paymentsResult.success && Array.isArray(paymentsResult.data)
          ? paymentsResult.data
          : []
      );
    } catch (error) {
      console.error('Error fetching subscription history:', error);
      setActivities([]);
      setPayments([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
              <span className="ml-2 text-gray-600">{t('subscription.loading')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysLeft =
    subscriptionData?.daysRemaining ?? subscriptionData?.daysUntilExpiry;
  const billingCurrency =
    subscriptionData?.subscription?.currency ||
    subscriptionData?.subscription?.plan?.currency ||
    'USD';

  if (subscriptionData?.hasSubscription) {
    return (
      <div className="space-y-6">
        {/* Current Plan Card */}
        <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-6 w-6 text-blue-700" />
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
                    {formatCurrency(
                      Number(subscriptionData.subscription.amount) || 0,
                      billingCurrency
                    )}
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
                  {daysLeft != null && daysLeft !== '' && (
                    <p className="text-xs text-gray-600">
                      {daysLeft} {t('subscription.daysRemaining')}
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
                      {t('subscription.expiresIn')} {daysLeft} {t('subscription.daysRemaining')}. 
                      {t('subscription.considerRenewing')}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons — giữ layout cũ, thêm tùy chọn nâng cấp / gia hạn khi app truyền callback */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap justify-center gap-2">
                {onUpgradeClick && (
                  <Button
                    variant="default"
                    onClick={onUpgradeClick}
                    className="flex items-center gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    {t('subscription.upgradePlan')}
                  </Button>
                )}
                {onExtendClick && (
                  <Button
                    variant="secondary"
                    onClick={onExtendClick}
                    className="flex items-center gap-2"
                  >
                    <Landmark className="h-4 w-4" />
                    {t('subscription.extendOrRenew')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleViewHistory}
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  {t('subscription.viewHistory') || 'View History'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subscription History Modal — activity + payment timeline for current subscription */}
          <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t('subscription.historyTitle') || 'Subscription History'}
                </DialogTitle>
                <DialogDescription>
                  {t('subscription.historyDescription') || 'View activity and payment history for your subscription'}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2">
                <SubscriptionActivityTimeline
                  activities={activities}
                  payments={payments}
                  loading={historyLoading}
                  userFacing
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowHistoryModal(false)}>
                  {t('subscription.close') || 'Close'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
            
            {(currentUserRole === 'ADMIN' || currentUserRole === 'MERCHANT') &&
              (currentUserRole === 'MERCHANT' && onChoosePlanClick ? (
                <Button onClick={onChoosePlanClick}>
                  {t('subscription.choosePlan')}
                </Button>
              ) : (
                <Button>{t('subscription.viewInvoices')}</Button>
              ))}
            
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
