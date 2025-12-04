'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MerchantHeader } from './MerchantHeader';
import { MerchantPlanManagement } from './MerchantPlanManagement';
import { MerchantSubscriptionSection } from './MerchantSubscriptionSection';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../../../ui';
import { Building2, Users, Package, ShoppingCart, PlusCircle, MoreVertical, ChevronDown } from 'lucide-react';
import type { MerchantDetailData, Plan, Subscription } from '@rentalshop/types';
import { SUBSCRIPTION_STATUS, normalizeSubscriptionStatus } from '@rentalshop/constants';
import type { SubscriptionStatus } from '@rentalshop/constants';

interface MerchantDetailProps {
  data: MerchantDetailData;
  plans?: Plan[];
  currentUserRole?: string;
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
    billingInterval?: string;
    duration?: number;
    discount?: number;
    totalPrice?: number;
  }) => Promise<void>;
  onExtend?: (extendData: { subscription: Subscription; duration: number; billingInterval: string; discount: number; totalPrice: number; }) => Promise<void>;
  onCancel?: (subscription: Subscription, reason: string, cancelType: 'immediate' | 'end_of_period') => Promise<void>;
  onSuspend?: (subscription: Subscription, reason: string) => Promise<void>;
  onReactivate?: (subscription: Subscription) => Promise<void>;
}

export function MerchantDetail({
  data,
  plans = [],
  currentUserRole,
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
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navigateToPage = (page: string, id?: number) => {
    // Navigate within the admin app
    const url = id ? `/${page}/${id}` : `/${page}`;
    router.push(url);
  };

  const handleNavigateToAdmin = (page: string, id?: number) => {
    navigateToPage(page, id);
    setDropdownOpen(false);
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</label>
                <p className="text-sm text-gray-900 dark:text-white">{data.merchant.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</label>
                <p className="text-sm text-gray-900 dark:text-white">{data.merchant.email}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</label>
                <p className="text-sm text-gray-900 dark:text-white">{data.merchant.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
                <p className={`text-sm ${data.merchant.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {data.merchant.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              {data.merchant.subscription && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Current Plan</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {data.merchant.subscription.plan?.name || 'No plan'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Subscription Status</label>
                    <p className={`text-sm ${
                      normalizeSubscriptionStatus(data.merchant.subscription.status) === SUBSCRIPTION_STATUS.ACTIVE ? 'text-green-600' :
                      normalizeSubscriptionStatus(data.merchant.subscription.status) === SUBSCRIPTION_STATUS.TRIAL ? 'text-blue-600' :
                      normalizeSubscriptionStatus(data.merchant.subscription.status) === SUBSCRIPTION_STATUS.PAUSED ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      {normalizeSubscriptionStatus(data.merchant.subscription.status) || 'Unknown'}
                    </p>
                  </div>
                </>
              )}
              {data.merchant.address && (
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Address</label>
                  <p className="text-sm text-gray-900 dark:text-white">{data.merchant.address}</p>
                </div>
              )}
              {data.merchant.description && (
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
                  <p className="text-sm text-gray-900 dark:text-white">{data.merchant.description}</p>
                </div>
              )}
              <div className="md:col-span-2 pt-2 border-t">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Quick Actions</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                      <span>Manage Merchant Resources</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56"
                    open={dropdownOpen}
                    onOpenChange={setDropdownOpen}
                  >
                    <DropdownMenuItem
                      onClick={() => handleNavigateToAdmin('merchants/' + data.merchant.id + '/outlets')}
                      className="cursor-pointer"
                    >
                      <Building2 className="mr-2 h-4 w-4 text-blue-700" />
                      <span>Manage Outlets</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleNavigateToAdmin('merchants/' + data.merchant.id + '/products')}
                      className="cursor-pointer"
                    >
                      <Package className="mr-2 h-4 w-4 text-green-600" />
                      <span>Manage Products</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleNavigateToAdmin('merchants/' + data.merchant.id + '/users')}
                      className="cursor-pointer"
                    >
                      <Users className="mr-2 h-4 w-4 text-purple-600" />
                      <span>Manage Users</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleNavigateToAdmin('merchants/' + data.merchant.id + '/orders')}
                      className="cursor-pointer"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4 text-orange-600" />
                      <span>Manage Orders</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleNavigateToAdmin('merchants/' + data.merchant.id + '/plan-limit-addons')}
                      className="cursor-pointer"
                    >
                      <PlusCircle className="mr-2 h-4 w-4 text-indigo-600" />
                      <span>Plan Limit Addons</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Plan Management - Compact version, only show if needed */}
      {onPlanChange && data.merchant.subscription && (
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
            subscriptionStatus: normalizeSubscriptionStatus(data.merchant.subscription?.status) || SUBSCRIPTION_STATUS.TRIAL,
            subscription: data.merchant.subscription || null
          }}
          subscriptions={data.merchant.subscription ? [data.merchant.subscription] : []}
          plans={plans}
          currentUserRole={currentUserRole}
          onPlanChange={onPlanChange}
          onExtend={onExtend}
          onCancel={onCancel}
          onSuspend={onSuspend}
          onReactivate={onReactivate}
        />
      )}

     </div>
  );
}

export default MerchantDetail;
