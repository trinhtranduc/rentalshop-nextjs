'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { subscriptionsApi, planLimitAddonsApi } from '@rentalshop/utils';
import { SubscriptionExtendDialogEnhanced } from '@rentalshop/ui';
import type { PlanLimitAddon } from '@rentalshop/types';
import { Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  StatusBadge,
  Breadcrumb,
  PageWrapper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Textarea,
  Label,
  ConfirmationDialog,
  useToast } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { 
  ArrowLeft,
  Edit,
  Trash2,
  CreditCard,
  Calendar,
  DollarSign,
  Users,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  X,
  Package,
  Plus
} from 'lucide-react';
import type { Subscription, Plan, Merchant, Payment } from '@rentalshop/types';

interface SubscriptionDetailPageProps {
  params: {
    id: string;
  };
}

export default function SubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [addons, setAddons] = useState<PlanLimitAddon[]>([]);
  const [totalAddonLimits, setTotalAddonLimits] = useState({
    outlets: 0,
    users: 0,
    products: 0,
    customers: 0,
    orders: 0
  });
  const [loading, setLoading] = useState(true);
  const [showExtendModal, setShowExtendModal] = useState(false);

  // Toast management
  const { toastSuccess, toastError, removeToast } = useToast();

  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    type: 'delete' | 'pause' | 'cancel';
    data?: any;
  }>({
    open: false,
    type: 'delete'
  });

  // Fetch subscription data
  const fetchSubscription = async () => {
    try {
      setLoading(true);
      
      const { subscriptionsApi, planLimitAddonsApi } = await import('@rentalshop/utils');
      const result = await subscriptionsApi.getById(parseInt(params.id));
      
      if (result.success && result.data) {
        setSubscription(result.data);
        setPayments(result.data.payments || []);
        
        // Fetch addons for this merchant
        if (result.data.merchantId) {
          try {
            const addonsResult = await planLimitAddonsApi.getMerchantPlanLimitAddons(
              result.data.merchantId,
              { 
                isActive: true,
                page: 1,
                limit: 100,
                offset: 0
              }
            );
            
            if (addonsResult.success && addonsResult.data) {
              const activeAddons = addonsResult.data.addons || [];
              setAddons(activeAddons);
              
              // Calculate total addon limits
              const totals = activeAddons.reduce(
                (acc, addon) => ({
                  outlets: acc.outlets + (addon.outlets || 0),
                  users: acc.users + (addon.users || 0),
                  products: acc.products + (addon.products || 0),
                  customers: acc.customers + (addon.customers || 0),
                  orders: acc.orders + (addon.orders || 0)
                }),
                { outlets: 0, users: 0, products: 0, customers: 0, orders: 0 }
              );
              setTotalAddonLimits(totals);
            }
          } catch (addonError) {
            console.error('Error fetching addons:', addonError);
          }
        }
      } else {
        throw new Error(result.message || 'Failed to fetch subscription');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [params.id]);

  const handleExtend = () => {
    setShowExtendModal(true);
  };

  const handleExtendConfirm = async (subscription: Subscription, data: {
    newEndDate: Date;
    amount: number;
    method: string;
    description?: string;
    sendEmail?: boolean;
  }) => {
    try {
      const { subscriptionsApi } = await import('@rentalshop/utils');
      const result = await subscriptionsApi.extend(parseInt(params.id), {
        newEndDate: data.newEndDate,
        amount: data.amount, // Will be auto-calculated if not provided
        method: data.method,
        description: data.description
      });

      if (result.success) {
        setShowExtendModal(false);
        await fetchSubscription(); // Refresh data
        toastSuccess('Subscription Extended', 'Subscription has been extended successfully');
      } else {
        toastError('Extension Failed', result.message || 'Failed to extend subscription');
      }
    } catch (error) {
      console.error('Error extending subscription:', error);
      toastError('Extension Failed', 'Error extending subscription. Please try again.');
    }
  };

  const handleDelete = () => {
    setConfirmationDialog({
      open: true,
      type: 'delete'
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      const result = await subscriptionsApi.delete(parseInt(params.id));
      
      if (result.success) {
        toastSuccess('Subscription Deleted', 'Subscription has been deleted successfully');
        // Redirect to subscriptions list
        router.push('/admin/subscriptions');
      } else {
        toastError('Deletion Failed', result.message || 'Failed to delete subscription');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toastError('Deletion Failed', 'Error deleting subscription. Please try again.');
    } finally {
      setConfirmationDialog({ open: false, type: 'delete' });
    }
  };

  const handlePause = () => {
    setConfirmationDialog({
      open: true,
      type: 'pause'
    });
  };

  const handlePauseConfirm = async () => {
    try {
      const result = await subscriptionsApi.suspend(parseInt(params.id), { 
        reason: 'Admin suspended subscription' 
      });

      if (result.success) {
        await fetchSubscription(); // Refresh data
        toastSuccess('Subscription Suspended', 'Subscription has been suspended successfully');
      } else {
        toastError('Suspension Failed', result.message || 'Failed to suspend subscription');
      }
    } catch (error) {
      console.error('Error suspending subscription:', error);
      toastError('Suspension Failed', 'Error suspending subscription. Please try again.');
    } finally {
      setConfirmationDialog({ open: false, type: 'pause' });
    }
  };

  const handleCancel = () => {
    setConfirmationDialog({
      open: true,
      type: 'cancel'
    });
  };

  const handleCancelConfirm = async () => {
    try {
      const { subscriptionsApi } = await import('@rentalshop/utils');
      const result = await subscriptionsApi.cancel(parseInt(params.id), 'Admin cancelled subscription');

      if (result.success) {
        await fetchSubscription(); // Refresh data
        toastSuccess('Subscription Cancelled', 'Subscription has been cancelled successfully');
      } else {
        toastError('Cancellation Failed', result.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toastError('Cancellation Failed', 'Error cancelling subscription. Please try again.');
    } finally {
      setConfirmationDialog({ open: false, type: 'cancel' });
    }
  };

  const getStatusBadge = (status: string) => {
    return <StatusBadge status={status} />;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const isExpiringSoon = (endDate: string | Date | null) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (endDate: string | Date | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
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
        <p className="text-gray-600 mt-2">The subscription you're looking for doesn't exist.</p>
        <Button 
          onClick={() => router.push('/admin/subscriptions')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Subscriptions
        </Button>
      </div>
    );
  }

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Subscriptions', href: '/subscriptions' },
    { label: `#${subscription.id} - ${subscription.merchant?.name || 'Subscription'}` }
  ];

  return (
    <PageWrapper>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/dashboard" className="mb-6" />

      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Subscription #{subscription.id}
          </h1>
          <p className="text-gray-600">
            {subscription.merchant?.name} - {subscription.plan?.name}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/subscriptions/${subscription.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleExtend}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Extend
          </Button>
          {subscription.status === 'active' && (
            <Button
              variant="outline"
              onClick={handlePause}
              className="text-orange-600 hover:text-orange-700"
            >
              <Clock className="h-4 w-4 mr-2" />
              Suspend
            </Button>
          )}
          {subscription.status === 'active' && (
            <Button
              variant="outline"
              onClick={handleCancel}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {(isExpiringSoon(subscription.currentPeriodEnd) || isExpired(subscription.currentPeriodEnd)) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-800">
                  {isExpired(subscription.currentPeriodEnd) ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                </h3>
                <p className="text-sm text-orange-700">
                  {isExpired(subscription.currentPeriodEnd) 
                    ? `This subscription expired on ${formatDate(subscription.currentPeriodEnd!)}`
                    : `This subscription expires on ${formatDate(subscription.currentPeriodEnd!)}`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Subscription Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(subscription.status)}
                    {isExpiringSoon(subscription.currentPeriodEnd) && (
                      <Badge variant="outline" className="ml-2">Expiring Soon</Badge>
                    )}
                    {isExpired(subscription.currentPeriodEnd) && (
                      <Badge variant="outline" className="ml-2">Expired</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Amount</Label>
                  <div className="mt-1 flex items-center space-x-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">
                      {formatCurrency(subscription.amount, subscription.currency)}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Start Date</Label>
                  <div className="mt-1 flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(subscription.currentPeriodStart)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">End Date</Label>
                  <div className="mt-1 flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'No end date'}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Next Billing</Label>
                  <div className="mt-1 flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(subscription.currentPeriodEnd)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Auto Renew</Label>
                  <div className="mt-1 flex items-center space-x-1">
                    {!subscription.cancelAtPeriodEnd ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                    <span>{!subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
              
              {subscription.cancelReason && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Cancel Reason</Label>
                  <p className="mt-1 text-sm text-gray-700">{subscription.cancelReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Limits & Addons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Plan Limits & Addons</span>
                </span>
                {subscription.merchantId && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/admin/merchants/${subscription.merchantId}/plan-limit-addons`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Manage Addons
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan Base Limits */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">Base Plan Limits</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Outlets</span>
                    <span className="font-semibold">
                      {subscription.plan?.limits?.outlets === -1 ? 'Unlimited' : subscription.plan?.limits?.outlets || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Users</span>
                    <span className="font-semibold">
                      {subscription.plan?.limits?.users === -1 ? 'Unlimited' : subscription.plan?.limits?.users || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Products</span>
                    <span className="font-semibold">
                      {subscription.plan?.limits?.products === -1 ? 'Unlimited' : subscription.plan?.limits?.products?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Customers</span>
                    <span className="font-semibold">
                      {subscription.plan?.limits?.customers === -1 ? 'Unlimited' : subscription.plan?.limits?.customers?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Orders</span>
                    <span className="font-semibold">
                      {subscription.plan?.limits?.orders === -1 ? 'Unlimited' : subscription.plan?.limits?.orders?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Addons Summary */}
              {addons.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold text-gray-700">Active Addons ({addons.length})</Label>
                    <Badge variant="outline" className="text-xs">
                      +{Object.values(totalAddonLimits).reduce((a, b) => a + b, 0)} total additional limits
                    </Badge>
                  </div>
                  
                  {/* Total Limits with Addons */}
                  <div className="mb-3">
                    <Label className="text-xs text-gray-500 mb-2 block">Total Limits (Plan + Addons)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(totalAddonLimits).map(([key, value]) => {
                        if (value === 0) return null;
                        const baseLimit = (subscription.plan?.limits?.[key as keyof typeof subscription.plan.limits] as number) || 0;
                        const totalLimit = baseLimit === -1 ? -1 : (baseLimit as number) + (value as number);
                        return (
                          <div key={key} className="flex justify-between items-center p-2 bg-primary/5 border border-primary/20 rounded">
                            <span className="text-sm text-gray-600 capitalize">{key}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">
                                {baseLimit === -1 ? 'Unlimited' : baseLimit}
                              </span>
                              <span className="text-xs text-primary font-semibold">+{value}</span>
                              <span className="text-sm font-semibold">=</span>
                              <span className="font-semibold text-primary">
                                {totalLimit === -1 ? 'Unlimited' : totalLimit}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Addons List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {addons.map((addon) => {
                      const limits = [];
                      if (addon.outlets > 0) limits.push(`${addon.outlets} Outlets`);
                      if (addon.users > 0) limits.push(`${addon.users} Users`);
                      if (addon.products > 0) limits.push(`${addon.products} Products`);
                      if (addon.customers > 0) limits.push(`${addon.customers} Customers`);
                      if (addon.orders > 0) limits.push(`${addon.orders} Orders`);
                      
                      return (
                        <div key={addon.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold">Addon #{addon.id}</span>
                                <Badge variant={addon.isActive ? "default" : "secondary"} className="text-xs">
                                  {addon.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-1 mb-1">
                                {limits.map((limit, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    +{limit}
                                  </Badge>
                                ))}
                              </div>
                              {addon.notes && (
                                <p className="text-xs text-gray-500 mt-1">{addon.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {addons.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No active addons. Addons provide additional limits on top of your base plan.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment History</span>
                </span>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment records found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>
                          <StatusBadge status={payment.status} />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.reference || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Merchant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Merchant</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Name</Label>
                  <p className="font-medium">{subscription.merchant?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Email</Label>
                  <p className="text-sm text-gray-700">{subscription.merchant?.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="mt-1">
                    <StatusBadge status={subscription.status || 'Unknown'} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Plan</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Plan Name</Label>
                  <p className="font-medium">{subscription.plan?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Description</Label>
                  <p className="text-sm text-gray-700">{subscription.plan?.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Base Price</Label>
                  <p className="font-medium">
                    {formatCurrency(subscription.plan?.basePrice || 0, subscription.plan?.currency || 'USD')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Interval</Label>
                  <p className="text-sm text-gray-700">
                    {subscription.intervalCount} {subscription.interval}(s)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Extend Modal - Enhanced with Auto-calculation */}
      <SubscriptionExtendDialogEnhanced
        subscription={subscription}
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        onConfirm={handleExtendConfirm}
        loading={false}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmationDialog.open}
        onOpenChange={(open) => setConfirmationDialog(prev => ({ ...prev, open }))}
        type={confirmationDialog.type === 'delete' ? 'danger' : confirmationDialog.type === 'cancel' ? 'warning' : 'warning'}
        title={
          confirmationDialog.type === 'pause' ? 'Suspend Subscription' :
          confirmationDialog.type === 'cancel' ? 'Cancel Subscription' :
          'Delete Subscription'
        }
        description={
          confirmationDialog.type === 'pause' ?
            `Are you sure you want to suspend this subscription for ${subscription?.merchant?.name || 'this merchant'}? The subscription will be paused and billing will stop immediately. You can reactivate it later if needed.` :
          confirmationDialog.type === 'cancel' ?
            `Are you sure you want to cancel this subscription for ${subscription?.merchant?.name || 'this merchant'}? This will stop billing and the subscription will end at the current period. This action cannot be undone.` :
            `Are you sure you want to permanently delete this subscription for ${subscription?.merchant?.name || 'this merchant'}? This action cannot be undone and will permanently remove all subscription data.`
        }
        confirmText={
          confirmationDialog.type === 'pause' ? 'Suspend Subscription' :
          confirmationDialog.type === 'cancel' ? 'Cancel Subscription' :
          'Delete Subscription'
        }
        onConfirm={
          confirmationDialog.type === 'pause' ? handlePauseConfirm :
          confirmationDialog.type === 'cancel' ? handleCancelConfirm :
          handleDeleteConfirm
        }
        onCancel={() => setConfirmationDialog({ open: false, type: 'delete' })}
      />

      {/* Toast Container */}
      </div>
    </PageWrapper>
  );
}
