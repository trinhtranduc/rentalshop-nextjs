'use client'

import React from 'react';
import { formatDate, formatCurrency } from '@rentalshop/utils';
import { useSubscriptionTranslations } from '@rentalshop/hooks';
import { 
  Clock,
  TrendingUp,
  RefreshCw,
  XCircle,
  Pause,
  Play,
  CreditCard,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  Percent,
  RotateCcw,
  FileText,
  Bell
} from 'lucide-react';

interface SubscriptionActivity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
  metadata?: {
    planId?: number;
    planName?: string;
    status?: string;
    amount?: number;
    currency?: string;
    productId?: string;
    store?: string;
    performedBy?: {
      userId: number;
      email: string;
      role: string;
      name?: string;
    };
    previousPlan?: {
      id: number;
      name: string;
      amount: number;
    };
    newPlan?: {
      id: number;
      name: string;
      amount: number;
    };
    paymentMethod?: string;
    transactionId?: string;
    invoiceNumber?: string;
    effectiveDate?: string;
    nextBillingDate?: string;
    trialEndDate?: string;
    reason?: string;
    source?: string;
    severity?: 'info' | 'warning' | 'error' | 'success';
    category?: 'billing' | 'plan' | 'payment' | 'system' | 'user';
  };
}

interface Payment {
  id: number;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string;
  description?: string;
  createdAt: Date;
}

interface SubscriptionActivityTimelineProps {
  activities: SubscriptionActivity[];
  payments: Payment[];
  loading?: boolean;
  onExport?: () => void;
  /**
   * Merchant / end-user view: plain language only (no product ids, SDK names, enums).
   * Admin can pass false to keep raw descriptions when debugging.
   */
  userFacing?: boolean;
}

type TranslateFn = (key: string) => string;

