'use client'

import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  StatusBadge,
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
  Label
} from '@rentalshop/ui';
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
  RefreshCw
} from 'lucide-react';
import type { Subscription, Plan, Merchant, Payment } from '@rentalshop/types';

interface SubscriptionDetailPageProps {
  params: {
    id: string;
  };
}

export default function SubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [extendData, setExtendData] = useState({
    amount: 0,
    method: 'MANUAL',
    notes: ''
  });

  // Fetch subscription data
  const fetchSubscription = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/subscriptions/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubscription(data.data.subscription);
        setPayments(data.data.payments || []);
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

  const handleExtend = async () => {
    try {
      const response = await fetch(`/api/subscriptions/${params.id}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(extendData)
      });

      if (response.ok) {
        setShowExtendModal(false);
        await fetchSubscription(); // Refresh data
      }
    } catch (error) {
      console.error('Error extending subscription:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/subscriptions/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // Redirect to subscriptions list
        window.location.href = '/admin/subscriptions';
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'TRIAL': { variant: 'warning' as const, label: 'Trial' },
      'ACTIVE': { variant: 'success' as const, label: 'Active' },
      'CANCELLED': { variant: 'destructive' as const, label: 'Cancelled' },
      'EXPIRED': { variant: 'destructive' as const, label: 'Expired' },
      'SUSPENDED': { variant: 'warning' as const, label: 'Suspended' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary' as const, label: status };
    return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Subscription Not Found</h2>
        <p className="text-gray-600 mt-2">The subscription you're looking for doesn't exist.</p>
        <Button 
          onClick={() => window.location.href = '/admin/subscriptions'}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Subscriptions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/admin/subscriptions'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Subscription #{subscription.id}
            </h1>
            <p className="text-gray-600">
              {subscription.merchant?.name} - {subscription.plan?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => window.location.href = `/admin/subscriptions/${subscription.id}/edit`}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowExtendModal(true)}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Extend
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(true)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {(isExpiringSoon(subscription.endDate) || isExpired(subscription.endDate)) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-800">
                  {isExpired(subscription.endDate) ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                </h3>
                <p className="text-sm text-orange-700">
                  {isExpired(subscription.endDate) 
                    ? `This subscription expired on ${formatDate(subscription.endDate!)}`
                    : `This subscription expires on ${formatDate(subscription.endDate!)}`
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
                    {isExpiringSoon(subscription.endDate) && (
                      <Badge variant="warning" className="ml-2">Expiring Soon</Badge>
                    )}
                    {isExpired(subscription.endDate) && (
                      <Badge variant="destructive" className="ml-2">Expired</Badge>
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
                    <span>{formatDate(subscription.startDate)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">End Date</Label>
                  <div className="mt-1 flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{subscription.endDate ? formatDate(subscription.endDate) : 'No end date'}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Next Billing</Label>
                  <div className="mt-1 flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(subscription.nextBillingDate)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Auto Renew</Label>
                  <div className="mt-1 flex items-center space-x-1">
                    {subscription.autoRenew ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                    <span>{subscription.autoRenew ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
              
              {subscription.changeReason && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Change Reason</Label>
                  <p className="mt-1 text-sm text-gray-700">{subscription.changeReason}</p>
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
                          <StatusBadge 
                            variant={payment.status === 'COMPLETED' ? 'success' : 
                                   payment.status === 'FAILED' ? 'destructive' : 'warning'}
                          >
                            {payment.status}
                          </StatusBadge>
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
                    <StatusBadge variant="success">
                      {subscription.merchant?.subscriptionStatus || 'Active'}
                    </StatusBadge>
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
                {subscription.planVariant && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Variant</Label>
                    <p className="text-sm text-gray-700">{subscription.planVariant.name}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Extend Modal */}
      <Dialog open={showExtendModal} onOpenChange={setShowExtendModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
            <DialogDescription>
              Extend this subscription with a manual payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={extendData.amount}
                onChange={(e) => setExtendData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
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
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={extendData.notes}
                onChange={(e) => setExtendData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this extension..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtend}>
              Extend Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this subscription? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
