'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Badge
} from '@rentalshop/ui';
import { 
  Check, 
  X, 
  Star,
  Zap,
  Shield,
  Building,
  Package,
  Smartphone,
  Globe,
  Link as LinkIcon
} from 'lucide-react';
import { 
  SUBSCRIPTION_PLANS, 
  getPlanComparison
} from '@rentalshop/constants';

export default function PricingPage() {
  const plans = Object.values(SUBSCRIPTION_PLANS).sort((a, b) => a.sortOrder - b.sortOrder);
  const comparison = getPlanComparison();

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'basic': return <Zap className="h-6 w-6" />;
      case 'professional': return <Shield className="h-6 w-6" />;
      case 'enterprise': return <Building className="h-6 w-6" />;
      default: return <Package className="h-6 w-6" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Simple subscription pricing with clear limits and features. No hidden costs, no complex calculations.
          </p>
        </div>

        {/* Product Public Check Feature Highlight */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-12">
          <div className="flex items-center mb-4">
            <LinkIcon className="h-8 w-8 text-blue-700 mr-3" />
            <h2 className="text-2xl font-bold text-blue-900">Product Public Check</h2>
          </div>
          <p className="text-blue-800 mb-4">
            All plans include the ability to share product catalogs publicly with customers. 
            Send shareable links that allow customers to view your products and pricing without logging in.
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2" />
              <span>Share product links via WhatsApp, email, or social media</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2" />
              <span>Customers can view prices and availability instantly</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2" />
              <span>No login required for customers</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2" />
              <span>Perfect for marketing and customer outreach</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.isPopular ? 'ring-2 ring-purple-500 shadow-xl' : 'shadow-lg'}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className={`px-4 py-1 text-sm font-medium ${
                    plan.badge === 'Most Popular' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    <Star className="h-3 w-3 mr-1" />
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${
                  plan.id === 'basic' ? 'bg-blue-100 text-blue-700' :
                  plan.id === 'professional' ? 'bg-purple-100 text-purple-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  {getPlanIcon(plan.id)}
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                <p className="text-gray-600 mt-2">{plan.description}</p>
                
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(plan.basePrice)}
                  </span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Platform Access */}
                <div className="flex items-center text-sm">
                  <Smartphone className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Mobile App</span>
                  <Check className="h-4 w-4 ml-auto text-green-500" />
                </div>
                
                <div className="flex items-center text-sm">
                  <Globe className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Web Dashboard</span>
                  {plan.platform === 'mobile+web' ? (
                    <Check className="h-4 w-4 ml-auto text-green-500" />
                  ) : (
                    <X className="h-4 w-4 ml-auto text-red-400" />
                  )}
                </div>

                {/* Limits */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Products</span>
                    <span className="font-medium">{plan.limits.products === -1 ? 'Unlimited' : plan.limits.products.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Customers</span>
                    <span className="font-medium">{plan.limits.customers === -1 ? 'Unlimited' : plan.limits.customers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Users</span>
                    <span className="font-medium">{plan.limits.users === -1 ? 'Unlimited' : plan.limits.users}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Outlets</span>
                    <span className="font-medium">{plan.limits.outlets === -1 ? 'Unlimited' : plan.limits.outlets}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Orders</span>
                    <span className="font-medium">{plan.limits.orders === -1 ? 'Unlimited' : plan.limits.orders.toLocaleString()}</span>
                  </div>
                </div>

                {/* Product Public Check */}
                <div className="border-t pt-4">
                  <div className="flex items-center text-sm">
                    <LinkIcon className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="text-gray-600">Product Public Check</span>
                    <Check className="h-4 w-4 ml-auto text-green-500" />
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-4">
                  <Button 
                    className={`w-full ${
                      plan.isPopular 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    Get Started
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-12">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-xl font-bold text-gray-900">Feature Comparison</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Features
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Basic
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Professional
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comparison.features.map((feature, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {feature.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {typeof feature.basic === 'boolean' ? (
                        feature.basic ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-400 mx-auto" />
                        )
                      ) : (
                        feature.basic
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {typeof feature.professional === 'boolean' ? (
                        feature.professional ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-400 mx-auto" />
                        )
                      ) : (
                        feature.professional
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {typeof feature.enterprise === 'boolean' ? (
                        feature.enterprise ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-400 mx-auto" />
                        )
                      ) : (
                        feature.enterprise
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What is Product Public Check?
              </h3>
              <p className="text-gray-600">
                Product Public Check allows you to share your product catalog with customers via public links. 
                Customers can view your products and pricing without needing to log in or create an account. 
                Perfect for marketing, social media sharing, and customer outreach.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I upgrade my plan later?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade your plan at any time. Your billing will be prorated, 
                and you'll immediately get access to the higher limits and features.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens if I exceed my plan limits?
              </h3>
              <p className="text-gray-600">
                If you exceed your plan limits, you'll need to upgrade to a higher plan. 
                We'll notify you when you're approaching your limits so you can plan accordingly.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! All plans come with a 14-day free trial. You can explore all features 
                and see if our platform fits your business needs before committing to a paid plan.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of rental businesses already using our platform
          </p>
          <div className="space-x-4">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg">
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}