function detectPlanMonths(activity: SubscriptionActivity): 6 | 12 | null {
  const haystack = [
    activity.metadata?.productId,
    activity.description,
    (activity.metadata as any)?.interval,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Check 6-month first — "semi_annual" also contains "annual"
  if (
    haystack.includes('semi_annual') ||
    haystack.includes('semiannual') ||
    haystack.includes('6_month') ||
    haystack.includes('6-month') ||
    haystack.includes('6 months')
  ) {
    return 6;
  }
  if (
    haystack.includes('annual') ||
    haystack.includes('12_month') ||
    haystack.includes('12-month') ||
    haystack.includes('12 months')
  ) {
    return 12;
  }
  return null;
}

function friendlyActivityTitle(
  activity: SubscriptionActivity,
  t: TranslateFn,
): string {
  const type = (activity.type || '').toUpperCase();
  const months = detectPlanMonths(activity);
  const isRenew =
    type.includes('RENEW') ||
    type === 'BILLING_CYCLE_RENEWED' ||
    /renewal/i.test(activity.description || '');
  const isInitial =
    type.includes('INITIAL') ||
    type.includes('CREATED') ||
    type === 'SUBSCRIPTION_ACTIVATED' ||
    /initial purchase|subscribed/i.test(activity.description || '');

  if (isRenew) {
    if (months === 6) return t('page.activityRenewed6m');
    if (months === 12) return t('page.activityRenewed12m');
    return t('page.activityRenewed');
  }
  if (isInitial) {
    if (months === 6) return t('page.activitySubscribed6m');
    if (months === 12) return t('page.activitySubscribed12m');
    return t('page.activitySubscribed');
  }

  switch (type) {
    case 'PLAN_CHANGED':
    case 'PLAN_UPGRADED':
    case 'PLAN_DOWNGRADED':
      return t('page.activityPlanChanged');
    case 'SUBSCRIPTION_CANCELLED':
    case 'IAP_CANCELLATION':
    case 'CANCEL':
    case 'CANCELLATION':
      return t('page.activityCancelled');
    case 'SUBSCRIPTION_PAUSED':
    case 'PAUSE':
      return t('page.activityPaused');
    case 'SUBSCRIPTION_RESUMED':
    case 'RESUME':
      return t('page.activityResumed');
    case 'SUBSCRIPTION_EXPIRED':
    case 'IAP_EXPIRATION':
      return t('page.activityExpired');
    case 'SUBSCRIPTION_CREATED':
    case 'CREATE':
      return t('page.activityCreated');
    default:
      // Strip technical leftovers from legacy rows if type is unknown
      const raw = activity.description || '';
      if (/revenuecat|anyrent_merchant_|product_id|iap_/i.test(raw)) {
        return t('page.activityGeneric');
      }
      return raw || t('page.activityGeneric');
  }
}

function friendlyPaymentTitle(status: string, t: TranslateFn): string {
  switch ((status || '').toUpperCase()) {
    case 'COMPLETED':
    case 'SUCCESS':
    case 'PAID':
      return t('page.paymentSuccess');
    case 'FAILED':
    case 'DECLINED':
      return t('page.paymentFailed');
    case 'PENDING':
    case 'PROCESSING':
      return t('page.paymentPending');
    default:
      return t('page.paymentSuccess');
  }
}

function friendlyPaymentMethod(method: string, t: TranslateFn): string | null {
  switch ((method || '').toUpperCase()) {
    case 'IAP_APPLE':
    case 'APP_STORE':
    case 'APPLE':
      return t('page.methodAppStore');
    case 'IAP_GOOGLE':
    case 'PLAY_STORE':
    case 'GOOGLE':
      return t('page.methodGooglePlay');
    case 'TRANSFER':
    case 'BANK_TRANSFER':
      return t('page.methodBankTransfer');
    case 'STRIPE':
    case 'CREDIT_CARD':
    case 'CARD':
      return t('page.methodCard');
    case 'MANUAL':
      // Legacy IAP rows were stored as MANUAL — avoid showing "MANUAL" to users
      return null;
    default:
      return method ? method.replace(/_/g, ' ') : null;
  }
}

/** Internal noise — never show on merchant history. */
function isInternalActivity(type: string): boolean {
  const t = (type || '').toUpperCase();
  return t === 'IAP_EXPIRATION_IGNORED' || t.includes('_IGNORED');
}

export function SubscriptionActivityTimeline({
  activities,
  payments,
  loading = false,
  userFacing = false,
}: SubscriptionActivityTimelineProps) {
  const t = useSubscriptionTranslations();

  const timeline = React.useMemo(() => {
    const items: any[] = [];

    activities.forEach((activity) => {
      if (userFacing && isInternalActivity(activity.type)) return;
      items.push({
        itemType: 'activity',
        ...activity,
        timestamp: new Date(activity.timestamp),
      });
    });

    payments.forEach((payment) => {
      items.push({
        itemType: 'payment',
        ...payment,
        type: 'PAYMENT_RECEIVED',
        timestamp: new Date(payment.createdAt),
      });
    });

    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities, payments, userFacing]);

  const getActivityIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'PLAN_CHANGED':
      case 'PLAN_UPGRADED':
      case 'PLAN_DOWNGRADED':
        return TrendingUp;
      case 'SUBSCRIPTION_ACTIVATED':
      case 'BILLING_CYCLE_RENEWED':
      case 'IAP_RENEWAL':
      case 'RENEWAL':
      case 'RENEW':
        return RefreshCw;
      case 'SUBSCRIPTION_CANCELLED':
      case 'IAP_CANCELLATION':
      case 'CANCEL':
      case 'CANCELLATION':
        return XCircle;
      case 'SUBSCRIPTION_PAUSED':
      case 'PAUSE':
        return Pause;
      case 'SUBSCRIPTION_RESUMED':
      case 'RESUME':
        return Play;
      case 'SUBSCRIPTION_CREATED':
      case 'IAP_INITIAL_PURCHASE':
      case 'CREATE':
        return CreditCard;
      case 'PAYMENT_RECEIVED':
        return DollarSign;
      case 'PAYMENT_FAILED':
        return AlertCircle;
      case 'TRIAL_STARTED':
        return Clock;
      case 'TRIAL_ENDED':
        return AlertTriangle;
      case 'DISCOUNT_APPLIED':
        return Percent;
      case 'REFUND_PROCESSED':
        return RotateCcw;
      case 'INVOICE_GENERATED':
        return FileText;
      case 'REMINDER_SENT':
        return Bell;
      case 'DUNNING_STARTED':
        return AlertTriangle;
      case 'SUBSCRIPTION_EXPIRED':
      case 'IAP_EXPIRATION':
        return AlertCircle;
      case 'SUBSCRIPTION_REACTIVATED':
        return Play;
      default:
        return Clock;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'PLAN_CHANGED':
      case 'PLAN_UPGRADED':
      case 'PLAN_DOWNGRADED':
        return 'text-blue-700 bg-blue-100';
      case 'SUBSCRIPTION_ACTIVATED':
      case 'BILLING_CYCLE_RENEWED':
      case 'IAP_RENEWAL':
      case 'RENEWAL':
      case 'RENEW':
      case 'IAP_INITIAL_PURCHASE':
        return 'text-green-600 bg-green-100';
      case 'SUBSCRIPTION_CANCELLED':
      case 'IAP_CANCELLATION':
      case 'CANCEL':
      case 'CANCELLATION':
        return 'text-red-600 bg-red-100';
      case 'SUBSCRIPTION_PAUSED':
      case 'PAUSE':
        return 'text-orange-600 bg-orange-100';
      case 'SUBSCRIPTION_RESUMED':
      case 'RESUME':
        return 'text-purple-600 bg-purple-100';
      case 'SUBSCRIPTION_CREATED':
      case 'CREATE':
        return 'text-indigo-600 bg-indigo-100';
      case 'PAYMENT_RECEIVED':
        return 'text-green-600 bg-green-100';
      case 'PAYMENT_FAILED':
        return 'text-red-600 bg-red-100';
      case 'TRIAL_STARTED':
        return 'text-blue-700 bg-blue-100';
      case 'TRIAL_ENDED':
        return 'text-yellow-600 bg-yellow-100';
      case 'DISCOUNT_APPLIED':
        return 'text-green-600 bg-green-100';
      case 'REFUND_PROCESSED':
        return 'text-orange-600 bg-orange-100';
      case 'INVOICE_GENERATED':
        return 'text-indigo-600 bg-indigo-100';
      case 'REMINDER_SENT':
        return 'text-blue-700 bg-blue-100';
      case 'DUNNING_STARTED':
        return 'text-red-600 bg-red-100';
      case 'SUBSCRIPTION_EXPIRED':
      case 'IAP_EXPIRATION':
        return 'text-red-600 bg-red-100';
      case 'SUBSCRIPTION_REACTIVATED':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-gray-600">
          {userFacing ? t('page.historyLoadingFriendly') : 'Loading activity history...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeline.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {userFacing ? t('page.historyEmptyFriendly') : 'No activity yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {timeline.map((item, index) => {
            if (item.itemType === 'activity') {
              const Icon = getActivityIcon(item.type);
              const colorClass = getActivityColor(item.type);
              const title = userFacing
                ? friendlyActivityTitle(item, t)
                : item.description;

              return (
                <div key={`activity-${item.id}-${index}`} className="flex items-start gap-3 p-3 border rounded-lg bg-white">
                  <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {title}
                      </h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(item.timestamp, 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>

                    {!userFacing && (
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {item.metadata?.planName && (
                          <span>Plan: {item.metadata.planName}</span>
                        )}
                        {item.metadata?.amount !== undefined && (
                          <span className="ml-2">
                            • {formatCurrency(item.metadata.amount, item.metadata.currency || 'USD')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            const methodLabel = friendlyPaymentMethod(item.method, t);
            const paymentTitle = userFacing
              ? friendlyPaymentTitle(item.status, t)
              : `Payment ${item.status === 'COMPLETED' ? 'Received' : item.status}`;

            return (
              <div key={`payment-${item.id}-${index}`} className="flex items-start gap-3 p-3 border rounded-lg bg-white">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {paymentTitle}
                    </h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(item.timestamp, 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600">
                    <span className="font-semibold">{formatCurrency(item.amount, item.currency)}</span>
                    {methodLabel && (
                      <span className="ml-2">• {methodLabel}</span>
                    )}
                    {!userFacing && item.method && !methodLabel && (
                      <span className="ml-2">• {item.method}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
