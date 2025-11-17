'use client'

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../ui';
import { SubscriptionActivityTimeline } from '../../Subscriptions';
import { formatDate, formatCurrency } from '@rentalshop/utils';
import { 
  CreditCard,
  Calendar,
  TrendingUp,
  RefreshCw,
  Pause,
  Play,
  XCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  History
} from 'lucide-react';
import type { Subscription } from '@rentalshop/types';

interface MerchantSubscriptionSectionProps {
  merchantId: number;
  subscription: Subscription | null;
  loading?: boolean;
}

export function MerchantSubscriptionSection({
  merchantId,
  subscription,
  loading = false
}: MerchantSubscriptionSectionProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  useEffect(() => {
    if (subscription && showHistoryDialog) {
      fetchHistory();
    }
  }, [subscription, showHistoryDialog]);

  const fetchHistory = async () => {
    if (!subscription) return;

    try {
      setLoadingHistory(true);

      // Use standardized subscriptionsApi
      const { subscriptionsApi } = await import('@rentalshop/utils');

      // Fetch activities using standardized API
      try {
        const activitiesResult = await subscriptionsApi.getActivities(subscription.id, 20);
        if (activitiesResult.success && activitiesResult.data) {
          setActivities(activitiesResult.data || []);
        }
      } catch (err) {
        console.log('Activities not yet implemented or error:', err);
        setActivities([]);
      }

      // Fetch payments using standardized API
      try {
        const paymentsResult = await subscriptionsApi.getPayments(subscription.id, 20);
        if (paymentsResult.success && paymentsResult.data) {
          setPayments(paymentsResult.data || []);
        }
      } catch (err) {
        console.log('Payments not yet implemented or error:', err);
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string; icon: any }> = {
      active: { variant: 'success', label: 'Active', icon: CheckCircle },
      trial: { variant: 'warning', label: 'Trial', icon: Clock },
      past_due: { variant: 'danger', label: 'Past Due', icon: AlertCircle },
      paused: { variant: 'secondary', label: 'Paused', icon: Pause },
      cancelled: { variant: 'danger', label: 'Cancelled', icon: XCircle }
    };

    const config = statusMap[status] || { variant: 'default', label: status, icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getDaysRemaining = () => {
    if (!subscription || !subscription.currentPeriodEnd) return 0;
    
    try {
      const now = new Date();
      const end = new Date(subscription.currentPeriodEnd);
      
      // Check if date is valid
      if (isNaN(end.getTime())) return 0;
      
      const diff = end.getTime() - now.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Error calculating days remaining:', error);
      return 0;
    }
  };

  if (!subscription) {
    return null; // Don't show anything if no subscription
  }

  return (
    <>
      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              Subscription Activity & Payment History
            </DialogTitle>
            <DialogDescription>
              View detailed activity and payment history for this subscription
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <SubscriptionActivityTimeline
              activities={activities}
              payments={payments}
              loading={loadingHistory}
              onExport={() => {
                console.log('Export subscription history');
              }}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowHistoryDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

