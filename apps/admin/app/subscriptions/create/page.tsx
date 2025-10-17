'use client'

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
import type { SubscriptionCreateInput, Plan, Merchant } from '@rentalshop/types';

export default function CreateSubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      
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
  }, []);

  const handleSubmit = async (data: SubscriptionCreateInput) => {
    try {
      setSubmitting(true);
      
      const result = await subscriptionsApi.create(data);

      if (result.success && result.data) {
        // Redirect to subscription detail page
        window.location.href = `/admin/subscriptions/${result.data.id}`;
      } else {
        alert(`Error creating subscription: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Error creating subscription. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    window.location.href = '/admin/subscriptions';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <PageTitle>Create Subscription</PageTitle>
        </div>
      </PageHeader>

      <PageContent>
        <div className="max-w-4xl">
          <SubscriptionForm
            plans={plans}
            merchants={merchants}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={submitting}
            mode="create"
            title="Create New Subscription"
            submitText="Create Subscription"
          />
        </div>
      </PageContent>
    </PageWrapper>
  );
}
