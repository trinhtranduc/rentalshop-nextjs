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
  Label,
  Textarea
} from '@rentalshop/ui';
import { 
  CreditCard,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Settings,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';
import type { Subscription, Plan, Payment } from '@rentalshop/types';

export default function MerchantSubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  // Fetch subscription data
  const fetchSubscription = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/subscriptions/status', {
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
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'TRIAL': { variant: 'warning' as const, label: 'Trial', icon: Clock },
      'ACTIVE': { variant: 'success' as const, label: 'Active', icon: CheckCircle },
      'CANCELLED': { variant: 'destructive' as const, label: 'Cancelled', icon: AlertTriangle },
      'EXPIRED': { variant: 'destructive' as const, label: 'Expired', icon: AlertTriangle },
      'SUSPENDED': { variant: 'warning' as const, label: 'Suspended', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      variant: 'secondary' as const, 
      label: status, 
      icon: Clock 
    };
    const Icon = config.icon;
    
    return (
      <div className="flex items-center space-x-2">
        <Icon className="h-4 w-4" />
        <StatusBadge variant={config.variant}>{config.label}</StatusBadge>
      </div>
    );
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  const getPlanFeatures = (plan: Plan) => {
    try {
      return JSON.parse(plan.features || '[]');
    } catch {
      return [];
    }
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(true);
  };

  const handleBillingSettings = () => {
    setShowBillingModal(true);
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
        <h2 className="text-2xl font-bold text-gray-900">No Subscription Found</h2>
        <p className="text-gray-600 mt-2">You don't have an active subscription.</p>
        <Button 
          onClick={() => window.location.href = '/plans'}
          className="mt-4"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Choose a Plan
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Subscription</h1>
          <p className="text-gray-600">Manage your subscription and billing</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={fetchSubscription}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleBillingSettings}
          >
            <Settings className="h-4 w-4 mr-2" />
            Billing Settings
          </Button>
          <Button
            onClick={handleUpgrade}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Upgrade Plan
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
                    ? `Your subscription expired on ${formatDate(subscription.endDate!)}. Please renew to continue using the service.`
                    : `Your subscription expires on ${formatDate(subscription.endDate!)}. Consider renewing to avoid service interruption.`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Current Plan</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{subscription.plan?.name}</h3>
                    <p className="text-gray-600">{subscription.plan?.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {formatCurrency(subscription.amount, subscription.currency)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {subscription.planVariant?.name || 'per month'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getStatusBadge(subscription.status)}
                  {isExpiringSoon(subscription.endDate) && (
                    <Badge variant="warning">Expiring Soon</Badge>
                  )}
                  {isExpired(subscription.endDate) && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                </div>

                {/* Plan Features */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Plan Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {getPlanFeatures(subscription.plan).map((feature: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Billing Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-600">Start Date</Label>
                <p className="text-sm">{formatDate(subscription.startDate)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">End Date</Label>
                <p className="text-sm">
                  {subscription.endDate ? formatDate(subscription.endDate) : 'No end date'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Next Billing</Label>
                <p className="text-sm">{formatDate(subscription.nextBillingDate)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Auto Renew</Label>
                <div className="flex items-center space-x-1">
                  {subscription.autoRenew ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">{subscription.autoRenew ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Plan Limits</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Outlets</span>
                <span className="text-sm font-medium">
                  {subscription.plan?.limits?.outlets === -1 ? 'Unlimited' : subscription.plan?.limits?.outlets || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Users</span>
                <span className="text-sm font-medium">
                  {subscription.plan?.limits?.users === -1 ? 'Unlimited' : subscription.plan?.limits?.users || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Products</span>
                <span className="text-sm font-medium">
                  {subscription.plan?.limits?.products === -1 ? 'Unlimited' : subscription.plan?.limits?.products || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Customers</span>
                <span className="text-sm font-medium">
                  {subscription.plan?.limits?.customers === -1 ? 'Unlimited' : subscription.plan?.limits?.customers || 'Not set'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Choose a plan that better fits your business needs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You will be redirected to our plan selection page where you can compare plans and upgrade.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => window.location.href = '/plans'}>
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Billing Settings Modal */}
      <Dialog open={showBillingModal} onOpenChange={setShowBillingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Billing Settings</DialogTitle>
            <DialogDescription>
              Manage your billing preferences and payment methods.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Billing settings functionality will be available soon. For now, please contact support for billing changes.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBillingModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}