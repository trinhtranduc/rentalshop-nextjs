'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

// Disable prerendering to avoid module resolution issues

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  MerchantDetail,
  Breadcrumb,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button
} from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import { 
  merchantsApi,
  subscriptionsApi,
  plansApi
} from '@rentalshop/utils';
import { useAuth } from '@rentalshop/hooks';
import type { Merchant } from '@rentalshop/types';

export default function MerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;
  const { user } = useAuth();
  
  const [merchant, setMerchant] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMerchantDetails();
  }, [merchantId]);

  const fetchMerchantDetails = async () => {
    try {
      setLoading(true);
      
      // Use centralized API function
      const response = await merchantsApi.getMerchantDetail(Number(merchantId));
      
      if (response.success && response.data) {
        // The API returns data in the format: { merchant: {...}, stats: {...}, ... }
        setMerchant(response.data);
      } else {
        setError(response.message || 'Failed to fetch merchant details');
      }

      // Fetch real plans
      const plansResponse = await plansApi.getPlans();
      if (plansResponse.success && plansResponse.data) {
        setPlans(plansResponse.data.plans || []);
      }

    } catch (error) {
      console.error('Error fetching merchant details:', error);
      setError('Failed to fetch merchant details');
    } finally {
      setLoading(false);
    }
  };


  const handleMerchantAction = (action: string, merchantId: number) => {
    switch (action) {
      case 'edit':
        router.push(`/merchants/${merchantId}/edit`);
        break;
      default:
        console.log('Merchant action:', action, merchantId);
    }
  };

  const handleOutletAction = (action: string, outletId: number) => {
    console.log('Outlet action:', action, outletId);
    // Handle outlet actions
  };

  const handleUserAction = (action: string, userId: number) => {
    console.log('User action:', action, userId);
    // Handle user actions
  };

  const handleProductAction = (action: string, productId: number) => {
    console.log('Product action:', action, productId);
    // Handle product actions
  };

  const handleOrderAction = (action: string, orderId: number) => {
    console.log('Order action:', action, orderId);
    // Handle order actions
  };

  // Subscription action handlers
  const handlePlanChange = async (planData: {
    planId: number;
    planVariantId?: number;
    reason?: string;
    effectiveDate?: string;
    notifyMerchant?: boolean;
    billingInterval?: string;
    duration?: number;
    discount?: number;
    totalPrice?: number;
  }) => {
    try {
      console.log('🔍 Admin: Plan change data received:', planData);
      
      const response = await merchantsApi.updateMerchantPlan(Number(merchantId), {
        planId: planData.planId,
        reason: planData.reason,
        effectiveDate: planData.effectiveDate,
        notifyMerchant: planData.notifyMerchant,
        billingInterval: planData.billingInterval,
        duration: planData.duration,
        discount: planData.discount,
        totalPrice: planData.totalPrice
      });

      if (response.success) {
        console.log('Plan changed successfully');
        // Refresh merchant data
        fetchMerchantDetails();
      } else {
        console.error('Failed to change plan:', response.message);
      }
    } catch (error) {
      console.error('Error changing plan:', error);
    }
  };

  const handlePlanDisable = async (subscriptionId: number, reason: string) => {
    try {
      const response = await merchantsApi.disableMerchantPlan(Number(merchantId), subscriptionId, reason);

      if (response.success) {
        console.log('Plan disabled successfully');
        fetchMerchantDetails();
      } else {
        console.error('Failed to disable plan:', response.message);
      }
    } catch (error) {
      console.error('Error disabling plan:', error);
    }
  };

  const handlePlanDelete = async (subscriptionId: number, reason: string) => {
    try {
      const response = await merchantsApi.deleteMerchantPlan(Number(merchantId), subscriptionId, reason);

      if (response.success) {
        console.log('Plan deleted successfully');
        fetchMerchantDetails();
      } else {
        console.error('Failed to delete plan:', response.message);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const handleExtend = async (extendData: any) => {
    if (!extendData.paymentData) {
      // Old extend flow (fallback)
      console.log('Old extend flow');
      return;
    }

    // New renewal flow with payment tracking
    try {
      const subscriptionId = extendData.subscription.id;
      
      const response = await fetch(`/api/subscriptions/${subscriptionId}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(extendData.paymentData)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Subscription renewed successfully');
        fetchMerchantDetails();
      } else {
        throw new Error(result.message || 'Failed to renew subscription');
      }
    } catch (error) {
      console.error('Error extending subscription:', error);
      throw error; // Re-throw for component to handle
    }
  };

  const handleCancel = async (subscription: any, reason: string, cancelType: 'immediate' | 'end_of_period') => {
    try {
      // For now, we'll use the simple cancelSubscription function
      // TODO: Update the API to support cancelType parameter
      const response = await subscriptionsApi.cancel(subscription.id, reason);

      if (response.success) {
        console.log('Subscription cancelled successfully');
        console.log('Cancel type:', cancelType); // Log the cancel type for now
        fetchMerchantDetails();
      } else {
        console.error('Failed to cancel subscription:', response.message);
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  };

  const handleSuspend = async (subscription: any, reason: string) => {
    try {
      const response = await subscriptionsApi.suspend(subscription.id, { reason });

      if (response.success) {
        console.log('Subscription suspended successfully');
        fetchMerchantDetails();
      } else {
        console.error('Failed to suspend subscription:', response.message);
      }
    } catch (error) {
      console.error('Error suspending subscription:', error);
    }
  };

  const handleReactivate = async (subscription: any) => {
    try {
      const response = await subscriptionsApi.resume(subscription.id, { 
        reason: 'Subscription reactivated by admin' 
      });

      if (response.success) {
        console.log('Subscription reactivated successfully');
        fetchMerchantDetails();
      } else {
        console.error('Failed to reactivate subscription:', response.message);
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-bg-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error || !merchant) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Merchant</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {error || 'Merchant not found'}
            </p>
            <Button
              onClick={() => router.push('/merchants')}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Merchants
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Transform API response to match MerchantDetail component expectations
  // API returns: { subscription, Plan, _count }
  // Component expects: { currentSubscription, plan, stats }
  const merchantData = {
    merchant: {
      ...merchant,
      subscription: merchant.subscription,
      plan: merchant.subscription?.plan
    },
    stats: {
      totalOutlets: merchant._count?.outlets || 0,
      totalUsers: merchant._count?.users || 0,
      totalProducts: merchant._count?.products || 0,
      totalOrders: 0,
      totalRevenue: merchant.totalRevenue || 0,
      activeOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0
    }
  };

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Merchants', href: '/merchants' },
    { label: merchant?.merchant?.name || merchant?.name || 'Merchant' }
  ];

  return (
    <PageWrapper>
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/dashboard" className="mb-4" />
      <PageContent>
        <MerchantDetail
          data={merchantData}
          plans={plans}
          currentUserRole={user?.role}
          onMerchantAction={handleMerchantAction}
          onOutletAction={handleOutletAction}
          onUserAction={handleUserAction}
          onProductAction={handleProductAction}
          onOrderAction={handleOrderAction}
          onPlanChange={handlePlanChange}
          onExtend={handleExtend}
          onCancel={handleCancel}
          onSuspend={handleSuspend}
          onReactivate={handleReactivate}
        />
      </PageContent>
    </PageWrapper>
  );
}
