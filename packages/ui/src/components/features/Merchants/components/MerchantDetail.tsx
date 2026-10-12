'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MerchantHeader } from './MerchantHeader';
import { MerchantPlanManagement } from './MerchantPlanManagement';
import { MerchantSubscriptionSection } from './MerchantSubscriptionSection';
import { MerchantLoyaltySection } from './MerchantLoyaltySection';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../../../ui';
import { Building2, Users, Package, ShoppingCart, PlusCircle, ChevronDown, UserCircle, Pencil } from 'lucide-react';
import type { MerchantDetailData, Plan, Subscription } from '@rentalshop/types';
import { BUSINESS_TAG_OPTIONS, SUBSCRIPTION_STATUS, normalizeSubscriptionStatus, getStatusLabel } from '@rentalshop/constants';
import type { SubscriptionStatus } from '@rentalshop/constants';

interface MerchantDetailProps {
  data: MerchantDetailData;
  plans?: Plan[];
  addonCount?: number; // Number of active addons
  currentUserRole?: string;
  /** false: the page shows MerchantQuickActions itself (admin header, #882). */
  showActions?: boolean;
  loyaltyActive?: boolean;
  loyaltyProgramName?: string | null;
  loyaltyLoading?: boolean;
  loyaltySaving?: boolean;
  loyaltySyncing?: boolean;
  onLoyaltyToggle?: (nextActive: boolean) => Promise<void> | void;
  onLoyaltySyncHistory?: () => Promise<void> | void;
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
    method?: string;
    transactionId?: string;
    reference?: string;
  }) => Promise<void | { success?: boolean; message?: string }>;
  onExtend?: (extendData: { subscription: Subscription; duration: number; billingInterval: string; discount: number; totalPrice: number; }) => Promise<void>;
  onCancel?: (subscription: Subscription, reason: string, cancelType: 'immediate' | 'end_of_period') => Promise<void>;
  onSuspend?: (subscription: Subscription, reason: string) => Promise<void>;
  onReactivate?: (subscription: Subscription) => Promise<void>;
}

const MERCHANT_MENU_ITEM = 'cursor-pointer max-md:min-h-11';

interface MerchantQuickActionsProps {
  merchantId: number;
  onMerchantAction: (action: string, merchantId: number) => void;
}

/** Add-on button and the Quick Actions menu (#882: admin shows them in the page header). */
export function MerchantQuickActions({ merchantId, onMerchantAction }: MerchantQuickActionsProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const go = (page: string) => {
    router.push(`/merchants/${merchantId}/${page}`);
    setDropdownOpen(false);
  };

  return (
    <>
      {/* #850: the shop's priced add-ons (pack, number of packs, removal at period end) */}
      <Button
        variant="outline"
        size="sm"
        className="max-md:flex-1 max-md:min-h-11"
        data-testid="merchant-addon-tab"
        onClick={() => go('addons')}
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        Add-on
      </Button>
      <DropdownMenu className="max-md:flex-[1_1_calc(50%-8px)]">
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-auto justify-between max-md:w-full max-md:min-h-11"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span>Quick Actions</span>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuItem onClick={() => go('outlets')} className={MERCHANT_MENU_ITEM}>
            <Building2 className="mr-2 h-4 w-4 text-ar-muted" />
            <span>Manage Outlets</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go('products')} className={MERCHANT_MENU_ITEM}>
            <Package className="mr-2 h-4 w-4 text-ar-muted" />
            <span>Manage Products</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go('users')} className={MERCHANT_MENU_ITEM}>
            <Users className="mr-2 h-4 w-4 text-ar-muted" />
            <span>Manage Users</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go('orders')} className={MERCHANT_MENU_ITEM}>
            <ShoppingCart className="mr-2 h-4 w-4 text-ar-muted" />
            <span>Manage Orders</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go('customers')} className={MERCHANT_MENU_ITEM}>
            <UserCircle className="mr-2 h-4 w-4 text-ar-muted" />
            <span>Manage Customers</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => go('addons')} className={MERCHANT_MENU_ITEM}>
            <PlusCircle className="mr-2 h-4 w-4 text-ar-muted" />
            <span>Add-on</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setDropdownOpen(false);
              onMerchantAction('edit', merchantId);
            }}
            className={MERCHANT_MENU_ITEM}
          >
            <Pencil className="mr-2 h-4 w-4 text-ar-muted" />
            <span>Edit Merchant</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const subscriptionTone = (status?: string | null): string => {
  const s = normalizeSubscriptionStatus(status);
  if (s === SUBSCRIPTION_STATUS.ACTIVE) return 'success';
  if (s === SUBSCRIPTION_STATUS.TRIAL) return 'info';
  if (s === SUBSCRIPTION_STATUS.PAUSED) return 'warning';
  if (s === SUBSCRIPTION_STATUS.CANCELLED) return 'danger';
  return 'neutral';
};

