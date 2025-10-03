'use client'

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge
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
  Clock
} from 'lucide-react';

interface Subscription {
  id: number;
  planId: number;
  status: string;
  amount: number;
  currency: string;
  interval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  plan?: {
    id: number;
    name: string;
    description: string;
  };
}

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
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    if (subscription && showTimeline) {
      fetchHistory();
    }
  }, [subscription, showTimeline]);

  const fetchHistory = async () => {
    if (!subscription) return;

    try {
      setLoadingHistory(true);

      // Fetch activities
      const activitiesResponse = await fetch(
        `/api/subscriptions/${subscription.id}/activities?limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        if (activitiesData.success) {
          setActivities(activitiesData.data || []);
        }
      }

      // Fetch payments
      const paymentsResponse = await fetch(
        `/api/subscriptions/${subscription.id}/payments?limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        if (paymentsData.success) {
          setPayments(paymentsData.data || []);
        }
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
    <div className="space-y-4">
      {/* Activity Timeline Toggle Button */}
      <Button
        variant="outline"
        onClick={() => setShowTimeline(!showTimeline)}
        className="w-full"
      >
        <Clock className="w-4 h-4 mr-2" />
        {showTimeline ? 'Hide' : 'Show'} Subscription Activity & Payment History
        {showTimeline ? ' ▲' : ' ▼'}
      </Button>

      {/* Activity Timeline */}
      {showTimeline && (
        <SubscriptionActivityTimeline
          activities={activities}
          payments={payments}
          loading={loadingHistory}
          onExport={() => {
            console.log('Export timeline');
          }}
        />
      )}
    </div>
  );
}

