'use client'

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

// Disable prerendering to avoid module resolution issues

import React, { useState, useEffect } from 'react';
import { subscriptionsApi } from '@rentalshop/utils';
import { 
  SubscriptionForm,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button
} from '@rentalshop/ui';
import { 
  ArrowLeft,
  Save,
  X
} from 'lucide-react';
import type { SubscriptionUpdateInput, Subscription, Plan, Merchant } from '@rentalshop/types';

interface EditSubscriptionPageProps {
  params: {
    id: string;
  };
}

export default function EditSubscriptionPage({ params }: EditSubscriptionPageProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subscription
      const subscriptionResult = await subscriptionsApi.getById(parseInt(params.id));
      if (subscriptionResult.success && subscriptionResult.data) {
        setSubscription(subscriptionResult.data);
      }

      // Fetch plans
      const plansResult = await subscriptionsApi.getPlans();
      if (plansResult.success && plansResult.data) {
        setPlans(plansResult.data.plans || []);
      }

      // Fetch merchants
      const merchantsResult = await subscriptionsApi.getMerchants();
      if (merchantsResult.success && merchantsResult.data) {
        setMerchants(merchantsResult.data.merchants || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleSubmit = async (data: SubscriptionUpdateInput) => {
    try {
      setSubmitting(true);
      
      const result = await subscriptionsApi.update(parseInt(params.id), data);

      if (result.success) {
        // Redirect to subscription detail page
        window.location.href = `/admin/subscriptions/${params.id}`;
      } else {
        alert(`Error updating subscription: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Error updating subscription. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    window.location.href = `/admin/subscriptions/${params.id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Subscription Not Found</h2>
        <p className="text-gray-600 mt-2">The subscription you're trying to edit doesn't exist.</p>
        <Button 
          onClick={() => window.location.href = '/admin/subscriptions'}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Subscriptions
        </Button>
      </div>
    );
  }

  // Convert subscription to form data
  const initialData = {
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    planVariantId: subscription.planVariantId,
    status: subscription.status as 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'SUSPENDED',
    startDate: new Date(subscription.startDate),
    endDate: subscription.endDate ? new Date(subscription.endDate) : undefined,
    nextBillingDate: new Date(subscription.nextBillingDate),
    amount: subscription.amount,
    currency: subscription.currency,
    autoRenew: subscription.autoRenew,
    changeReason: subscription.changeReason || ''
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Subscription</h1>
            <p className="text-gray-600">Update subscription #{subscription.id}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl">
        <SubscriptionForm
          initialData={initialData}
          plans={plans}
          merchants={merchants}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={submitting}
          mode="edit"
          title="Edit Subscription"
          submitText="Update Subscription"
        />
      </div>
    </div>
  );
}
