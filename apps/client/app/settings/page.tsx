'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { Badge } from '@rentalshop/ui';
import { PlanSelectionModal } from '@rentalshop/ui';
import { useSubscriptionStatus } from '@rentalshop/hooks';
import { 
  Settings,
  CreditCard, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Crown,
  Users,
  Store,
  Package
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { subscription, loading, error, refetch } = useSubscriptionStatus();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
      // Redirect to login if no token
      router.push('/login');
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  // Show loading while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Settings
              </h3>
              <p className="text-gray-600 mb-4">
                {error.message || 'Failed to load settings'}
              </p>
              <Button onClick={refetch} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'trial':
        return <Calendar className="h-4 w-4" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isExpiringSoon = (endDate: Date | string | null) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (endDate: Date | string | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account and subscription
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Current Plan Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Crown className="h-5 w-5 mr-2" />
              Current Plan
            </CardTitle>
            <Badge className={getStatusColor(subscription?.status || 'unknown')}>
              <div className="flex items-center">
                {getStatusIcon(subscription?.status || 'unknown')}
                <span className="ml-1 capitalize">{subscription?.status || 'No Plan'}</span>
              </div>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {subscription ? (
            <>
              {/* Plan Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {subscription.plan?.name || 'Unknown Plan'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {subscription.plan?.description || 'No description available'}
                  </p>
                  
                  {/* Plan Features */}
                  {subscription.plan?.features && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">What's included:</h4>
                      <ul className="space-y-1">
                        {(typeof subscription.plan.features === 'string' 
                          ? JSON.parse(subscription.plan.features) 
                          : subscription.plan.features || []
                        ).map((feature: string, index: number) => (
                          <li key={index} className="flex items-center text-sm text-gray-600">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Pricing */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Monthly Price</span>
                      <span className="text-2xl font-bold text-gray-900">
                        ${subscription.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Billing Cycle</span>
                      <span className="capitalize">{subscription.billingCycle}</span>
                    </div>
                  </div>

                  {/* Plan Limits */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <Store className="h-4 w-4 text-blue-500 mr-2" />
                      <div>
                        <p className="text-gray-600">Outlets</p>
                        <p className="font-medium">
                          {subscription.plan?.limits?.outlets === -1 ? 'Unlimited' : subscription.plan?.limits?.outlets || 'Not set'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-green-500 mr-2" />
                      <div>
                        <p className="text-gray-600">Users</p>
                        <p className="font-medium">
                          {subscription.plan?.limits?.users === -1 ? 'Unlimited' : subscription.plan?.limits?.users || 'Not set'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Package className="h-4 w-4 text-purple-500 mr-2" />
                      <div>
                        <p className="text-gray-600">Products</p>
                        <p className="font-medium">
                          {subscription.plan?.limits?.products === -1 ? 'Unlimited' : subscription.plan?.limits?.products || 'Not set'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-orange-500 mr-2" />
                      <div>
                        <p className="text-gray-600">Customers</p>
                        <p className="font-medium">
                          {subscription.plan?.limits?.customers === -1 ? 'Unlimited' : subscription.plan?.limits?.customers || 'Not set'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Timeline */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Subscription Timeline</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Start Date</p>
                      <p className="font-medium">{formatDate(subscription.startDate)}</p>
                    </div>
                  </div>
                  
                  {subscription.trialEndDate && (
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-orange-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Trial Ends</p>
                        <p className="font-medium">{formatDate(subscription.trialEndDate)}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-red-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">End Date</p>
                      <p className="font-medium">
                        {subscription.endDate ? formatDate(subscription.endDate) : 'No end date'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expiry Warning */}
              {(isExpiringSoon(subscription.endDate) || isExpired(subscription.endDate)) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                    <div>
                      <h4 className="font-medium text-red-800">
                        {isExpired(subscription.endDate) ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                      </h4>
                      <p className="text-sm text-red-600 mt-1">
                        {isExpired(subscription.endDate) 
                          ? 'Your subscription has expired. Please upgrade to continue using the service.'
                          : `Your subscription expires on ${formatDate(subscription.endDate)}. Consider upgrading to avoid service interruption.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t pt-6">
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={() => setShowPlanModal(true)}
                    className="flex items-center"
                    variant={isExpired(subscription.endDate) ? "default" : "outline"}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isExpired(subscription.endDate) ? 'Reactivate Plan' : 'Upgrade Plan'}
                  </Button>
                  
                  <Button 
                    onClick={refetch}
                    variant="outline"
                    className="flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* No Subscription State */
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Active Plan
              </h3>
              <p className="text-gray-600 mb-4">
                You don't have an active subscription. Select a plan to get started.
              </p>
              <Button onClick={() => setShowPlanModal(true)}>
                <Crown className="h-4 w-4 mr-2" />
                Select Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onSelectPlan={(planId) => {
          console.log('Selected plan:', planId);
          setShowPlanModal(false);
          refetch();
        }}
        currentPlan={subscription?.plan}
      />
    </div>
  );
}