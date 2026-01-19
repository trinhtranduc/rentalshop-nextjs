'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Logo, LanguageSwitcher, Card, CardContent, Badge } from '@rentalshop/ui';
import {
  Share2,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Users,
  ArrowRight,
  Link2,
  Copy,
  ExternalLink,
  User,
  Check
} from 'lucide-react';
import { useToast } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';

export default function AffiliateGuidePage() {
  const router = useRouter();
  const { toastSuccess } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const t = useTranslations('affiliate.guide');

  // Get referral code from user (merchant or outlet merchant)
  // Try referralLink first, fallback to tenantKey (referralLink is tenantKey)
  const merchantRef = user?.merchant as any
  const outletMerchantRef = user?.outlet?.merchant as any
  const referralCode = 
    merchantRef?.referralLink || 
    merchantRef?.tenantKey || 
    outletMerchantRef?.referralLink || 
    outletMerchantRef?.tenantKey

  // Debug: Log user data to see what we have
  useEffect(() => {
    if (user) {
      console.log('🔍 Affiliate Guide Page - User:', user)
      console.log('🔍 Affiliate Guide Page - Merchant:', user.merchant)
      console.log('🔍 Affiliate Guide Page - Outlet:', user.outlet)
      console.log('🔍 Affiliate Guide Page - Referral Code:', referralCode)
    }
  }, [user, referralCode])

  // Generate registration link with referral code
  const getRegistrationLink = () => {
    if (!referralCode) return null
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_CLIENT_URL || 'https://dev.anyrent.shop'
    return `${baseUrl}/register?referralCode=${referralCode}`
  }

  const registrationLink = getRegistrationLink()

  // Copy registration link to clipboard
  const handleCopyLink = async () => {
    if (!registrationLink) return
    try {
      await navigator.clipboard.writeText(registrationLink)
      setCopied(true)
      toastSuccess(t('copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header - Similar to landing page */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Logo 
                size="md" 
                variant="custom" 
                src="/anyrent-logo-light.svg"
                showLabel={true}
                labelText="AnyRent"
                showBackground={false}
              />
            </Link>
            <div className="flex items-center gap-4">
              <LanguageSwitcher variant="compact" />
              {user ? (
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="default"
                  className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  {user.name || 'User'}
                </Button>
              ) : (
                <Button
                  asChild
                  variant="default"
                  className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  <Link href="/login">
                    {t('login')}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-full mb-6">
            <Share2 className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            {t('subtitle')}
          </p>
        </div>

        {/* Affiliate Link Card - Only show if user is logged in and has referral code */}
        {user && registrationLink && (
          <Card className="mb-8 border-2 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Share2 className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('yourLink')}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border border-orange-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 break-all font-mono">{registrationLink}</span>
                </div>
                <Button
                  onClick={handleCopyLink}
                  variant={copied ? "outline" : "default"}
                  size="sm"
                  className={`flex items-center gap-2 whitespace-nowrap ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      {t('copy')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Section */}
        <Card className="mb-8 border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center p-3 bg-orange-200 rounded-lg mb-4">
                  <DollarSign className="h-6 w-6 text-orange-700" />
                </div>
                <div className="text-3xl font-bold text-orange-700 mb-2">10%</div>
                <div className="text-sm text-gray-600">{t('overview.commission')}</div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center p-3 bg-orange-200 rounded-lg mb-4">
                  <TrendingUp className="h-6 w-6 text-orange-700" />
                </div>
                <div className="text-3xl font-bold text-orange-700 mb-2">{t('overview.autoPayment')}</div>
                <div className="text-sm text-gray-600">{t('overview.payment')}</div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center p-3 bg-orange-200 rounded-lg mb-4">
                  <Users className="h-6 w-6 text-orange-700" />
                </div>
                <div className="text-3xl font-bold text-orange-700 mb-2">{t('overview.unlimitedLabel')}</div>
                <div className="text-sm text-gray-600">{t('overview.unlimited')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{t('howItWorks.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-700 font-bold text-xl mb-4">
                  1
                </div>
                <h3 className="font-semibold text-lg mb-2">{t('howItWorks.step1.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('howItWorks.step1.description')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-700 font-bold text-xl mb-4">
                  2
                </div>
                <h3 className="font-semibold text-lg mb-2">{t('howItWorks.step2.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('howItWorks.step2.description')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-700 font-bold text-xl mb-4">
                  3
                </div>
                <h3 className="font-semibold text-lg mb-2">{t('howItWorks.step3.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('howItWorks.step3.description')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Commission Details */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('commissionDetails.title')}</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{t('commissionDetails.rate.label')}</span>
                  <Badge variant="default" className="text-lg bg-orange-600">10%</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {t('commissionDetails.rate.description')}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{t('commissionDetails.payment.label')}</span>
                  <Badge variant="default" className="bg-green-600">{t('overview.autoPayment')}</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {t('commissionDetails.payment.description')}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{t('commissionDetails.tracking.label')}</span>
                  <Badge variant="default" className="bg-blue-600">Real-time</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {t('commissionDetails.tracking.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Calculation */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('examples.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">{t('examples.example1.title')}</span>
                </div>
                <div className="ml-7 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('examples.example1.label1')}</span>
                    <span className="font-medium">1,000,000 VND</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('examples.example1.label2')}</span>
                    <span className="text-blue-600">{t('examples.example1.confirmed')}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-gray-600">{t('examples.example1.label3')}</span>
                    <span className="font-bold text-green-600">100,000 VND</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">{t('examples.example2.title')}</span>
                </div>
                <div className="ml-7 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('examples.example2.label1')}</span>
                    <span className="font-medium">5,000,000 VND</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('examples.example2.label2')}</span>
                    <span className="text-blue-600">{t('examples.example2.confirmed')}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-gray-600">{t('examples.example2.label3')}</span>
                    <span className="font-bold text-green-600">500,000 VND</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: t('examples.note') }} />
            </div>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('tips.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">{t('tips.tip1.title')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('tips.tip1.description')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">{t('tips.tip2.title')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('tips.tip2.description')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">{t('tips.tip3.title')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('tips.tip3.description')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">{t('tips.tip4.title')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('tips.tip4.description')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="border-2 border-orange-500 bg-gradient-to-r from-orange-50 to-orange-100">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">{t('cta.title')}</h3>
            <p className="text-gray-600 mb-6">
              {t('cta.description')}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="default"
                onClick={() => router.push('/register')}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
              >
                {t('cta.register')}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/login')}
                className="flex items-center gap-2"
              >
                {t('cta.login')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer - Simple */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>© 2025 AnyRent. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