export function MerchantDetail({
  data,
  plans = [],
  addonCount = 0,
  currentUserRole,
  showActions = true,
  loyaltyActive = false,
  loyaltyProgramName,
  loyaltyLoading = false,
  loyaltySaving = false,
  loyaltySyncing = false,
  onLoyaltyToggle,
  onLoyaltySyncHistory,
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

  const businessTags = Array.isArray(data.merchant.businessTags)
    ? data.merchant.businessTags.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0)
    : [];

  const getBusinessTagLabel = (tag: string): string =>
    BUSINESS_TAG_OPTIONS.find((option) => option.value === tag)?.label ?? tag;

  const navigateToPage = (page: string) => router.push(`/${page}`);

  const stats = [
    { label: 'Total Users', value: data.stats.totalUsers, icon: Users, page: 'users' },
    { label: 'Total Products', value: data.stats.totalProducts, icon: Package, page: 'products' },
    { label: 'Total Orders', value: data.stats.totalOrders, icon: ShoppingCart, page: 'orders' },
    { label: 'Total Customers', value: data.stats.totalCustomers || 0, icon: UserCircle, page: 'customers' },
  ];

  const subscription = data.merchant.subscription;
  const subscriptionStatus = subscription
    ? normalizeSubscriptionStatus(subscription.status) || subscription.status
    : null;

  return (
    <div className="space-y-6">
      {/* Statistics - each one opens its list */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, page }) => (
          <button
            key={page}
            type="button"
            className="rounded-lg border border-ar-line bg-ar-surface p-4 text-left shadow-ar transition-colors hover:border-ar-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ar-primary"
            onClick={() => navigateToPage('merchants/' + data.merchant.id + '/' + page)}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ar-muted">{label}</span>
              <Icon className="h-4 w-4 text-ar-primary" aria-hidden />
            </span>
            <span className="mt-1 block text-2xl font-bold text-ar-ink">{value}</span>
          </button>
        ))}
      </div>

      {/* Merchant Information */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
            {showActions && (
              <div className="flex flex-wrap gap-2 max-md:w-full">
                <MerchantQuickActions merchantId={data.merchant.id} onMerchantAction={onMerchantAction} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-ar-muted">Name</dt>
              <dd className="mt-1 text-sm text-ar-ink">{data.merchant.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-ar-muted">Merchant Code</dt>
              <dd className="mt-1 text-sm text-ar-ink font-mono">{data.merchant.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-ar-muted">Email</dt>
              <dd className="mt-1 text-sm text-ar-ink">{data.merchant.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-ar-muted">Phone</dt>
              <dd className="mt-1 text-sm text-ar-ink">{data.merchant.phone || 'Not provided'}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-ar-muted">Address</dt>
              <dd className="mt-1 text-sm text-ar-ink">
                {[data.merchant.address, data.merchant.city, data.merchant.state, data.merchant.zipCode, data.merchant.country]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-ar-muted">Business Type</dt>
              <dd className="mt-1 text-sm text-ar-ink">{data.merchant.businessType || '—'}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-ar-muted">Business Tags</dt>
              {businessTags.length > 0 ? (
                <dd className="mt-1 flex flex-wrap gap-2">
                  {businessTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-normal">
                      {getBusinessTagLabel(tag)}
                    </Badge>
                  ))}
                </dd>
              ) : (
                <dd className="mt-1 text-sm text-ar-ink">—</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-ar-muted">Account status</dt>
              <dd className="mt-1">
                <span className={`ar-pill ar-pill-${data.merchant.isActive ? 'success' : 'danger'}`}>
                  {data.merchant.isActive ? 'Enabled' : 'Disabled'}
                </span>
              </dd>
            </div>
            {subscription && (
              <>
                <div>
                  <dt className="text-sm font-medium text-ar-muted">Plan</dt>
                  <dd className="mt-1 text-sm text-ar-ink">{subscription.plan?.name || 'No plan'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-ar-muted">Billing status</dt>
                  <dd className="mt-1">
                    <span className={`ar-pill ar-pill-${subscriptionTone(subscription.status)}`}>
                      {getStatusLabel(subscriptionStatus as string, 'subscription')}
                    </span>
                  </dd>
                </div>
              </>
            )}
            {data.merchant.description && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-ar-muted">Description</dt>
                <dd className="mt-1 text-sm text-ar-ink">{data.merchant.description}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {onLoyaltyToggle && (
        <MerchantLoyaltySection
          isActive={loyaltyActive}
          programName={loyaltyProgramName}
          loading={loyaltyLoading}
          saving={loyaltySaving}
          syncing={loyaltySyncing}
          onToggle={onLoyaltyToggle}
          onSyncHistory={onLoyaltySyncHistory}
        />
      )}

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
          addonCount={addonCount}
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
