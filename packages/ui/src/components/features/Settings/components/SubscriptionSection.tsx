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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  PageLoadingIndicator
} from '@rentalshop/ui';
import { 
  CreditCard, 
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  History,
  Clock
} from 'lucide-react';
import { useSettingsTranslations } from '@rentalshop/hooks';
import { subscriptionsApi } from '@rentalshop/utils';
import type { Subscription } from '@rentalshop/types';

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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [subscriptionHistory, setSubscriptionHistory] = useState<Subscription[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleViewHistory = async () => {
    setShowHistoryModal(true);
    await fetchSubscriptionHistory();
  };

  const fetchSubscriptionHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await subscriptionsApi.getSubscriptionsPaginated(1, 50);
      if (result.success && result.data) {
        // Filter out current subscription and sort by date
        const currentSubscriptionId = subscriptionData?.subscription?.id;
        const history = (result.data.subscriptions || [])
          .filter((sub: Subscription) => sub.id !== currentSubscriptionId)
          .sort((a: Subscription, b: Subscription) => {
            const dateA = a.currentPeriodEnd ? new Date(a.currentPeriodEnd).getTime() : 0;
            const dateB = b.currentPeriodEnd ? new Date(b.currentPeriodEnd).getTime() : 0;
            return dateB - dateA; // Most recent first
          });
        setSubscriptionHistory(history);
      }
    } catch (error) {
      console.error('Error fetching subscription history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' }> = {
      'active': { label: t('subscription.active'), variant: 'default' },
      'expired': { label: t('subscription.expired'), variant: 'destructive' },
      'cancelled': { label: t('subscription.cancelled') || 'Cancelled', variant: 'outline' },
      'trial': { label: t('subscription.trial') || 'Trial', variant: 'outline' }
    };
    const config = statusConfig[status?.toLowerCase()] || { label: status, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-center">
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

          {/* Subscription History Modal */}
          <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t('subscription.historyTitle') || 'Subscription History'}
                </DialogTitle>
                <DialogDescription>
                  {t('subscription.historyDescription') || 'View your past subscription plans and billing history'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {historyLoading ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 mx-auto text-gray-400 animate-spin" />
                    <p className="text-gray-600 mt-2">{t('subscription.loading')}</p>
                  </div>
                ) : subscriptionHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">{t('subscription.noHistory') || 'No subscription history found.'}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('subscription.plan') || 'Plan'}</TableHead>
                        <TableHead>{t('subscription.status') || 'Status'}</TableHead>
                        <TableHead>{t('subscription.amount') || 'Amount'}</TableHead>
                        <TableHead>{t('subscription.periodStart') || 'Period Start'}</TableHead>
                        <TableHead>{t('subscription.periodEnd') || 'Period End'}</TableHead>
                        <TableHead>{t('subscription.interval') || 'Interval'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptionHistory.map((sub: Subscription) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            {sub.plan?.name || 'Unknown Plan'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(sub.status)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(sub.amount, sub.plan?.currency || 'USD')}
                          </TableCell>
                          <TableCell>
                            {formatDate(sub.currentPeriodStart)}
                          </TableCell>
                          <TableCell>
                            {formatDate(sub.currentPeriodEnd)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {sub.billingInterval || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
