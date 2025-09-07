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
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@rentalshop/ui';
import { 
  CreditCard,
  CheckCircle,
  Star,
  Zap,
  Shield,
  Users,
  Building,
  Package,
  DollarSign,
  Calendar,
  ArrowRight,
  Check,
  X
} from 'lucide-react';
import type { Plan, Subscription } from '@rentalshop/types';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseData, setPurchaseData] = useState({
    paymentMethod: 'STRIPE',
    billingInfo: {
      name: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    planId: 0,
    billingCycle: 'monthly'
  });

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch plans
      const plansResponse = await fetch('/api/plans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const plansData = await plansResponse.json();
      
      if (plansData.success) {
        setPlans(plansData.data.plans || []);
      }


      // Fetch current subscription
      const subscriptionResponse = await fetch('/api/subscriptions/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const subscriptionData = await subscriptionResponse.json();
      
      if (subscriptionData.success) {
        setCurrentSubscription(subscriptionData.data.subscription);
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

  const getPlanFeatures = (plan: Plan) => {
    if (Array.isArray(plan.features)) {
      return plan.features;
    }
    try {
      return JSON.parse(plan.features || '[]');
    } catch {
      return [];
    }
  };


  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  const handlePurchase = () => {
    if (selectedPlan) {
      setShowPurchaseModal(true);
    }
  };

  const handleConfirmPurchase = async () => {
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId: selectedPlan?.publicId,
          status: 'active',
          period: purchaseData.billingCycle === 'monthly' ? 1 : purchaseData.billingCycle === 'quarterly' ? 3 : 12,
          amount: selectedPlan?.basePrice,
          currency: selectedPlan?.currency || 'USD'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to subscription page
        window.location.href = '/subscription';
      } else {
        alert(`Error purchasing plan: ${result.message}`);
      }
    } catch (error) {
      console.error('Error purchasing plan:', error);
      alert('Error purchasing plan. Please try again.');
    }
  };

  const isCurrentPlan = (plan: Plan) => {
    return currentSubscription?.planId === plan.id;
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('trial')) return <Zap className="h-6 w-6" />;
    if (planName.toLowerCase().includes('basic') || planName.toLowerCase().includes('starter')) return <Package className="h-6 w-6" />;
    if (planName.toLowerCase().includes('professional') || planName.toLowerCase().includes('pro')) return <Shield className="h-6 w-6" />;
    if (planName.toLowerCase().includes('enterprise') || planName.toLowerCase().includes('business')) return <Building className="h-6 w-6" />;
    return <CreditCard className="h-6 w-6" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Choose Your Plan</h1>
        <p className="text-xl text-gray-600 mt-4">
          Select the perfect plan for your rental business
        </p>
      </div>

      {/* Current Subscription Alert */}
      {currentSubscription && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-800">Current Plan</h3>
                <p className="text-sm text-blue-700">
                  You're currently on the <strong>{currentSubscription.plan?.name}</strong> plan.
                  {currentSubscription.status === 'trial' && ' Your trial ends soon.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan);
          const isPopular = plan.isPopular;
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${isCurrent ? 'ring-2 ring-blue-500' : ''} ${isPopular ? 'border-orange-200' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white px-3 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-blue-500 text-white px-3 py-1">
                    <Check className="h-3 w-3 mr-1" />
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  {getPlanIcon(plan.name)}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-gray-600">{plan.description}</p>
                <div className="mt-4">
                  <div className="text-3xl font-bold">
                    {formatCurrency(plan.basePrice, plan.currency)}
                  </div>
                  <div className="text-sm text-gray-500">per month</div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Plan Features */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Features</h4>
                  <div className="space-y-2">
                    {getPlanFeatures(plan).map((feature: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Limits */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Limits</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Outlets</span>
                      <span className="font-medium">
                        {plan.limits?.outlets === -1 ? 'Unlimited' : plan.limits?.outlets || 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Users</span>
                      <span className="font-medium">
                        {plan.limits?.users === -1 ? 'Unlimited' : plan.limits?.users || 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Products</span>
                      <span className="font-medium">
                        {plan.limits?.products === -1 ? 'Unlimited' : plan.limits?.products || 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customers</span>
                      <span className="font-medium">
                        {plan.limits?.customers === -1 ? 'Unlimited' : plan.limits?.customers || 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  {isCurrent ? (
                    <Button disabled className="w-full">
                      <Check className="h-4 w-4 mr-2" />
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleSelectPlan(plan)}
                      className="w-full"
                      variant={isPopular ? 'default' : 'outline'}
                    >
                      {selectedPlan?.id === plan.id ? 'Selected' : 'Select Plan'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Plan Details */}
      {selectedPlan && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Selected Plan: {selectedPlan.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Billing Cycle */}
              <div>
                <Label className="text-sm font-medium text-gray-600">Billing Cycle</Label>
                <Select 
                  value={purchaseData.billingCycle} 
                  onValueChange={(value) => setPurchaseData({...purchaseData, billingCycle: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly - {formatCurrency(selectedPlan.basePrice, selectedPlan.currency)}</SelectItem>
                    <SelectItem value="quarterly">Quarterly - {formatCurrency(selectedPlan.basePrice * 3 * 0.9, selectedPlan.currency)} (10% off)</SelectItem>
                    <SelectItem value="yearly">Yearly - {formatCurrency(selectedPlan.basePrice * 12 * 0.8, selectedPlan.currency)} (20% off)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Purchase Button */}
              <div className="flex justify-center">
                <Button 
                  onClick={handlePurchase}
                  size="lg"
                  className="px-8"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Purchase Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Modal */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
            <DialogDescription>
              Review your plan selection and complete the purchase.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPlan && (
              <div className="space-y-2">
                <h4 className="font-medium">Plan Details</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span>Plan:</span>
                    <span className="font-medium">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Billing:</span>
                    <span className="font-medium capitalize">{purchaseData.billingCycle}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(
                      purchaseData.billingCycle === 'monthly' ? selectedPlan.basePrice :
                      purchaseData.billingCycle === 'quarterly' ? selectedPlan.basePrice * 3 * 0.9 :
                      selectedPlan.basePrice * 12 * 0.8, 
                      selectedPlan.currency
                    )}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={purchaseData.paymentMethod}
                onValueChange={(value) => setPurchaseData(prev => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRIPE">Credit Card (Stripe)</SelectItem>
                  <SelectItem value="PAYPAL">PayPal</SelectItem>
                  <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-600">
              By purchasing this plan, you agree to our terms of service and billing policies.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPurchase}>
              Complete Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
