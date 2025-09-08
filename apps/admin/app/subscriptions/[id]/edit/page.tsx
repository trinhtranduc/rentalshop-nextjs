'use client'

import React, { useState, useEffect } from 'react';
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
      const subscriptionResponse = await fetch(`/api/subscriptions/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const subscriptionData = await subscriptionResponse.json();
      
      if (subscriptionData.success) {
        setSubscription(subscriptionData.data.subscription);
      }

      // Fetch plans
      const plansResponse = await fetch('/api/plans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const plansData = await plansResponse.json();
      
      if (plansData.success) {
        setPlans(plansData.data.plans || []);
      }

      // Fetch merchants
      const merchantsResponse = await fetch('/api/merchants', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const merchantsData = await merchantsResponse.json();
      
      if (merchantsData.success) {
        setMerchants(merchantsData.data.merchants || []);
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
      
      const response = await fetch(`/api/subscriptions/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    trialEndDate: subscription.trialEndDate ? new Date(subscription.trialEndDate) : undefined,
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
