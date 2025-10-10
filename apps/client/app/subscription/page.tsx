'use client'

import React, { useState, useEffect } from 'react';
import { subscriptionsApi, plansApi } from '@rentalshop/utils';
import { useCanExportData } from '@rentalshop/hooks';
import { useAuth } from '@rentalshop/hooks';
import { useToast } from '@rentalshop/ui';
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
  const { user } = useAuth();
  const { toastError, toastSuccess } = useToast();
  const canExport = useCanExportData();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  // Fetch subscription data
  const fetchSubscription = async () => {
    try {
      setLoading(true);
      
      // Get current user's subscription status
      const result = await subscriptionsApi.getCurrentUserSubscriptionStatus();
      
      console.log('🔍 Subscription API response:', result);
      
      if (result.success && result.data) {
        // ============================================================================
        // NEW FLAT API RESPONSE - Map to Subscription object
        // ============================================================================
        const data = result.data;
        
        const subscriptionData: Subscription = {
          id: data.subscriptionId,
          merchantId: data.merchantId,
          planId: data.planId,
          status: data.status,
          amount: data.billingAmount,
          currency: data.billingCurrency,
          interval: data.billingInterval,
          intervalCount: data.billingIntervalCount,
          currentPeriodStart: data.currentPeriodStart,
          currentPeriodEnd: data.currentPeriodEnd,
          trialStart: data.trialStart,
          trialEnd: data.trialEnd,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd,
          canceledAt: data.canceledAt,
          cancelReason: data.cancelReason,
          createdAt: data.currentPeriodStart, // Use as fallback
          updatedAt: data.currentPeriodStart, // Use as fallback
          plan: {
            id: data.planId || 0,
            name: data.planName,
            description: data.planDescription || '',
            basePrice: data.planPrice,
            currency: data.planCurrency,
            trialDays: data.planTrialDays,
            isActive: true,
            features: data.features,
            limits: data.limits,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        } as any;
        
        console.log('✅ Mapped subscription data:', subscriptionData);
        setSubscription(subscriptionData);
        // Payments will be fetched separately if needed
        setPayments([]);
      } else {
        console.log('❌ No subscription data:', result);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch subscription data';
      toastError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'TRIAL': { variant: 'outline' as const, label: 'Trial', icon: Clock },
      'ACTIVE': { variant: 'solid' as const, label: 'Active', icon: CheckCircle },
      'CANCELLED': { variant: 'outline' as const, label: 'Cancelled', icon: AlertTriangle },
      'EXPIRED': { variant: 'outline' as const, label: 'Expired', icon: AlertTriangle },
      'SUSPENDED': { variant: 'outline' as const, label: 'Suspended', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      variant: 'default' as const, 
      label: status, 
      icon: Clock 
    };
    const Icon = config.icon;
    
    return (
      <div className="flex items-center space-x-2">
        <Icon className="h-4 w-4" />
        <StatusBadge status={config.label} variant={config.variant} />
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
    return plan.features || [];
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
                    ? `Your subscription expired on ${formatDate(subscription.currentPeriodEnd!)}. Please renew to continue using the service.`
                    : `Your subscription expires on ${formatDate(subscription.currentPeriodEnd!)}. Consider renewing to avoid service interruption.`
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
                      {formatCurrency(subscription.amount, subscription.plan.currency)}
                    </div>
                    <div className="text-sm text-gray-500">
                      per {subscription.billingInterval}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getStatusBadge(subscription.status)}
                  {isExpiringSoon(subscription.currentPeriodEnd) && (
                    <Badge variant="outline">Expiring Soon</Badge>
                  )}
                  {isExpired(subscription.currentPeriodEnd) && (
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
                <p className="text-sm">{formatDate(subscription.currentPeriodStart)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">End Date</Label>
                <p className="text-sm">
                  {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'No end date'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Next Billing</Label>
                <p className="text-sm">{formatDate(subscription.currentPeriodEnd)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Auto Renew</Label>
                <div className="flex items-center space-x-1">
                  {true ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">Yes</span>
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
            {canExport && (
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
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
                    <TableCell>{formatCurrency(payment.amount, 'IDR')}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>
                      <StatusBadge 
                        status={payment.status}
                        variant={payment.status === 'COMPLETED' ? 'solid' : 
                                payment.status === 'FAILED' ? 'outline' : 'default'}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {(payment as any).reference || 'N/A'}
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