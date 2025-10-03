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
  Download
} from 'lucide-react';

interface SubscriptionActivity {
  id: number;
  action: string; // 'PLAN_CHANGE' | 'RENEWAL' | 'CANCEL' | 'PAUSE' | 'RESUME' | 'CREATE'
  description: string;
  details?: string;
  oldValues?: any;
  newValues?: any;
  changes?: any;
  userId?: number;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  createdAt: Date;
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

    // Add activities
    activities.forEach(activity => {
      items.push({
        type: 'activity',
        ...activity,
        timestamp: new Date(activity.createdAt)
      });
    });

    // Add payments
    payments.forEach(payment => {
      items.push({
        type: 'payment',
        ...payment,
        timestamp: new Date(payment.createdAt)
      });
    });

    // Sort by timestamp (newest first)
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities, payments]);

  const getActivityIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'PLAN_CHANGE':
      case 'UPDATE':
        return TrendingUp;
      case 'RENEWAL':
      case 'RENEW':
        return RefreshCw;
      case 'CANCEL':
      case 'CANCELLATION':
        return XCircle;
      case 'PAUSE':
        return Pause;
      case 'RESUME':
        return Play;
      case 'CREATE':
        return CreditCard;
      default:
        return Clock;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'PLAN_CHANGE':
      case 'UPDATE':
        return 'text-blue-600 bg-blue-100';
      case 'RENEWAL':
      case 'RENEW':
        return 'text-green-600 bg-green-100';
      case 'CANCEL':
      case 'CANCELLATION':
        return 'text-red-600 bg-red-100';
      case 'PAUSE':
        return 'text-orange-600 bg-orange-100';
      case 'RESUME':
        return 'text-purple-600 bg-purple-100';
      case 'CREATE':
        return 'text-indigo-600 bg-indigo-100';
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
                if (item.type === 'activity') {
                  const Icon = getActivityIcon(item.action);
                  const colorClass = getActivityColor(item.action);

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
                              {item.action === 'PLAN_CHANGE' && item.changes?.plan && (
                                <Badge variant="primary">
                                  {item.changes.plan.old} → {item.changes.plan.new}
                                </Badge>
                              )}
                            </div>
                            
                            {/* User info */}
                            {item.user && (
                              <p className="text-sm text-gray-600 mb-2">
                                <User className="w-3 h-3 inline mr-1" />
                                By: {item.user.firstName} {item.user.lastName} ({item.user.email})
                                <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                                  {item.user.role}
                                </span>
                              </p>
                            )}

                            {/* Changes details */}
                            {item.changes && Object.keys(item.changes).length > 0 && (
                              <div className="text-sm text-gray-700 space-y-1 mt-2">
                                {item.changes.plan && (
                                  <div>• Plan: <span className="line-through text-gray-400">{item.changes.plan.old}</span> → <span className="font-medium">{item.changes.plan.new}</span></div>
                                )}
                                {item.changes.amount && (
                                  <div>• Amount: <span className="line-through text-gray-400">${item.changes.amount.old}</span> → <span className="font-medium">${item.changes.amount.new}</span></div>
                                )}
                                {item.changes.status && (
                                  <div>• Status: <span className="line-through text-gray-400">{item.changes.status.old}</span> → <span className="font-medium">{item.changes.status.new}</span></div>
                                )}
                                {item.changes.currentPeriodEnd && (
                                  <div>• Period End: <span className="line-through text-gray-400">{formatDate(new Date(item.changes.currentPeriodEnd.old), 'MMM dd, yyyy')}</span> → <span className="font-medium">{formatDate(new Date(item.changes.currentPeriodEnd.new), 'MMM dd, yyyy')}</span></div>
                                )}
                              </div>
                            )}

                            {/* Additional details from JSON */}
                            {item.details && typeof item.details === 'string' && (
                              <div className="text-sm text-gray-600 mt-2">
                                {item.details}
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
                              <div>• Method: <span className="capitalize">{item.method.toLowerCase()}</span></div>
                              <div>• Transaction: <span className="font-mono text-xs">{item.transactionId}</span></div>
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

