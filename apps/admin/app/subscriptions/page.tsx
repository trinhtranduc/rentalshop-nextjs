'use client'

import React, { useState, useEffect } from 'react';
import { 
  SubscriptionList,
  SubscriptionForm,
  SubscriptionEditDialog,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
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
  DialogFooter,
  ConfirmationDialogWithReason,
  ToastContainer,
  useToasts
} from '@rentalshop/ui';
import { 
  subscriptionsApi,
  merchantsApi,
  plansApi
} from '@rentalshop/utils';
import { 
  Plus, 
  Download,
  Filter,
  Search,
  CreditCard,
  Check,
  Clock,
  X
} from 'lucide-react';
import type { Subscription, Plan, Merchant, BillingPeriod } from '@rentalshop/types';
import type { Subscription as ApiSubscription, SubscriptionsResponse } from '@rentalshop/utils';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  // Toast management
  const { toasts, showSuccess, showError, showWarning, removeToast } = useToasts();

  // Confirmation dialog state
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

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subscriptions
      const subscriptionsResult = await subscriptionsApi.search({
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit
      });
      
      if (subscriptionsResult.success && subscriptionsResult.data) {
        console.log('Subscriptions API response:', subscriptionsResult);
        
        let subscriptionsArray: any[] = [];
        let paginationData: any = {};
        
        // Handle different possible response structures
        if (Array.isArray(subscriptionsResult.data)) {
          // Direct array response
          subscriptionsArray = subscriptionsResult.data;
          paginationData = (subscriptionsResult as any).pagination || {};
        } else if (subscriptionsResult.data && Array.isArray(subscriptionsResult.data.data)) {
          // Wrapped response with data property
          subscriptionsArray = subscriptionsResult.data.data;
          paginationData = subscriptionsResult.data.pagination || {};
        } else {
          console.error('Invalid subscriptions data structure:', subscriptionsResult.data);
          setSubscriptions([]);
          return;
        }
        
        // Convert API subscriptions to UI subscriptions
        const uiSubscriptions: Subscription[] = subscriptionsArray.map((apiSub: ApiSubscription) => ({
          id: apiSub.id,
          publicId: apiSub.publicId,
          merchantId: apiSub.merchantId,
          planId: apiSub.planId,
          status: apiSub.status as 'trial' | 'active' | 'past_due' | 'cancelled' | 'paused',
          currentPeriodStart: new Date(apiSub.currentPeriodStart || apiSub.startDate),
          currentPeriodEnd: new Date(apiSub.currentPeriodEnd || apiSub.endDate || new Date()),
          trialStart: apiSub.trialStart ? new Date(apiSub.trialStart) : undefined,
          trialEnd: apiSub.trialEnd ? new Date(apiSub.trialEnd) : undefined,
          cancelAtPeriodEnd: apiSub.cancelAtPeriodEnd || false,
          canceledAt: apiSub.canceledAt ? new Date(apiSub.canceledAt) : undefined,
          cancelReason: apiSub.cancelReason,
          amount: apiSub.amount,
          currency: apiSub.currency,
          interval: apiSub.interval as 'month' | 'quarter' | 'year',
          intervalCount: apiSub.intervalCount || 1,
          period: apiSub.period as 1 | 3 | 12,
          discount: apiSub.discount || 0,
          savings: apiSub.savings || 0,
          createdAt: new Date(apiSub.createdAt),
          updatedAt: new Date(apiSub.updatedAt),
          merchant: apiSub.merchant,
          plan: apiSub.plan
        }));
        
        setSubscriptions(uiSubscriptions);
        setPagination(prev => ({
          ...prev,
          total: paginationData.total || 0
        }));
      } else {
        console.error('Failed to fetch subscriptions:', subscriptionsResult);
        setSubscriptions([]);
      }

      // Fetch plans
      const plansResult = await plansApi.getPlans();
      
      if (plansResult.success && plansResult.data) {
        console.log('Plans data:', plansResult.data);
        const plansData = plansResult.data as any;
        
        if (Array.isArray(plansData)) {
          setPlans(plansData);
        } else if (plansData && Array.isArray(plansData.plans)) {
          setPlans(plansData.plans);
        } else {
          console.error('Invalid plans data structure:', plansData);
          setPlans([]);
        }
      } else {
        console.error('Failed to fetch plans:', plansResult);
        setPlans([]);
      }

      // Fetch merchants
      const merchantsResult = await merchantsApi.getMerchants();
      
      if (merchantsResult.success && merchantsResult.data) {
        console.log('Merchants data:', merchantsResult.data);
        // Convert API merchants to UI merchants
        const merchantsData = merchantsResult.data as { merchants: any[] };
        
        if (merchantsData && merchantsData.merchants && Array.isArray(merchantsData.merchants)) {
          const uiMerchants: Merchant[] = merchantsData.merchants.map((apiMerchant: any) => ({
            ...apiMerchant,
            outletsCount: apiMerchant.outletsCount || 0,
            usersCount: apiMerchant.usersCount || 0,
            productsCount: apiMerchant.productsCount || 0
          }));
          setMerchants(uiMerchants);
        } else {
          console.error('Invalid merchants data structure:', merchantsData);
          setMerchants([]);
        }
      } else {
        console.error('Failed to fetch merchants:', merchantsResult);
        setMerchants([]);
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

  const handleView = (subscription: Subscription) => {
    // Navigate to subscription detail page
    window.location.href = `/admin/subscriptions/${subscription.id}`;
  };

  const handleEdit = (subscription: Subscription) => {
    // Open edit dialog
    setSelectedSubscription(subscription);
    setShowEditDialog(true);
  };

  const handleEditSave = async (data: any) => {
    try {
      setSubmitting(true);
      
      // Here you would make an API call to update the subscription
      console.log('Updating subscription with data:', data);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh the subscriptions list
      await fetchData();
      
      setShowEditDialog(false);
      setSelectedSubscription(null);
      
      showSuccess(
        'Subscription Updated',
        'Subscription has been updated successfully'
      );
    } catch (error) {
      console.error('Failed to update subscription:', error);
      showError(
        'Update Failed',
        'Failed to update subscription. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (subscription: Subscription) => {
    setConfirmationDialog({
      open: true,
      type: 'cancel',
      subscription
    });
  };



  const handleChangePlan = (subscription: Subscription, newPlanId: number, period: BillingPeriod) => {
    setConfirmationDialog({
      open: true,
      type: 'changePlan',
      subscription,
      data: { newPlanId, period }
    });
  };

  const handleConfirmationConfirm = async (reason: string) => {
    const { type, subscription, data } = confirmationDialog;
    if (!subscription) return;

    // Close dialog immediately to prevent double submission
    setConfirmationDialog({ open: false, type: 'cancel', subscription: null });

    try {
      let result;
      
      switch (type) {
        case 'cancel':
          result = await subscriptionsApi.cancel(subscription.publicId, reason);
          break;
        case 'changePlan':
          result = await subscriptionsApi.changePlan(subscription.publicId, data.newPlanId);
          break;
        default:
          return;
      }
      
      if (result.success) {
        await fetchData(); // Refresh data
        showSuccess(
          'Operation Successful',
          `Subscription ${type === 'cancel' ? 'cancelled' : 'plan changed'} successfully`
        );
      } else {
        showError(
          'Operation Failed',
          result.message || `Failed to ${type} subscription`
        );
      }
    } catch (error) {
      console.error(`Error ${type}ing subscription:`, error);
      showError(
        'Operation Failed',
        `Error ${type}ing subscription. Please try again.`
      );
    }
  };

  const handleConfirmationCancel = () => {
    setConfirmationDialog({ open: false, type: 'cancel', subscription: null });
  };

  const handleExtend = (subscription: Subscription) => {
    // Open extension modal
    // This would typically open a modal component
    console.log('Extend subscription:', subscription.id);
  };


  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    // In a real implementation, you'd fetch data for the new page
  };

  const handleCreateNew = () => {
    setShowCreateDialog(true);
  };

  const handleCreateSubmit = async (data: any) => {
    try {
      setSubmitting(true);
      
      const result = await subscriptionsApi.create(data);

      if (result.success) {
        setShowCreateDialog(false);
        await fetchData(); // Refresh data
        showSuccess(
          'Subscription Created',
          'New subscription has been created successfully'
        );
      } else {
        showError(
          'Creation Failed',
          result.message || 'Failed to create subscription'
        );
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      showError(
        'Creation Failed',
        'Error creating subscription. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCancel = () => {
    setShowCreateDialog(false);
  };

  return (
    <PageWrapper>
      <PageHeader>
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
              onClick={() => window.location.href = '/plans'}
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

      <PageContent>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination.total}</div>
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
                {subscriptions.filter(s => s.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Trial Subscriptions</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {subscriptions.filter(s => s.status === 'trial').length}
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
                {subscriptions.filter(s => s.status === 'cancelled').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Cancelled or expired
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions List */}
        <SubscriptionList
          subscriptions={subscriptions}
          plans={plans}
          merchants={merchants}
          onView={handleView}
          onEdit={handleEdit}
          onCancel={handleCancel}
          onChangePlan={handleChangePlan}
          onExtend={handleExtend}
          loading={loading}
          pagination={{
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            onPageChange: handlePageChange
          }}
        />
      </PageContent>

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

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </PageWrapper>
  );
}