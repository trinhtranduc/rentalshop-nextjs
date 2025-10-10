'use client';

import React, { useState, useEffect } from 'react';
import { SubscriptionActivityTimeline } from './SubscriptionActivityTimeline';
import { subscriptionsApi } from '@rentalshop/utils';

interface SubscriptionHistoryDialogProps {
  subscriptionId?: number;
  merchantId: number;
}

export function SubscriptionHistoryDialog({ 
  subscriptionId, 
  merchantId 
}: SubscriptionHistoryDialogProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    if (!subscriptionId) return;
    
    setLoading(true);
    try {
      const [activitiesResponse, paymentsResponse] = await Promise.all([
        subscriptionsApi.getActivities(subscriptionId, 50),
        subscriptionsApi.getPayments(subscriptionId, 50)
      ]);

      if (activitiesResponse.success && activitiesResponse.data) {
        setActivities(activitiesResponse.data);
      }

      if (paymentsResponse.success && paymentsResponse.data) {
        setPayments(paymentsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching subscription history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subscriptionId) {
      fetchHistory();
    }
  }, [subscriptionId]);

  if (!subscriptionId) {
    return (
      <div className="text-center py-8 text-gray-500">
        No subscription found
      </div>
    );
  }

  return (
    <SubscriptionActivityTimeline
      activities={activities}
      payments={payments}
      loading={loading}
      onExport={() => {
        console.log('Export subscription history');
      }}
    />
  );
}
