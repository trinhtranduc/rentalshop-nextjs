'use client'

import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button
} from '../../../ui';
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
  User,
  Download,
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
        type: payment.type, // Keep payment type from API
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
        return 'text-blue-600 bg-blue-100';
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
        return 'text-blue-600 bg-blue-100';
      case 'TRIAL_ENDED':
        return 'text-yellow-600 bg-yellow-100';
      case 'DISCOUNT_APPLIED':
        return 'text-green-600 bg-green-100';
      case 'REFUND_PROCESSED':
        return 'text-orange-600 bg-orange-100';
      case 'INVOICE_GENERATED':
        return 'text-indigo-600 bg-indigo-100';
      case 'REMINDER_SENT':
        return 'text-blue-600 bg-blue-100';
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

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      COMPLETED: { variant: 'success', label: 'Paid' },
      PENDING: { variant: 'warning', label: 'Pending' },
      FAILED: { variant: 'danger', label: 'Failed' }
    };

    const config = statusMap[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Loading activity history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>📊 Subscription Activity & Payment History</CardTitle>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {timeline.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No activity yet</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-6">
              {timeline.map((item, index) => {
                if (item.itemType === 'activity') {
                  const Icon = getActivityIcon(item.type);
                  const colorClass = getActivityColor(item.type);

                  return (
                    <div key={`activity-${item.id}-${index}`} className="relative pl-14">
                      {/* Icon */}
                      <div className={`absolute left-3 w-6 h-6 rounded-full ${colorClass} flex items-center justify-center`}>
                        <Icon className="w-3 h-3" />
                      </div>

                      {/* Content */}
                      <div className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">
                                {item.description}
                              </h4>
                              {/* Activity type badge */}
                              <Badge 
                                variant={
                                  item.metadata?.severity === 'error' ? 'destructive' :
                                  item.metadata?.severity === 'warning' ? 'warning' :
                                  item.metadata?.severity === 'success' ? 'success' :
                                  'secondary'
                                }
                              >
                                {item.type?.replace(/_/g, ' ').toUpperCase()}
                              </Badge>
                            </div>
                            
                            {/* User info from metadata */}
                            {item.metadata?.performedBy && (
                              <p className="text-sm text-gray-600 mb-2">
                                <User className="w-3 h-3 inline mr-1" />
                                By: {item.metadata.performedBy.name} ({item.metadata.performedBy.email})
                                <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                                  {item.metadata.performedBy.role}
                                </span>
                              </p>
                            )}

                            {/* Enhanced metadata details */}
                            {item.metadata && (
                              <div className="text-sm text-gray-700 space-y-1 mt-2">
                                {/* Plan information */}
                                {item.metadata.planName && (
                                  <div>• Plan: <span className="font-medium">{item.metadata.planName}</span></div>
                                )}
                                
                                {/* Amount information */}
                                {item.metadata.amount !== undefined && (
                                  <div>• Amount: <span className="font-semibold">{formatCurrency(item.metadata.amount, item.metadata.currency || 'USD')}</span></div>
                                )}
                                
                                {/* Status information */}
                                {item.metadata.status && (
                                  <div>• Status: <span className="font-medium capitalize">{item.metadata.status.toLowerCase()}</span></div>
                                )}
                                
                                {/* Payment method */}
                                {item.metadata.paymentMethod && (
                                  <div>• Method: <span className="capitalize">{item.metadata.paymentMethod.toLowerCase()}</span></div>
                                )}
                                
                                {/* Transaction ID */}
                                {item.metadata.transactionId && (
                                  <div>• Transaction: <span className="font-mono text-xs">{item.metadata.transactionId}</span></div>
                                )}
                                
                                {/* Invoice number */}
                                {item.metadata.invoiceNumber && (
                                  <div>• Invoice: <span className="font-mono text-xs">{item.metadata.invoiceNumber}</span></div>
                                )}
                                
                                {/* Plan changes */}
                                {item.metadata.newPlan && (
                                  <div>• New Plan: <span className="font-medium">{item.metadata.newPlan.name} ({formatCurrency(item.metadata.newPlan.amount, item.metadata.currency || 'USD')})</span></div>
                                )}
                                
                                {/* Previous plan */}
                                {item.metadata.previousPlan && (
                                  <div>• Previous: <span className="text-gray-500">{item.metadata.previousPlan.name} ({formatCurrency(item.metadata.previousPlan.amount, item.metadata.currency || 'USD')})</span></div>
                                )}
                                
                                {/* Effective date */}
                                {item.metadata.effectiveDate && (
                                  <div>• Effective: <span className="font-medium">{formatDate(item.metadata.effectiveDate, 'MMM dd, yyyy')}</span></div>
                                )}
                                
                                {/* Next billing date */}
                                {item.metadata.nextBillingDate && (
                                  <div>• Next Billing: <span className="font-medium">{formatDate(item.metadata.nextBillingDate, 'MMM dd, yyyy')}</span></div>
                                )}
                                
                                {/* Trial end date */}
                                {item.metadata.trialEndDate && (
                                  <div>• Trial Ends: <span className="font-medium">{formatDate(item.metadata.trialEndDate, 'MMM dd, yyyy')}</span></div>
                                )}
                                
                                {/* Reason */}
                                {item.metadata.reason && (
                                  <div>• Reason: <span className="italic text-gray-600">{item.metadata.reason}</span></div>
                                )}
                                
                                {/* Source */}
                                {item.metadata.source && (
                                  <div>• Source: <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{item.metadata.source.replace(/_/g, ' ').toUpperCase()}</span></div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="text-right text-sm text-gray-500 ml-4">
                            {formatDate(item.timestamp, 'MMM dd, yyyy')}
                            <br />
                            {formatDate(item.timestamp, 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Payment item
                  return (
                    <div key={`payment-${item.id}-${index}`} className="relative pl-14">
                      {/* Icon */}
                      <div className="absolute left-3 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <CreditCard className="w-3 h-3" />
                      </div>

                      {/* Content */}
                      <div className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">
                                💰 Payment Received
                              </h4>
                              {getPaymentStatusBadge(item.status)}
                            </div>
                            
                            <div className="text-sm text-gray-700 space-y-1">
                              <div>• Amount: <span className="font-semibold">{formatCurrency(item.amount, item.currency)}</span></div>
                              {item.method && <div>• Method: <span className="capitalize">{item.method.toLowerCase()}</span></div>}
                              {item.transactionId && <div>• Transaction: <span className="font-mono text-xs">{item.transactionId}</span></div>}
                              {item.description && (
                                <div className="text-gray-600 mt-2">{item.description}</div>
                              )}
                            </div>
                          </div>

                          <div className="text-right text-sm text-gray-500 ml-4">
                            {formatDate(item.timestamp, 'MMM dd, yyyy')}
                            <br />
                            {formatDate(item.timestamp, 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

