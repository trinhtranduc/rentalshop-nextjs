// ============================================================================
// SUBSCRIPTION MANAGEMENT PAGE - ADMIN APP
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { SubscriptionList } from '@rentalshop/ui';
import { getAuthToken } from '@rentalshop/utils';
import type { Subscription, Plan, Merchant, SubscriptionUpdateInput } from '@rentalshop/types';

export default function AdminSubscriptionPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch subscriptions
        const subscriptionsResponse = await fetch('/api/subscriptions', {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        });
        const subscriptionsData = await subscriptionsResponse.json();
        
        if (subscriptionsData.success) {
          setSubscriptions(subscriptionsData.data.subscriptions || []);
        }

        // Fetch plans
        const plansResponse = await fetch('/api/plans', {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        });
        const plansData = await plansResponse.json();
        
        if (plansData.success) {
          setPlans(plansData.data.plans || []);
        }

        // Fetch merchants
        const merchantsResponse = await fetch('/api/merchants', {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        });
        const merchantsData = await merchantsResponse.json();
        
        if (merchantsData.success) {
          setMerchants(merchantsData.data.merchants || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Event handlers
  const handleView = (subscription: Subscription) => {
    console.log('View subscription:', subscription);
  };

  const handleEdit = async (data: SubscriptionUpdateInput) => {
    try {
      console.log('Edit subscription:', data);
      
      // Here you would make an API call to update the subscription
      const response = await fetch(`/api/subscriptions/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        // Refresh the subscriptions list
        const subscriptionsResponse = await fetch('/api/subscriptions', {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        });
        const subscriptionsData = await subscriptionsResponse.json();
        
        if (subscriptionsData.success) {
          setSubscriptions(subscriptionsData.data.subscriptions || []);
        }
      }
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  };

  const handleDelete = (subscription: Subscription) => {
    console.log('Delete subscription:', subscription);
  };

  const handleExtend = (subscription: Subscription) => {
    console.log('Extend subscription:', subscription);
  };

  const handleCancel = (subscription: Subscription, reason: string) => {
    console.log('Cancel subscription:', subscription, 'reason:', reason);
  };

  const handleSuspend = (subscription: Subscription, reason: string) => {
    console.log('Suspend subscription:', subscription, 'reason:', reason);
  };

  const handleReactivate = (subscription: Subscription) => {
    console.log('Reactivate subscription:', subscription);
  };

  const handleChangePlan = (subscription: Subscription, newPlanId: number, period: 1 | 3 | 12) => {
    console.log('Change plan:', subscription, 'newPlanId:', newPlanId, 'period:', period);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="mt-2 text-gray-600">
            Manage all subscriptions, view details, and make changes
          </p>
        </div>

        <SubscriptionList
          subscriptions={subscriptions}
          plans={plans}
          merchants={merchants}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onExtend={handleExtend}
          onCancel={handleCancel}
          onSuspend={handleSuspend}
          onReactivate={handleReactivate}
          onChangePlan={handleChangePlan}
          loading={loading}
        />
      </div>
    </div>
  );
}
