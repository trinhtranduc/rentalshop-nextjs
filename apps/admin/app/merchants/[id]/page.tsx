'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  MerchantDetail,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button
} from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import { 
  merchantsApi,
  subscriptionsApi
} from '@rentalshop/utils';
import type { Merchant } from '@rentalshop/types';

export default function MerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;
  
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
        
        // Add mock plans data for the Change Plan dialog
        setPlans([
          { id: 1, name: 'Starter', basePrice: 29.99, currency: 'USD', description: 'Basic plan for small businesses' },
          { id: 2, name: 'Professional', basePrice: 59.99, currency: 'USD', description: 'Advanced plan for growing businesses' },
          { id: 3, name: 'Enterprise', basePrice: 99.99, currency: 'USD', description: 'Full-featured plan for large businesses' }
        ]);
      } else {
        setError(response.message || 'Failed to fetch merchant details');
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
  }) => {
    try {
      const response = await merchantsApi.updateMerchantPlan(Number(merchantId), {
        planId: planData.planId,
        reason: planData.reason,
        effectiveDate: planData.effectiveDate,
        notifyMerchant: planData.notifyMerchant
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

  const handleExtend = async (subscription: any) => {
    try {
      const response = await subscriptionsApi.extend(subscription.id, {
        newEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        amount: subscription.amount,
        method: 'MANUAL_EXTENSION',
        description: 'Subscription extended by admin'
      });

      if (response.success) {
        console.log('Subscription extended successfully');
        fetchMerchantDetails();
      } else {
        console.error('Failed to extend subscription:', response.message);
      }
    } catch (error) {
      console.error('Error extending subscription:', error);
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

  // Prepare data for MerchantDetail component
  const merchantData = {
    merchant: merchant?.merchant || merchant || {},
    stats: merchant?.stats || {
      totalOutlets: merchant?.outletsCount || 0,
      totalUsers: merchant?.usersCount || 0,
      totalProducts: merchant?.productsCount || 0,
      totalOrders: merchant?.ordersCount || 0,
      totalRevenue: merchant?.totalRevenue || 0,
      activeOrders: merchant?.activeOrders || 0,
      completedOrders: merchant?.completedOrders || 0,
      cancelledOrders: merchant?.cancelledOrders || 0
    }
  };

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/merchants')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Merchants
            </Button>
            <PageTitle subtitle={`Manage merchant: ${merchant?.merchant?.name || merchant?.name || 'Unknown'}`}>
              Merchant Details
            </PageTitle>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/merchants/${merchantId}/edit`)}
            >
              Edit Merchant
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <MerchantDetail
          data={merchantData}
          plans={plans}
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
