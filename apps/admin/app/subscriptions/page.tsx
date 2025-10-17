'use client'

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SubscriptionList,
  SubscriptionForm,
  SubscriptionEditDialog,
  PageWrapper,
  PageHeader,
  PageTitle,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ConfirmationDialogWithReason,
  useToast } from '@rentalshop/ui';
import { 
  subscriptionsApi,
  merchantsApi,
  plansApi
} from '@rentalshop/utils';
import { 
  Plus, 
  Download,
  Filter,
  CreditCard,
  Check,
  Clock,
  X
} from 'lucide-react';
import { useSubscriptionsData } from '@rentalshop/hooks';
import type { Subscription, Plan, Merchant, BillingPeriod } from '@rentalshop/types';

/**
 * ✅ MODERN SUBSCRIPTIONS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with useSubscriptionsData hook
 * ✅ Request deduplication with useDedupedApi
 */
export default function SubscriptionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toastSuccess, toastError, toastWarning } = useToast();

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // ============================================================================
  // DIALOG STATES
  // ============================================================================
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    type: 'cancel' | 'changePlan';
    subscription: Subscription | null;
    data?: any;
  }>({
    open: false,
    type: 'cancel',
    subscription: null
  });

  // ============================================================================
  // DATA FETCHING - Clean & Simple with Deduplication
  // ============================================================================
  
  const filters = useMemo(() => ({
    page,
    limit,
    offset: (page - 1) * limit
  }), [page, limit]);

  const { data, loading, error, refetch } = useSubscriptionsData({ filters });
  
  console.log('📊 Subscriptions Page - Data state:', {
    hasData: !!data,
    subscriptionsCount: data?.subscriptions?.length || 0,
    loading,
    error: error?.message
  });

  // Fetch plans and merchants for forms
  React.useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [plansResult, merchantsResult] = await Promise.all([
          plansApi.getPlans(),
          merchantsApi.getMerchants()
        ]);

        if (plansResult.success && plansResult.data) {
          const plansData = Array.isArray(plansResult.data) ? plansResult.data : plansResult.data.plans || [];
          setPlans(plansData);
        }

        if (merchantsResult.success && merchantsResult.data) {
          const merchantsData = merchantsResult.data.merchants || [];
          setMerchants(merchantsData);
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
      }
    };

    fetchFormData();
  }, []);

  // ============================================================================
  // URL UPDATE HELPER
  // ============================================================================
  
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    const newURL = `${pathname}?${params.toString()}`;
    router.push(newURL, { scroll: false });
  }, [pathname, router, searchParams]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleView = useCallback((subscription: Subscription) => {
    router.push(`/subscriptions/${subscription.id}`);
  }, [router]);

  const handleEdit = useCallback((subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowEditDialog(true);
  }, []);

  const handleEditSave = useCallback(async (editData: any) => {
    try {
      setSubmitting(true);
      console.log('Updating subscription with data:', editData);
      
      await refetch(); // Refresh data
      
      setShowEditDialog(false);
      setSelectedSubscription(null);
      
      toastSuccess(
        'Subscription Updated',
        'Subscription has been updated successfully'
      );
    } catch (error) {
      console.error('Failed to update subscription:', error);
      toastError(
        'Update Failed',
        'Failed to update subscription. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [refetch, toastSuccess, toastError]);

  const handleCancel = useCallback((subscription: Subscription) => {
    setConfirmationDialog({
      open: true,
      type: 'cancel',
      subscription
    });
  }, []);

  const handleChangePlan = useCallback((subscription: Subscription, newPlanId: number, period: BillingPeriod) => {
    setConfirmationDialog({
      open: true,
      type: 'changePlan',
      subscription,
      data: { newPlanId, period }
    });
  }, []);

  const handleConfirmationConfirm = useCallback(async (reason: string) => {
    const { type, subscription, data: confirmData } = confirmationDialog;
    if (!subscription) return;

    setConfirmationDialog({ open: false, type: 'cancel', subscription: null });

    try {
      let result;
      
      switch (type) {
        case 'cancel':
          result = await subscriptionsApi.cancel(subscription.id, reason);
          break;
        case 'changePlan':
          result = await subscriptionsApi.changePlan(subscription.id, confirmData.newPlanId);
          break;
        default:
          return;
      }
      
      if (result.success) {
        await refetch(); // Refresh data
        toastSuccess(
          'Operation Successful',
          `Subscription ${type === 'cancel' ? 'cancelled' : 'plan changed'} successfully`
        );
      } else {
        toastError(
          'Operation Failed',
          result.message || `Failed to ${type} subscription`
        );
      }
    } catch (error) {
      console.error(`Error ${type}ing subscription:`, error);
      toastError(
        'Operation Failed',
        `Error ${type}ing subscription. Please try again.`
      );
    }
  }, [confirmationDialog, refetch, toastSuccess, toastError]);

  const handleConfirmationCancel = useCallback(() => {
    setConfirmationDialog({ open: false, type: 'cancel', subscription: null });
  }, []);

  const handleExtend = useCallback((subscription: Subscription) => {
    console.log('Extend subscription:', subscription.id);
  }, []);

  const handleCreateNew = useCallback(() => {
    setShowCreateDialog(true);
  }, []);

  const handleCreateSubmit = useCallback(async (createData: any) => {
    try {
      setSubmitting(true);
      
      const result = await subscriptionsApi.create(createData);

      if (result.success) {
        setShowCreateDialog(false);
        await refetch(); // Refresh data
        toastSuccess(
          'Subscription Created',
          'New subscription has been created successfully'
        );
      } else {
        toastError(
          'Creation Failed',
          result.message || 'Failed to create subscription'
        );
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toastError(
        'Creation Failed',
        'Error creating subscription. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [refetch, toastSuccess, toastError]);

  const handleCreateCancel = useCallback(() => {
    setShowCreateDialog(false);
  }, []);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================

  const subscriptions = data?.subscriptions || [];
  const totalSubscriptions = data?.total || 0;

  // Transform subscriptions for UI
  const uiSubscriptions: Subscription[] = useMemo(() => {
    return subscriptions.map((apiSub: any) => ({
      id: apiSub.id,
      merchantId: apiSub.merchantId,
      planId: apiSub.planId,
      status: apiSub.status as any,
      billingInterval: apiSub.billingInterval || apiSub.interval || 'month',
      currentPeriodStart: new Date(apiSub.currentPeriodStart || apiSub.startDate),
      currentPeriodEnd: new Date(apiSub.currentPeriodEnd || apiSub.endDate || new Date()),
      amount: apiSub.amount,
      createdAt: new Date(apiSub.createdAt),
      updatedAt: new Date(apiSub.updatedAt),
      merchant: apiSub.merchant || {
        id: apiSub.merchantId,
        name: 'Unknown Merchant',
        email: ''
      },
      plan: apiSub.plan || {
        id: apiSub.planId,
        name: 'Unknown Plan',
        description: '',
        basePrice: apiSub.amount || 0,
        currency: 'USD',
        trialDays: 0,
        limits: { outlets: 0, users: 0, products: 0, customers: 0, orders: 0 },
        features: [],
        isActive: true,
        isPopular: false,
        sortOrder: 0,
        pricing: { monthly: { price: 0, discount: 0, savings: 0 }, quarterly: { price: 0, discount: 0, savings: 0 }, yearly: { price: 0, discount: 0, savings: 0 } },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }));
  }, [subscriptions]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle subtitle="Manage merchant subscriptions with modern pricing tiers (Monthly, Quarterly, Yearly)">
              Subscription Management
            </PageTitle>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => {/* Export functionality */}}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/plans')}
            >
              <Filter className="w-4 h-4 mr-2" />
              Manage Plans
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create Subscription
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Fixed Stats Section */}
      <div className="flex-shrink-0 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                All time subscriptions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Subscriptions</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {uiSubscriptions.filter(s => String(s.status).toLowerCase() === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Trial Subscriptions</CardTitle>
              <Clock className="h-4 w-4 text-blue-700" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {uiSubscriptions.filter(s => String(s.status).toLowerCase() === 'trial').length}
              </div>
              <p className="text-xs text-muted-foreground">
                In trial period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cancelled Subscriptions</CardTitle>
              <X className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {uiSubscriptions.filter(s => String(s.status).toLowerCase() === 'cancelled').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Cancelled or expired
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0 overflow-auto mt-4">
        <SubscriptionList
          subscriptions={uiSubscriptions}
          plans={plans}
          merchants={merchants}
          onView={handleView}
          onEdit={handleEdit}
          onCancel={handleCancel}
          onChangePlan={handleChangePlan}
          onExtend={handleExtend}
          loading={loading}
          pagination={{
            page,
            limit,
            total: totalSubscriptions,
            onPageChange: handlePageChange
          }}
        />
      </div>

      {/* Create Subscription Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Subscription</DialogTitle>
            <DialogDescription>
              Create a new subscription for a merchant. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          
          <SubscriptionForm
            plans={plans}
            merchants={merchants}
            onSubmit={handleCreateSubmit}
            onCancel={handleCreateCancel}
            loading={submitting}
            mode="create"
            title=""
            submitText="Create Subscription"
          />
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog with Reason */}
      <ConfirmationDialogWithReason
        open={confirmationDialog.open}
        onOpenChange={(open) => setConfirmationDialog(prev => ({ ...prev, open }))}
        type={confirmationDialog.type === 'cancel' ? 'warning' : 'info'}
        title={
          confirmationDialog.type === 'cancel' ? 'Cancel Subscription' :
          'Change Subscription Plan'
        }
        description={
          confirmationDialog.type === 'cancel' ? 
            `Are you sure you want to cancel this subscription for ${confirmationDialog.subscription?.merchant?.name || 'this merchant'}? This action cannot be undone and will stop billing at the current period.` :
            `Are you sure you want to change the subscription plan for ${confirmationDialog.subscription?.merchant?.name || 'this merchant'}? This will update the billing and may affect the subscription amount.`
        }
        confirmText={
          confirmationDialog.type === 'cancel' ? 'Cancel Subscription' :
          'Change Plan'
        }
        onConfirm={handleConfirmationConfirm}
        onCancel={handleConfirmationCancel}
        isLoading={submitting}
        reasonLabel="Reason"
        reasonPlaceholder={
          confirmationDialog.type === 'cancel' ? 
            'Enter reason for cancelling this subscription...' : 
            'Enter reason for changing this subscription plan...'
        }
        requireReason={true}
      />

      {/* Edit Subscription Dialog */}
      <SubscriptionEditDialog
        subscription={selectedSubscription}
        plans={plans}
        merchants={merchants}
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedSubscription(null);
        }}
        onSave={handleEditSave}
        loading={submitting}
      />
    </PageWrapper>
  );
}
