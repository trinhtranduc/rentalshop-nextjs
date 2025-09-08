'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MerchantHeader } from './MerchantHeader';
import { MerchantPlanManagement } from './MerchantPlanManagement';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../../ui';
import { Building2, Users, Package, ShoppingCart } from 'lucide-react';
import type { MerchantDetailData, Plan, Subscription } from '@rentalshop/types';

interface MerchantDetailProps {
  data: MerchantDetailData;
  plans?: Plan[];
  onMerchantAction: (action: string, merchantId: number) => void;
  onOutletAction: (action: string, outletId: number) => void;
  onUserAction: (action: string, userId: number) => void;
  onProductAction: (action: string, productId: number) => void;
  onOrderAction: (action: string, orderId: number) => void;
  onPlanChange?: (planData: {
    planId: number;
    planVariantId?: number;
    reason?: string;
    effectiveDate?: string;
    notifyMerchant?: boolean;
  }) => Promise<void>;
  onExtend?: (extendData: { subscription: Subscription; duration: number; billingInterval: string; discount: number; totalPrice: number; }) => Promise<void>;
  onCancel?: (subscription: Subscription, reason: string, cancelType: 'immediate' | 'end_of_period') => Promise<void>;
  onSuspend?: (subscription: Subscription, reason: string) => Promise<void>;
  onReactivate?: (subscription: Subscription) => Promise<void>;
}

export function MerchantDetail({
  data,
  plans = [],
  onMerchantAction,
  onOutletAction,
  onUserAction,
  onProductAction,
  onOrderAction,
  onPlanChange,
  onExtend,
  onCancel,
  onSuspend,
  onReactivate
}: MerchantDetailProps) {
  const router = useRouter();

  const navigateToPage = (page: string, id?: number) => {
    // Navigate within the admin app
    const url = id ? `/${page}/${id}` : `/${page}`;
    router.push(url);
  };

  const handleNavigateToAdmin = (page: string, id?: number) => {
    navigateToPage(page, id);
  };

  return (
    <div className="space-y-6">
      {/* Merchant Header with Statistics */}
      <MerchantHeader 
        merchant={data.merchant}
        stats={data.stats}
      />

      {/* Merchant Information */}
      <div className="grid grid-cols-1 gap-6">
        {/* Basic Info */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                <p className="text-gray-900 dark:text-white">{data.merchant.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                <p className="text-gray-900 dark:text-white">{data.merchant.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                <p className="text-gray-900 dark:text-white">{data.merchant.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                <p className="text-gray-900 dark:text-white">{data.merchant.address || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
                <p className="text-gray-900 dark:text-white">{data.merchant.description || 'No description'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                <p className={`text-sm ${data.merchant.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {data.merchant.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Plan Management */}
      {onPlanChange && (
        <MerchantPlanManagement
          merchant={{
            id: data.merchant.id,
            name: data.merchant.name,
            email: data.merchant.email,
            currentPlan: data.merchant.plan ? {
              id: data.merchant.plan.id,
              name: data.merchant.plan.name,
              price: data.merchant.plan.basePrice,
              currency: data.merchant.plan.currency
            } : null,
            subscriptionStatus: data.merchant.currentSubscription?.status || data.merchant.subscriptionStatus || 'unknown'
          }}
          subscriptions={data.merchant.currentSubscription ? [data.merchant.currentSubscription as any] : []}
          plans={plans}
          onPlanChange={onPlanChange}
          onExtend={onExtend}
          onCancel={onCancel}
          onSuspend={onSuspend}
          onReactivate={onReactivate}
        />
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manage Outlets</CardTitle>
            <Building2 className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleNavigateToAdmin('merchants/' + data.merchant.id + '/outlets')}
            >
              Go to Outlets
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manage Products</CardTitle>
            <Package className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleNavigateToAdmin('merchants/' + data.merchant.id + '/products')}
            >
              Go to Products
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manage Users</CardTitle>
            <Users className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleNavigateToAdmin('merchants/' + data.merchant.id + '/users')}
            >
              Go to Users
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manage Orders</CardTitle>
            <ShoppingCart className="w-5 h-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleNavigateToAdmin('merchants/' + data.merchant.id + '/orders')}
            >
              Go to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
     </div>
  );
}

export default MerchantDetail;
