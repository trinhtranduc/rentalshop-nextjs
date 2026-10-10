'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
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
import {
  COMPARISON_NAME_KEYS,
  formatComparisonValue,
  formatPlanLimit,
  formatPricingPrice,
  planTextKeys,
} from '../../lib/pricing-format';

export default function PricingClient() {
  const t = useTranslations('plans.pricingPage');
  const locale = useLocale();
  const plans = Object.values(SUBSCRIPTION_PLANS).sort((a, b) => a.sortOrder - b.sortOrder);
  const comparison = getPlanComparison();

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'trial': return <Zap className="h-6 w-6" />;
      case 'basic': return <Zap className="h-6 w-6" />;
      case 'professional': return <Shield className="h-6 w-6" />;
      case 'enterprise': return <Building className="h-6 w-6" />;
      default: return <Package className="h-6 w-6" />;
    }
  };

  const formatPrice = (price: number) => formatPricingPrice(price, locale);
  const limit = (value: number) => formatPlanLimit(value, locale, t('unlimited'));
  const cell = (value: string | boolean) => (typeof value === 'string' ? formatComparisonValue(value, locale) : value);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Product Public Check Feature Highlight */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-12">
          <div className="flex items-center mb-4">
            <LinkIcon className="h-8 w-8 text-blue-700 mr-3" />
            <h2 className="text-2xl font-bold text-blue-900">{t('publicCheckTitle')}</h2>
          </div>
          <p className="text-blue-800 mb-4">
            {t('publicCheckIntro')}
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2" />
              <span>{t('publicCheck1')}</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2" />
              <span>{t('publicCheck2')}</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2" />
              <span>{t('publicCheck3')}</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2" />
              <span>{t('publicCheck4')}</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const keys = planTextKeys(plan.id, plan.badge);
            return (
            <Card key={plan.id} className={`relative ${plan.isPopular ? 'ring-2 ring-purple-500 shadow-xl' : 'shadow-lg'}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className={`px-4 py-1 text-sm font-medium ${
                    plan.badge === 'Most Popular' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    <Star className="h-3 w-3 mr-1" />
                    {keys.badge ? t(keys.badge) : plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${
                  plan.id === 'trial' ? 'bg-green-100 text-green-700' :
                  plan.id === 'basic' ? 'bg-blue-100 text-blue-700' :
                  plan.id === 'professional' ? 'bg-purple-100 text-purple-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  {getPlanIcon(plan.id)}
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">{keys.name ? t(keys.name) : plan.name}</CardTitle>
                <p className="text-gray-600 mt-2">{keys.description ? t(keys.description) : plan.description}</p>
                
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(plan.basePrice)}
                  </span>
                  <span className="text-gray-500 ml-2">{t('perMonth')}</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Platform Access */}
                <div className="flex items-center text-sm">
                  <Smartphone className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">{t('mobileApp')}</span>
                  <Check className="h-4 w-4 ml-auto text-green-500" />
                </div>
                
                <div className="flex items-center text-sm">
                  <Globe className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">{t('webDashboard')}</span>
                  {plan.platform === 'mobile+web' ? (
                    <Check className="h-4 w-4 ml-auto text-green-500" />
                  ) : (
                    <X className="h-4 w-4 ml-auto text-red-400" />
                  )}
                </div>

                {/* Limits */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('products')}</span>
                    <span className="font-medium">{limit(plan.limits.products)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('customers')}</span>
                    <span className="font-medium">{limit(plan.limits.customers)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('users')}</span>
                    <span className="font-medium">{limit(plan.limits.users)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('outlets')}</span>
                    <span className="font-medium">{limit(plan.limits.outlets)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('orders')}</span>
                    <span className="font-medium">{limit(plan.limits.orders)}</span>
                  </div>
                </div>

                {/* Product Public Check */}
                <div className="border-t pt-4">
                  <div className="flex items-center text-sm">
                    <LinkIcon className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="text-gray-600">{t('publicCheckTitle')}</span>
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
                    {t('getStarted')}
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-12">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-xl font-bold text-gray-900">{t('comparisonTitle')}</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('comparisonFeatures')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('planBasic')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('planProfessional')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('planEnterprise')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comparison.features.map((feature, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {COMPARISON_NAME_KEYS[feature.name] ? t(COMPARISON_NAME_KEYS[feature.name]) : feature.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {typeof feature.basic === 'boolean' ? (
                        feature.basic ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-400 mx-auto" />
                        )
                      ) : (
                        cell(feature.basic)
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
                        cell(feature.professional)
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
                        cell(feature.enterprise)
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('faqTitle')}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('faq1q')}
              </h3>
              <p className="text-gray-600">
                {t('faq1a')}
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('faq2q')}
              </h3>
              <p className="text-gray-600">
                {t('faq2a')}
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('faq3q')}
              </h3>
              <p className="text-gray-600">
                {t('faq3a')}
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('faq4q')}
              </h3>
              <p className="text-gray-600">
                {t('faq4a')}
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('ctaTitle')}
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            {t('ctaSubtitle')}
          </p>
          <div className="space-x-4">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
              {t('startTrial')}
            </Button>
            <Button variant="outline" size="lg">
              {t('contactSales')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}