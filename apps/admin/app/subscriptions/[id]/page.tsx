'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { subscriptionsApi } from '@rentalshop/utils';
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
  X
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
  const [loading, setLoading] = useState(true);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [extendData, setExtendData] = useState({
    newEndDate: new Date(),
    amount: 0,
    method: 'MANUAL',
    description: ''
  });

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
      
      const { subscriptionsApi } = await import('@rentalshop/utils');
      const result = await subscriptionsApi.getById(parseInt(params.id));
      
      if (result.success && result.data) {
        setSubscription(result.data);
        setPayments(result.data.payments || []);
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

  const handleExtendConfirm = async () => {
    try {
      const { subscriptionsApi } = await import('@rentalshop/utils');
      const result = await subscriptionsApi.extend(parseInt(params.id), extendData);

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

      {/* Extend Modal */}
      <Dialog open={showExtendModal} onOpenChange={setShowExtendModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-700" />
              Extend Subscription
            </DialogTitle>
            <DialogDescription>
              Extend subscription for {subscription?.merchant?.name || 'Unknown Merchant'}. 
              This will update the end date and create a payment record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Subscription Info */}
            <Card>
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Plan</Label>
                    <p className="text-sm font-medium">{subscription?.plan?.name || 'Unknown Plan'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Current Amount</Label>
                    <p className="text-sm font-medium">
                      {formatCurrency(subscription?.amount || 0, subscription?.currency || 'USD')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Current End Date</Label>
                    <p className="text-sm">{subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'No end date'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <p className="text-sm">{subscription?.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Extension Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Extension Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={extendData.amount}
                    onChange={(e) => setExtendData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="method">Payment Method</Label>
                  <select
                    id="method"
                    value={extendData.method}
                    onChange={(e) => setExtendData(prev => ({ ...prev, method: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="STRIPE">Stripe</option>
                    <option value="TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="CHECK">Check</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={extendData.description}
                  onChange={(e) => setExtendData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description about this extension..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendConfirm}>
              Extend Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
