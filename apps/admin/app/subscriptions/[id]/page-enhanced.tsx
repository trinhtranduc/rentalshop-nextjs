'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  StatusBadge,
  Breadcrumb,
  PaymentHistoryTable,
  ManualRenewalModal,
  UpgradeTrialModal,
  useToast } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { subscriptionsApi, plansApi } from '@rentalshop/utils';
import { 
  ArrowLeft,
  Edit,
  CreditCard,
  Calendar,
  DollarSign,
  Users,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Pause,
  Play,
  X,
  TrendingUp
} from 'lucide-react';
import type { Subscription, Plan, Payment } from '@rentalshop/types';

interface SubscriptionDetailPageProps {
  params: {
    id: string;
  };
}

export default function SubscriptionDetailPageEnhanced({ params }: SubscriptionDetailPageProps) {
  const router = useRouter();
  const subscriptionId = parseInt(params.id);
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payments' | 'activity' | 'details'>('payments');
  
  // Modal states
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Toast management
  const { toastSuccess, toastError, removeToast } = useToast();

  // Fetch subscription data
  useEffect(() => {
    fetchData();
  }, [subscriptionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subscription details
      const subResult = await subscriptionsApi.getById(subscriptionId);
      if (subResult.success && subResult.data) {
        setSubscription(subResult.data);
      }

      // Fetch payment history
      const paymentResult = await fetch(`/api/subscriptions/${subscriptionId}/payments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (paymentResult.ok) {
        const paymentData = await paymentResult.json();
        if (paymentData.success) {
          setPayments(paymentData.data || []);
        }
      }

      // Fetch plans for upgrade modal
      const plansResult = await plansApi.getPlans();
      if (plansResult.success && plansResult.data) {
        setPlans(plansResult.data.plans || []);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toastError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRenewal = async (data: any) => {
    try {
      setRenewalLoading(true);
      
      const response = await fetch(`/api/subscriptions/${subscriptionId}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        toastSuccess('Subscription renewed successfully!');
        setShowRenewalModal(false);
        fetchData(); // Reload data
      } else {
        toastError(result.message || 'Failed to renew subscription');
      }
    } catch (error) {
      console.error('Renewal error:', error);
      toastError('An error occurred while renewing subscription');
    } finally {
      setRenewalLoading(false);
    }
  };

  const handleUpgrade = async (planId: number, billingCycle: string, paymentMethod: string) => {
    try {
      setUpgradeLoading(true);
      
      const response = await fetch(`/api/subscriptions/${subscriptionId}/change-plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          newPlanId: planId,
          billingInterval: billingCycle
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toastSuccess('Plan upgraded successfully!');
        setShowUpgradeModal(false);
        fetchData(); // Reload data
      } else {
        toastError(result.message || 'Failed to upgrade plan');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toastError('An error occurred while upgrading plan');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        toastSuccess('Subscription paused successfully');
        fetchData();
      } else {
        toastError(result.message || 'Failed to pause subscription');
      }
    } catch (error) {
      toastError('An error occurred');
    }
  };

  const handleResume = async () => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        toastSuccess('Subscription resumed successfully');
        fetchData();
      } else {
        toastError(result.message || 'Failed to resume subscription');
      }
    } catch (error) {
      toastError('An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Subscription Not Found</h2>
            <p className="text-gray-600 mb-4">The subscription you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/subscriptions')}>
              Back to Subscriptions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string; icon: any }> = {
      active: { variant: 'success', label: 'Active', icon: CheckCircle },
      trial: { variant: 'warning', label: 'Trial', icon: Clock },
      past_due: { variant: 'danger', label: 'Past Due', icon: AlertTriangle },
      paused: { variant: 'secondary', label: 'Paused', icon: Pause },
      cancelled: { variant: 'danger', label: 'Cancelled', icon: X }
    };

    const config = statusMap[status] || { variant: 'default', label: status, icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Subscriptions', href: '/subscriptions' },
    { label: `#${subscription.id} - ${subscription.merchant?.name || 'Subscription'}` }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} showHome={true} homeHref="/dashboard" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {subscription.merchant?.name} - Subscription
          </h1>
          <p className="text-gray-600 text-sm">Subscription ID: #{subscription.id}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => setShowRenewalModal(true)}
            disabled={subscription.status === 'cancelled'}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Manual Renewal
          </Button>
          
          {subscription.status === 'trial' && (
            <Button
              variant="success"
              onClick={() => setShowUpgradeModal(true)}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          )}

          {subscription.status === 'active' && (
            <Button variant="outline" onClick={handlePause}>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}

          {subscription.status === 'paused' && (
            <Button variant="outline" onClick={handleResume}>
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
          )}

          <Button variant="outline" onClick={() => router.push(`/subscriptions/${subscription.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div className="mt-2">
                  {getStatusBadge(subscription.status)}
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Plan</p>
                <p className="text-xl font-bold mt-1">{subscription.plan?.name}</p>
              </div>
              <Building className="w-8 h-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="text-xl font-bold mt-1">
                  ${subscription.amount}/{subscription.billingInterval}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Next Billing</p>
                <p className="text-xl font-bold mt-1">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <div className="flex gap-4 border-b">
            <Button
              variant="ghost"
              className={`px-4 py-2 font-medium rounded-none ${activeTab === 'payments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setActiveTab('payments')}
            >
              💳 Payment History
            </Button>
            <Button
              variant="ghost"
              className={`px-4 py-2 font-medium rounded-none ${activeTab === 'activity' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setActiveTab('activity')}
            >
              📊 Activity Log
            </Button>
            <Button
              variant="ghost"
              className={`px-4 py-2 font-medium rounded-none ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setActiveTab('details')}
            >
              📋 Plan Details
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {activeTab === 'payments' && (
            <PaymentHistoryTable
              subscriptionId={subscriptionId}
              payments={payments}
              loading={loading}
              onViewPayment={(payment) => console.log('View payment:', payment)}
              onDownloadInvoice={(payment) => console.log('Download invoice:', payment)}
            />
          )}

          {activeTab === 'activity' && (
            <div className="py-12 text-center text-gray-600">
              Activity log coming soon...
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Plan Features</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Outlets</p>
                  <p className="font-semibold">{subscription.plan?.limits?.outlets || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Users</p>
                  <p className="font-semibold">{subscription.plan?.limits?.users || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Products</p>
                  <p className="font-semibold">
                    {subscription.plan?.limits?.products === 999999 ? 'Unlimited' : subscription.plan?.limits?.products}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customers</p>
                  <p className="font-semibold">
                    {subscription.plan?.limits?.customers === 999999 ? 'Unlimited' : subscription.plan?.limits?.customers}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {subscription && (
        <>
          <ManualRenewalModal
            isOpen={showRenewalModal}
            onClose={() => setShowRenewalModal(false)}
            subscription={{
              id: subscription.id,
              merchantName: subscription.merchant?.name || '',
              planName: subscription.plan?.name || '',
              amount: subscription.amount,
              currency: subscription.currency || 'USD',
              currentPeriodEnd: new Date(subscription.currentPeriodEnd)
            }}
            onRenew={handleManualRenewal}
            loading={renewalLoading}
          />

          {subscription.status === 'trial' && (
            <UpgradeTrialModal
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              subscription={{
                id: subscription.id,
                merchantName: subscription.merchant?.name || ''
              }}
              plans={plans}
              onUpgrade={handleUpgrade}
              loading={upgradeLoading}
            />
          )}
        </>
      )}

      {/* Toast Container */}
    </div>
  );
}

