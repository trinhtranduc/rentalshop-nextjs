"use client";

// ============================================================================
// SUBSCRIPTION PREVIEW PAGE COMPONENT
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Badge,
  cn
} from '@rentalshop/ui';
import { publicPlansApi, formatCurrency } from '@rentalshop/utils';
import type { Plan, CurrencyCode } from '@rentalshop/types';
import { 
  Check, 
  Star, 
  Clock, 
  Users, 
  Store, 
  Package, 
  UserCheck,
  Zap,
  Shield,
  TrendingUp,
  XCircle
} from 'lucide-react';

interface SubscriptionPreviewPageProps {
  onSelectPlan?: (plan: Plan, duration: number) => void;
  showSelectButton?: boolean;
  className?: string;
}

export const SubscriptionPreviewPage: React.FC<SubscriptionPreviewPageProps> = ({
  onSelectPlan,
  showSelectButton = true,
  className
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await publicPlansApi.getPublicPlansWithVariants();
      
      if (response.success && response.data) {
        setPlans(response.data);
      } else {
        setError(response.error || 'Failed to fetch plans');
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError('Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: Plan, duration: number) => {
    setSelectedPlan(plan);
    setSelectedDuration(duration);
    
    if (onSelectPlan) {
      onSelectPlan(plan, duration);
    }
  };

  const getFeatureIcon = (feature: string) => {
    const featureLower = feature.toLowerCase();
    
    if (featureLower.includes('outlet') || featureLower.includes('store')) {
      return <Store className="w-4 h-4" />;
    }
    if (featureLower.includes('user') || featureLower.includes('staff')) {
      return <Users className="w-4 h-4" />;
    }
    if (featureLower.includes('product') || featureLower.includes('inventory')) {
      return <Package className="w-4 h-4" />;
    }
    if (featureLower.includes('customer')) {
      return <UserCheck className="w-4 h-4" />;
    }
    if (featureLower.includes('analytics') || featureLower.includes('report')) {
      return <TrendingUp className="w-4 h-4" />;
    }
    if (featureLower.includes('security') || featureLower.includes('secure')) {
      return <Shield className="w-4 h-4" />;
    }
    if (featureLower.includes('performance') || featureLower.includes('speed')) {
      return <Zap className="w-4 h-4" />;
    }
    
    return <Check className="w-4 h-4" />;
  };

  const getDurationText = (duration: number) => {
    if (duration === 1) return '1 Month';
    if (duration === 3) return '3 Months';
    if (duration === 6) return '6 Months';
    if (duration === 12) return '1 Year';
    return `${duration} Months`;
  };

  const getDiscountBadgeColor = (discount: number) => {
    if (discount >= 20) return 'bg-red-100 text-red-800 border-red-200';
    if (discount >= 10) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (discount > 0) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPlatformDisplayText = (platform: string) => {
    switch (platform) {
      case 'web-only': return 'Web Only';
      case 'mobile-only': return 'Mobile Only';
      case 'web-mobile': return 'Web & Mobile';
      case 'desktop-only': return 'Desktop Only';
      case 'all-platforms': return 'All Platforms';
      default: return 'Web & Mobile';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'web-only': return <Package className="w-4 h-4" />;
      case 'mobile-only': return <Zap className="w-4 h-4" />;
      case 'web-mobile': return <Shield className="w-4 h-4" />;
      case 'desktop-only': return <TrendingUp className="w-4 h-4" />;
      case 'all-platforms': return <Check className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading subscription plans...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800">{error}</p>
              <Button 
                onClick={fetchPlans}
                className="mt-4"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Define available durations
  const durations = [1, 3, 6, 12]; // Monthly, Quarterly, 6 months, Yearly

  // Get discount for selected duration
  const getDiscountForDuration = (duration: number) => {
    if (duration === 1) return 0;   // Monthly: 0% discount
    if (duration === 3) return 0;  // Quarterly: 0% discount
    if (duration === 6) return 5;   // 6 months: 5% discount
    if (duration === 12) return 10; // Yearly: 10% discount
    return 0;
  };

  // Calculate pricing for each plan and duration
  const calculatePlanPricing = (plan: Plan, duration: number) => {
    const basePrice = plan.basePrice;
    const discount = getDiscountForDuration(duration);
    const discountedPrice = basePrice * (1 - discount / 100);
    const totalSavings = (basePrice * duration) - (discountedPrice * duration);
    
    return {
      basePrice,
      discount,
      discountedPrice,
      totalSavings,
      monthlyPrice: discountedPrice,
      totalPrice: discountedPrice * duration
    };
  };

  return (
    <div className={cn("min-h-screen bg-white py-12", className)}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Subscription Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start with our free trial plan or choose a paid plan that fits your business needs.
          </p>
        </div>

        {/* Duration Selector - Only show if there are durations */}
        {durations.length > 0 && (
          <div className="flex justify-center mb-12">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {durations.map((duration) => {
              const discount = getDiscountForDuration(duration);
              const isSelected = selectedDuration === duration;
              return (
                <Button
                  variant={isSelected ? "default" : "ghost"}
                  key={duration}
                  onClick={() => setSelectedDuration(duration)}
                  className={cn(
                    "px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 relative",
                    isSelected
                      ? "bg-blue-700 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <div className="text-center">
                    <div className="font-semibold">
                      {duration === 1 ? 'Monthly' : 
                       duration === 3 ? 'Quarterly' : 
                       duration === 6 ? '6 Months' : 
                       duration === 12 ? 'Yearly' : 
                       `${duration} months`}
                    </div>
                    {discount > 0 ? (
                      <div className="text-xs opacity-90 font-medium">
                        Save {discount}%
                      </div>
                    ) : (
                      <div className="text-xs opacity-90">
                        Standard
                      </div>
                    )}
                  </div>
                  {discount > 0 && (
                    <div className="absolute -top-1 -right-1">
                      <div className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {discount}%
                      </div>
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
        )}
        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {plans.map((plan) => {
            // Calculate pricing for this plan and selected duration
            const pricing = calculatePlanPricing(plan, selectedDuration);
            
            return (
              <Card 
                key={plan.id} 
                className={cn(
                  "relative transition-all duration-200 hover:shadow-lg bg-white border-2",
                  plan.isPopular 
                    ? "border-blue-500 shadow-lg" 
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-700 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4 pt-8">
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </CardTitle>
                  <p className="text-gray-600 text-sm mb-4">
                    {plan.description}
                  </p>
                  
                  {/* Price */}
                  <div className="mb-4">
                    {plan.name === 'Trial' ? (
                      <div>
                        <span className="text-3xl font-bold text-green-600">Free</span>
                        <div className="text-sm text-gray-600 mt-1">14-day trial</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Main Price Display */}
                        <div className="flex items-baseline justify-center">
                          <span className="text-3xl font-bold text-gray-900">
                            {formatCurrency(pricing.monthlyPrice, plan.currency as CurrencyCode)}
                          </span>
                          <span className="text-gray-600 ml-1 text-sm">/month</span>
                        </div>
                        
                        {/* Discount Information */}
                        {pricing.discount > 0 && (
                          <div className="text-center space-y-1">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-sm text-gray-500 line-through">
                                {formatCurrency(pricing.basePrice, plan.currency as CurrencyCode)}/month
                              </span>
                              <Badge className={cn("text-xs font-medium", getDiscountBadgeColor(pricing.discount))}>
                                {pricing.discount}% OFF
                              </Badge>
                            </div>
                            <div className="text-sm text-green-600 font-medium">
                              Save {formatCurrency(pricing.totalSavings, plan.currency as CurrencyCode)} total
                            </div>
                          </div>
                        )}
                        
                        {/* Total Price for Duration */}
                        {selectedDuration > 1 && (
                          <div className="text-center">
                            <div className="text-sm text-gray-600">
                              Total for {selectedDuration} month{selectedDuration > 1 ? 's' : ''}:
                            </div>
                            <div className="text-lg font-semibold text-gray-900">
                              {formatCurrency(pricing.totalPrice, plan.currency as CurrencyCode)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Plan Limits */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Outlets</span>
                      <span className="font-medium text-gray-900">
                        {plan.limits.outlets === -1 ? 'Unlimited' : plan.limits.outlets}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Users</span>
                      <span className="font-medium text-gray-900">
                        {plan.limits.users === -1 ? 'Unlimited' : plan.limits.users}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Products</span>
                      <span className="font-medium text-gray-900">
                        {plan.limits.products === -1 ? 'Unlimited' : plan.limits.products.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Customers</span>
                      <span className="font-medium text-gray-900">
                        {plan.limits.customers === -1 ? 'Unlimited' : plan.limits.customers.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Trial Period</span>
                      <span className="font-medium text-gray-900">
                        {plan.trialDays} days
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Platform</span>
                      <span className="font-medium text-gray-900">
                        <span className="inline-flex items-center gap-1 text-green-600">
                          {getPlatformIcon('web-mobile')}
                          {getPlatformDisplayText('web-mobile')}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Plan Features */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Features</h4>
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{feature}</span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Core Features */}
                  <div className="space-y-3 mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Core Features</h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Order Management</span>
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Product Management</span>
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Customer Management</span>
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Revenue Reports</span>
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Web Portal</span>
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Mobile App</span>
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Free Updates</span>
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Email Support</span>
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    {plan.name === 'Professional' && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">Priority Support</span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">API Access</span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">Team Collaboration</span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                      </>
                    )}
                    {plan.name === 'Enterprise' && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">24/7 Priority Support</span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">Full API Access</span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">White-label Solution</span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">Dedicated Account Manager</span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">SLA Guarantee</span>
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Select Button */}
                  {showSelectButton && (
                    <Button
                      className="w-full"
                      variant={plan.isPopular ? "default" : plan.name === 'Trial' ? "default" : "outline"}
                      onClick={() => {
                        handlePlanSelect(plan, selectedDuration);
                      }}
                    >
                      {selectedPlan?.id === plan.id ? 'Selected' : 
                       plan.name === 'Trial' ? 'Start Free Trial' : 'Select Plan'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selected Plan Summary */}
        {selectedPlan && (
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Selected Plan Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Plan</p>
                <p className="font-medium text-gray-900">{selectedPlan.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Billing Period</p>
                <p className="font-medium text-gray-900">
                  {selectedDuration === 1 ? 'Monthly' : 
                   selectedDuration === 3 ? 'Quarterly' : 
                   selectedDuration === 6 ? '6 Months' : 
                   selectedDuration === 12 ? 'Yearly' : 
                   `${selectedDuration} months`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Price</p>
                <p className="font-medium text-gray-900">
                  {formatCurrency(calculatePlanPricing(selectedPlan, selectedDuration).monthlyPrice, selectedPlan.currency as CurrencyCode)}
                  {calculatePlanPricing(selectedPlan, selectedDuration).discount > 0 && (
                    <span className="text-green-600 ml-2 text-sm">
                      ({calculatePlanPricing(selectedPlan, selectedDuration).discount}% OFF)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Price</p>
                <p className="font-medium text-gray-900">
                  {formatCurrency(calculatePlanPricing(selectedPlan, selectedDuration).totalPrice, selectedPlan.currency as CurrencyCode)}
                  {calculatePlanPricing(selectedPlan, selectedDuration).discount > 0 && (
                    <div className="text-xs text-green-600">
                      Save {formatCurrency(calculatePlanPricing(selectedPlan, selectedDuration).totalSavings, selectedPlan.currency as CurrencyCode)}
                    </div>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center mt-12 text-gray-600">
          <p className="text-sm">
            All plans include 24/7 support and can be upgraded or downgraded at any time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPreviewPage;
