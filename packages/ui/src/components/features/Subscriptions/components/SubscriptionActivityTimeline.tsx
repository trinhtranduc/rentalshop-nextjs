'use client'

import React from 'react';
import { formatDate, formatCurrency } from '@rentalshop/utils';
import { 
  Clock,
  TrendingUp,
  TrendingDown,
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
  type: string; // 'subscription_created' | 'plan_changed' | 'subscription_paused' | etc.
  description: string;
  timestamp: string;
  metadata?: {
    planId?: number;
    planName?: string;
    status?: string;
    amount?: number;
    currency?: string;
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
}

export function SubscriptionActivityTimeline({
  activities,
  payments,
  loading = false,
  onExport
}: SubscriptionActivityTimelineProps) {
  
  // Merge activities and payments into timeline
  const timeline = React.useMemo(() => {
    const items: any[] = [];

    // Add activities (already have timestamp as string)
    activities.forEach(activity => {
      items.push({
        itemType: 'activity',
        ...activity,
        timestamp: new Date(activity.timestamp)
      });
    });

    // Add payments
    payments.forEach(payment => {
      items.push({
        itemType: 'payment',
        ...payment,
        type: 'PAYMENT_RECEIVED', // Default type for payments
        timestamp: new Date(payment.createdAt)
      });
    });

    // Sort by timestamp (newest first)
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities, payments]);

  const getActivityIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'PLAN_CHANGED':
      case 'PLAN_UPGRADED':
      case 'PLAN_DOWNGRADED':
        return TrendingUp;
      case 'SUBSCRIPTION_ACTIVATED':
      case 'BILLING_CYCLE_RENEWED':
        return RefreshCw;
      case 'SUBSCRIPTION_CANCELLED':
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
      case 'RENEWAL':
      case 'RENEW':
        return 'text-green-600 bg-green-100';
      case 'SUBSCRIPTION_CANCELLED':
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
        <p className="mt-4 text-gray-600">Loading activity history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeline.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {timeline.map((item, index) => {
            if (item.itemType === 'activity') {
              const Icon = getActivityIcon(item.type);
              const colorClass = getActivityColor(item.type);

              return (
                <div key={`activity-${item.id}-${index}`} className="flex items-start gap-3 p-3 border rounded-lg bg-white">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {item.description}
                      </h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(item.timestamp, 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    
                    {/* Only show essential info */}
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
                  </div>
                </div>
              );
            } else {
              // Payment item - simplified
              return (
                <div key={`payment-${item.id}-${index}`} className="flex items-start gap-3 p-3 border rounded-lg bg-white">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 text-sm">
                        Payment {item.status === 'COMPLETED' ? 'Received' : item.status}
                      </h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(item.timestamp, 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold">{formatCurrency(item.amount, item.currency)}</span>
                      {item.method && (
                        <span className="ml-2">• {item.method}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}

