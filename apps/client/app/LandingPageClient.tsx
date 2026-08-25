'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button, LanguageSwitcher, Card, CardContent, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@rentalshop/ui'
import { publicPlansApi, translatePlanFeature } from '@rentalshop/utils'
import { usePlansTranslations, useAuth } from '@rentalshop/hooks'
import type { Plan } from '@rentalshop/types'
import { createSchemas, createFAQSchema } from './lib/schemas'
import { getAnyRentLogoUrl } from '../lib/brand'
import { LandingBrandLogo } from './components/LandingBrandLogo'
import PublicSiteFooter from './components/PublicSiteFooter'
import { StoreBadges } from './components/StoreBadges'
import {
  SoftSkyStage,
  softSkyBadgeClass,
  softSkyCardClass,
  softSkyIconBoxClass,
} from './components/LandingAtmosphere'
import {
  FeatureSpotlight,
  SoftPhoneFrame,
  SoftPhotoCard,
} from './components/FeatureSpotlight'

// Import Blog Section (Client Component that calls API) - lazy loaded
import dynamic from 'next/dynamic'
const BlogSection = dynamic(() => import('./components/BlogSection'), {
  loading: () => <div className="py-24 bg-[#F4F8FC]" />,
  ssr: false,
})
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  Shield, 
  Users, 
  User,
  BarChart3, 
  Clock, 
  DollarSign,
  Star,
  Mail,
  MapPin,
  ExternalLink,
  AlertTriangle,
  X,
  Sparkles,
  ShoppingBag,
  Zap,
  Loader2,
  MessageCircle,
  Briefcase,
  ArrowRight,
  Info,
  HelpCircle,
  Send,
  Camera,
  Search,
  Brain,
  Phone
} from 'lucide-react'

const LandingPage = () => {
  const t = useTranslations('landing')
  const router = useRouter()
  const { user } = useAuth()
  
  // Structured Data for SEO (JSON-LD)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structuredData: any = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AnyRent',
    applicationCategory: 'BusinessApplication',
    operatingSystem: ['iOS', 'Android', 'Web'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'VND',
    },
    description: t('hero.description'),
    url: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationData: any = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AnyRent',
    url: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop',
    logo: getAnyRentLogoUrl(),
    description: t('hero.description'),
    sameAs: [
      'https://apps.apple.com/vn/app/anyrent/id6754793592',
      'https://play.google.com/store/apps/details?id=anyrent.shop',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['Vietnamese', 'English', 'Chinese', 'Korean', 'Japanese'],
    },
  };

  // BreadcrumbList Structured Data for SEO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const breadcrumbData: any = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t('navigation.features'),
        item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}/features`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: t('navigation.pricing'),
        item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}/pricing`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: t('download.title'),
        item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}/download`,
      },
      {
        '@type': 'ListItem',
        position: 5,
        name: t('aiSearch.title'),
        item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}/tim-san-pham-bang-hinh-anh`,
      },
      {
        '@type': 'ListItem',
        position: 6,
        name: t('navigation.faq'),
        item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}/#faq`,
      },
      {
        '@type': 'ListItem',
        position: 7,
        name: t('navigation.contact'),
        item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}/#contact`,
      },
    ],
  };

  // Article Schema for landing page content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articleData: any = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: t('hero.title') + ' ' + t('hero.subtitle'),
    description: t('hero.description'),
    author: {
      '@type': 'Organization',
      name: 'AnyRent',
    },
    publisher: {
      '@type': 'Organization',
      name: 'AnyRent',
      logo: {
        '@type': 'ImageObject',
        url: getAnyRentLogoUrl(),
      },
    },
    datePublished: '2024-01-01',
    dateModified: new Date().toISOString().split('T')[0],
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop',
    },
  };

  // LocalBusiness Schema for Vietnam targeting
  const baseUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop';
  const logoUrl = getAnyRentLogoUrl(baseUrl);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localBusinessData: any = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'AnyRent',
    description: t('hero.description'),
    url: baseUrl,
    logo: logoUrl,
    image: logoUrl,
    priceRange: '$$',
    telephone: '+84764774647',
    email: 'trinhduc20@gmail.com',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'VN',
      addressLocality: 'Vietnam',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 16.0544,
      longitude: 108.2022,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
  };

  // Review Schema with testimonials
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviewsData: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'AnyRent',
    description: t('hero.description'),
    brand: {
      '@type': 'Brand',
      name: 'AnyRent',
    },
    review: [
      {
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: 'Áo Dài Shop Owner',
        },
        datePublished: '2025-01-15',
        reviewBody: 'AnyRent đã giúp tôi quản lý cửa hàng cho thuê áo dài một cách hiệu quả và chuyên nghiệp.',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: '5',
          bestRating: '5',
        },
      },
      {
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: 'Wedding Dress Rental Manager',
        },
        datePublished: '2025-01-10',
        reviewBody: 'Tính năng quản lý đơn hàng rất tiện lợi. Tôi có thể theo dõi tất cả đơn hàng cho thuê áo cưới dễ dàng.',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: '5',
          bestRating: '5',
        },
      },
      {
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: 'Equipment Rental Business Owner',
        },
        datePublished: '2025-01-05',
        reviewBody: 'Ứng dụng di động rất tiện lợi. Tôi có thể quản lý cho thuê thiết bị từ bất kỳ đâu.',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: '5',
          bestRating: '5',
        },
      },
    ],
  };

  // WebSite Schema with search action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const websiteData: any = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AnyRent',
    url: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  } as Record<string, any>;

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
      />
      
    <div className="min-h-screen bg-[#F4F8FC] overflow-x-hidden">
      
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-sky-100/80 sticky top-0 z-50" role="banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                <LandingBrandLogo />
              </Link>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/features" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">{t('navigation.features')}</Link>
                <Link href="/pricing" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">{t('navigation.pricing')}</Link>
                <a href="#faq" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">{t('navigation.faq')}</a>
                <a href="#contact" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">{t('navigation.contact')}</a>
                <LanguageSwitcher variant="compact" />
                {user ? (
                  <Button
                    onClick={() => router.push('/dashboard')}
                    variant="default"
                    className="bg-sky-800 text-white hover:bg-sky-900 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    {user.name || user.email || 'User'}
                  </Button>
                ) : (
                <Button
                  asChild
                  variant="default"
                  className="bg-sky-800 text-white hover:bg-sky-900 rounded-xl px-4 py-2 text-sm font-medium"
                >
                  <Link href="/login">
                    {t('navigation.login')}
                  </Link>
                </Button>
                )}
              </div>
              <div className="md:hidden flex items-center space-x-3">
                <LanguageSwitcher variant="compact" />
                {user ? (
                  <Button
                    onClick={() => router.push('/dashboard')}
                    variant="default"
                    className="bg-sky-800 text-white hover:bg-sky-900 rounded-xl px-3 py-1.5 text-sm font-medium flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    {user.name || user.email || 'User'}
                  </Button>
                ) : (
                <Button
                  asChild
                  variant="default"
                  className="bg-sky-800 text-white hover:bg-sky-900 rounded-xl px-3 py-1.5 text-sm font-medium"
                >
                  <Link href="/login">
                    {t('navigation.login')}
                  </Link>
                </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Hero — soft sky, photo-first */}
        <SoftSkyStage tone="mist" className="min-h-[88vh] flex items-center">
          <section
            className="relative w-full"
            aria-label="Hero section"
          >
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div className="text-left">
                  <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-sky-800 backdrop-blur-sm">
                    <Sparkles className="h-3.5 w-3.5 text-sky-700" />
                    AnyRent · iOS · Android &amp; Web
                  </p>

                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-4">
                    {t('hero.title')}
                  </h1>
                  <p className="text-xl sm:text-2xl font-medium text-slate-700 mb-5">
                    {t('hero.subtitle')}
                  </p>
                  <p className="sr-only">{t('hero.description')}</p>
                  <p className="text-base sm:text-lg text-slate-600 mb-10 max-w-xl leading-relaxed">
                    Quản lý đơn thuê, lịch &amp; sản phẩm trên một app — dùng thử miễn phí.
                  </p>

                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4">
                    <StoreBadges tone="dark" />
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="border-2 border-sky-200 bg-white text-sky-900 hover:bg-sky-50 hover:border-sky-300 rounded-xl px-8 py-3 text-base font-medium h-10"
                    >
                      <Link href="/login">
                        <Globe className="w-5 h-5 mr-2" />
                        {t('hero.tryWebPortal')}
                      </Link>
                    </Button>
                  </div>

                  <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>500+ Active Stores</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-current" />
                      <span>4.9/5 Rating</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-sky-700" />
                      <span>Secure &amp; Reliable</span>
                    </div>
                  </div>
                </div>

                <div className="relative flex justify-center lg:justify-end">
                  <div className="relative w-full max-w-[560px]">
                    <div
                      className="absolute inset-4 rounded-[2rem] bg-gradient-to-br from-sky-100/80 via-white to-slate-100/70"
                      aria-hidden="true"
                    />
                    <div className="relative overflow-hidden rounded-[1.75rem] border border-white shadow-[0_28px_50px_-18px_rgba(15,55,95,0.35)] ring-1 ring-sky-100/70 bg-white">
                      <Image
                        src="/anyrent-landing-hero-soft.png"
                        alt="AnyRent rental shop management on mobile in a boutique"
                        width={1280}
                        height={720}
                        priority
                        className="w-full h-auto object-cover"
                        sizes="(max-width: 1024px) 100vw, 560px"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </SoftSkyStage>

        {/* 3 main features — soft-sky spotlights */}
        <FeatureSpotlight
          id="ai-search"
          ariaLabel="AI Image Search feature"
          badgeIcon={Brain}
          badge={t('aiSearch.badge')}
          title={t('aiSearch.title')}
          description={t('aiSearch.description')}
          tone="mist"
          steps={[
            { icon: Camera, title: t('aiSearch.feature1Title'), desc: t('aiSearch.feature1Desc'), step: '01' },
            { icon: Search, title: t('aiSearch.feature2Title'), desc: t('aiSearch.feature2Desc'), step: '02' },
            { icon: Zap, title: t('aiSearch.feature3Title'), desc: t('aiSearch.feature3Desc'), step: '03' },
          ]}
          cta={
            <Link
              href="/tim-san-pham-bang-hinh-anh"
              className="inline-flex items-center text-sm font-semibold text-sky-800 hover:text-sky-950 underline-offset-4 hover:underline"
            >
              Tìm hiểu tìm sản phẩm bằng hình ảnh AI →
            </Link>
          }
          visual={
            <div className="relative w-full max-w-[420px] mx-auto lg:mx-0 min-h-[520px] sm:min-h-[560px]">
              <div
                className="absolute inset-x-6 top-10 bottom-8 rounded-[2.5rem] bg-gradient-to-br from-sky-100/80 via-white to-slate-100/70"
                aria-hidden="true"
              />
              <div className="absolute left-1/2 top-0 z-20 w-[58%] max-w-[240px] -translate-x-1/2">
                <SoftPhoneFrame src="/anyrent-ai-phone-results.png" alt={t('aiSearch.phoneAlt')} />
              </div>
              <div className="absolute left-0 top-16 z-30 w-[38%] max-w-[150px] sm:left-2 sm:top-20">
                <SoftPhotoCard
                  src="/anyrent-ai-query-aodai.png"
                  alt={t('aiSearch.queryAlt')}
                  rotate="rotate-[-6deg]"
                  width={640}
                  height={640}
                  sizes="150px"
                  className="border-2"
                />
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-sky-800 shadow-sm border border-sky-100 -rotate-6">
                  <Camera className="w-3 h-3" />
                  <span>Snap</span>
                </div>
              </div>
              <div className="absolute right-0 bottom-6 z-30 w-[72%] max-w-[280px] sm:right-0 sm:bottom-8">
                <SoftPhotoCard
                  src="/anyrent-ai-match-results.png"
                  alt={t('aiSearch.matchesAlt')}
                  rotate="rotate-[3deg]"
                  className="ring-emerald-100/80"
                />
                <div className="mt-2 ml-auto mr-1 flex w-fit items-center gap-1.5 rounded-full bg-emerald-50/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm border border-emerald-100 rotate-[3deg]">
                  <Check className="w-3 h-3" />
                  <span>{t('aiSearch.matchFound')}</span>
                </div>
              </div>
            </div>
          }
        />

        <FeatureSpotlight
          id="duplicate-prevention"
          ariaLabel="Duplicate order prevention feature"
          badgeIcon={AlertTriangle}
          badge={t('duplicatePrevention.badge')}
          title={t('duplicatePrevention.title')}
          description={t('duplicatePrevention.description')}
          tone="white"
          reverse
          steps={[
            { icon: Clock, title: t('duplicatePrevention.feature1Title'), desc: t('duplicatePrevention.feature1Desc'), step: '01' },
            { icon: AlertTriangle, title: t('duplicatePrevention.feature2Title'), desc: t('duplicatePrevention.feature2Desc'), step: '02' },
            { icon: Shield, title: t('duplicatePrevention.feature3Title'), desc: t('duplicatePrevention.feature3Desc'), step: '03' },
          ]}
          visual={
            <div className="relative w-full max-w-[420px] mx-auto lg:mx-0 min-h-[520px] sm:min-h-[560px]">
              <div
                className="absolute inset-x-6 top-10 bottom-8 rounded-[2.5rem] bg-gradient-to-br from-sky-100/80 via-white to-amber-50/50"
                aria-hidden="true"
              />
              <div className="absolute left-1/2 top-0 z-20 w-[58%] max-w-[240px] -translate-x-1/2">
                <SoftPhoneFrame
                  src="/anyrent-landing-duplicate-calendar.png"
                  alt={t('duplicatePrevention.calendarAlt')}
                />
              </div>
              <div className="absolute right-0 bottom-10 z-30 w-[70%] max-w-[270px] sm:right-1">
                <SoftPhotoCard
                  src="/anyrent-landing-duplicate-alert.png"
                  alt={t('duplicatePrevention.alertAlt')}
                  rotate="rotate-[4deg]"
                  width={800}
                  height={800}
                  sizes="270px"
                  className="ring-amber-100/80"
                />
                <div className="mt-2 ml-auto flex w-fit items-center gap-1.5 rounded-full bg-amber-50/95 px-2.5 py-1 text-[11px] font-semibold text-amber-800 shadow-sm border border-amber-100 rotate-[4deg]">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{t('duplicatePrevention.blockedLabel')}</span>
                </div>
              </div>
            </div>
          }
        />

        <FeatureSpotlight
          id="order-workflow"
          ariaLabel="Rental order workflow feature"
          badgeIcon={BarChart3}
          badge={t('orderWorkflow.badge')}
          title={t('orderWorkflow.title')}
          description={t('orderWorkflow.description')}
          tone="mist"
          steps={[
            { icon: ShoppingBag, title: t('orderWorkflow.feature1Title'), desc: t('orderWorkflow.feature1Desc'), step: '01' },
            { icon: Check, title: t('orderWorkflow.feature2Title'), desc: t('orderWorkflow.feature2Desc'), step: '02' },
            { icon: Clock, title: t('orderWorkflow.feature3Title'), desc: t('orderWorkflow.feature3Desc'), step: '03' },
          ]}
          visual={
            <div className="relative w-full max-w-[420px] mx-auto lg:mx-0 min-h-[520px] sm:min-h-[560px]">
              <div
                className="absolute inset-x-6 top-10 bottom-8 rounded-[2.5rem] bg-gradient-to-br from-sky-100/80 via-white to-slate-100/70"
                aria-hidden="true"
              />
              <div className="absolute left-1/2 top-0 z-20 w-[58%] max-w-[240px] -translate-x-1/2">
                <SoftPhoneFrame
                  src="/anyrent-landing-order-phone.png"
                  alt={t('orderWorkflow.phoneAlt')}
                />
              </div>
              <div className="absolute left-0 right-0 bottom-6 z-30 px-2 sm:px-0">
                <SoftPhotoCard
                  src="/anyrent-landing-order-flow-strip.png"
                  alt={t('orderWorkflow.flowAlt')}
                  rotate="rotate-[-2deg]"
                  sizes="380px"
                />
                <div className="mt-2 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-sky-800 shadow-sm border border-sky-100 -rotate-2">
                  <Check className="w-3 h-3" />
                  <span>{t('orderWorkflow.flowLabel')}</span>
                </div>
              </div>
            </div>
          }
        />

        {/* Features — secondary cards + view details */}
        <SoftSkyStage tone="white" className="py-24 md:py-28">
        <section id="features" className="relative" aria-label="Features section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="outline" className={softSkyBadgeClass}>
                <Sparkles className="w-4 h-4 mr-2 text-sky-700" />
                Features
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                {t('features.title')}
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                {t('features.description')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <Card className={softSkyCardClass}>
                <CardContent className="p-6">
                  <div className={`${softSkyIconBoxClass} mb-4`}>
                    <Users className="w-5 h-5 text-sky-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('features.customerManagement')}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{t('features.customerManagementDesc')}</p>
                </CardContent>
              </Card>

              <Card className={softSkyCardClass}>
                <CardContent className="p-6">
                  <div className={`${softSkyIconBoxClass} mb-4`}>
                    <Clock className="w-5 h-5 text-sky-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('features.calendarScheduling')}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{t('features.calendarSchedulingDesc')}</p>
                </CardContent>
              </Card>
            
              <Card className={softSkyCardClass}>
                <CardContent className="p-6">
                  <div className={`${softSkyIconBoxClass} mb-4`}>
                    <DollarSign className="w-5 h-5 text-sky-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('features.financialReports')}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{t('features.financialReportsDesc')}</p>
                </CardContent>
              </Card>
            
              <Card className={softSkyCardClass}>
                <CardContent className="p-6">
                  <div className={`${softSkyIconBoxClass} mb-4`}>
                    <Sparkles className="w-5 h-5 text-sky-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('features.multiPlatform')}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{t('features.multiPlatformDesc')}</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-12 text-center">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-sky-200 text-sky-900 hover:bg-sky-50 hover:border-sky-300 rounded-xl px-8 py-3 text-base font-medium transition-all duration-200"
              >
                <Link href="/features">
                  <ArrowRight className="w-5 h-5 mr-2" />
                  {t('features.viewAllFeatures')}
                </Link>
              </Button>
            </div>
            
            <div className="mt-16 pt-12 border-t border-sky-100">
              <h3 className="text-2xl md:text-3xl font-bold text-center text-slate-900 mb-3">Giải pháp theo ngành nghề</h3>
              <p className="text-center text-slate-500 mb-10 max-w-xl mx-auto">Phần mềm được tối ưu cho từng loại hình kinh doanh cho thuê</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {[
                  { href: '/cho-thue-ao-dai', title: 'Cho thuê Áo dài', desc: 'Quản lý kho theo size, màu. Lịch đặt tránh trùng đơn.' },
                  { href: '/cho-thue-ao-cuoi', title: 'Cho thuê Áo cưới', desc: 'Bộ sưu tập, lịch hẹn thử, gói combo cưới trọn vẹn.' },
                  { href: '/cho-thue-trang-thiet-bi', title: 'Cho thuê Thiết bị', desc: 'Theo dõi tình trạng, lịch bảo trì, hợp đồng cho thuê.' },
                  { href: '/cho-thue-trang-phuc', title: 'Cho thuê Trang phục', desc: 'Biểu diễn, cosplay, sự kiện. Quản lý size và phụ kiện.' },
                ].map((item) => (
                  <Card key={item.href} className={softSkyCardClass}>
                    <Link href={item.href} className="block">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
        </SoftSkyStage>

      {/* Custom Solution Contact Section */}
      <SoftSkyStage tone="white" className="py-24 md:py-28">
      <section id="custom-solution" className="relative" aria-label="Custom solution contact section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-sky-100 shadow-sm mb-6">
              <Briefcase className="w-7 h-7 text-sky-700" />
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              {t('customSolution.title')}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t('customSolution.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Benefits Card */}
            <Card className={softSkyCardClass}>
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold mb-6 text-slate-900">{t('customSolution.benefits.title')}</h3>
                <ul className="space-y-4">
                  {[
                    'customSolution.benefits.customized',
                    'customSolution.benefits.dedicated',
                    'customSolution.benefits.scalable',
                    'customSolution.benefits.integration'
                  ].map((key, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-sky-50 border border-sky-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-sky-700" />
                      </div>
                      <span className="text-slate-700 text-sm">{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Contact Card */}
            <Card className={softSkyCardClass}>
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold mb-6 text-slate-900">{t('customSolution.contact.title')}</h3>
                <p className="text-slate-600 mb-6 text-sm">
                  {t('customSolution.contact.description')}
                </p>
                
                <div className="space-y-4">
                  {/* Email */}
                  <a
                    href={`mailto:trinhduc20@gmail.com?subject=${encodeURIComponent(t('customSolution.contact.emailSubject'))}&body=${encodeURIComponent(t('customSolution.contact.emailBody'))}`}
                    className="flex items-center space-x-4 p-4 bg-sky-50/80 hover:bg-sky-50 rounded-xl transition-all duration-200 border border-sky-100 hover:border-sky-200 group"
                  >
                    <div className="w-12 h-12 bg-white border border-sky-100 rounded-xl flex items-center justify-center group-hover:border-sky-200 transition-colors">
                      <Mail className="w-6 h-6 text-sky-700" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-500 mb-1">{t('customSolution.contact.email')}</div>
                      <div className="text-slate-900 font-semibold text-sm">trinhduc20@gmail.com</div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-sky-700 transition-colors" />
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/840764774647?text=${encodeURIComponent(t('customSolution.contact.whatsappMessage'))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 p-4 bg-sky-50/80 hover:bg-sky-50 rounded-xl transition-all duration-200 border border-sky-100 hover:border-sky-200 group"
                  >
                    <div className="w-12 h-12 bg-[#25D366]/15 rounded-xl flex items-center justify-center group-hover:bg-[#25D366]/25 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#25D366">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-500 mb-1">WhatsApp</div>
                      <div className="text-slate-900 font-semibold text-sm">0764774647</div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-sky-700 transition-colors" />
                  </a>
                  
                  {/* Zalo with QR Code */}
                  <div className="flex items-start space-x-4 p-4 bg-sky-50/80 rounded-xl border border-sky-100">
                    <div className="w-12 h-12 bg-[#0068FF]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none">
                        <path d="M12.5 7h23A5.5 5.5 0 0 1 41 12.5v23a5.5 5.5 0 0 1-5.5 5.5h-23A5.5 5.5 0 0 1 7 35.5v-23A5.5 5.5 0 0 1 12.5 7z" fill="#0068FF"/>
                        <path d="M31.2 18.6H17.8c-.5 0-.8.4-.8.8v1.1c0 .4.3.8.8.8h8.5l-9.1 9.3c-.3.3-.1.9.4.9h13.4c.5 0 .8-.4.8-.8v-1.1c0-.4-.3-.8-.8-.8H22l9.5-9.3c.3-.3.1-.9-.3-.9z" fill="white"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-500 mb-1">Zalo</div>
                      <div className="text-slate-900 font-semibold text-sm mb-3">0764774647</div>
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <Image
                            src="/image/qrcode-0764774647.jpeg"
                            alt="Zalo QR Code"
                            width={100}
                            height={100}
                            className="rounded-lg border border-sky-100"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-2">
                            Quét mã QR để liên hệ Zalo
                          </p>
                          <a
                            href="https://zalo.me/0764774647"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0068FF] text-white rounded-lg hover:bg-[#0052CC] transition-colors text-xs font-medium"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Mở Zalo
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Telegram */}
                  <a
                    href="https://t.me/0764774647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 p-4 bg-sky-50/80 hover:bg-sky-50 rounded-xl transition-all duration-200 border border-sky-100 hover:border-sky-200 group"
                  >
                    <div className="w-12 h-12 bg-[#0088cc]/15 rounded-xl flex items-center justify-center group-hover:bg-[#0088cc]/25 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#0088cc">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-500 mb-1">Telegram</div>
                      <div className="text-slate-900 font-semibold text-sm">0764774647</div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-sky-700 transition-colors" />
                  </a>
                </div>

                <div className="mt-6 pt-6 border-t border-sky-100">
                  <p className="text-sm text-slate-500 text-center">
                    {t('customSolution.contact.responseTime')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      </SoftSkyStage>

      {/* Why Choose Us Section */}
      <SoftSkyStage tone="mist" className="py-24 md:py-28">
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className={softSkyBadgeClass}>
              <Star className="w-4 h-4 mr-2 text-sky-700" />
              Why Choose Us
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              {t('whyChoose.title')}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {t('whyChoose.description')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                { icon: Star, title: t('whyChoose.easyToUse'), desc: t('whyChoose.easyToUseDesc') },
                { icon: Clock, title: t('whyChoose.timeSaving'), desc: t('whyChoose.timeSavingDesc') },
                { icon: DollarSign, title: t('whyChoose.increaseRevenue'), desc: t('whyChoose.increaseRevenueDesc') },
                { icon: Shield, title: t('whyChoose.support'), desc: t('whyChoose.supportDesc') },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className={softSkyIconBoxClass}>
                    <Icon className="w-5 h-5 text-sky-700" />
                  </div>
                  <div className="pt-0.5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="relative">
              <Card className={`${softSkyCardClass} p-10`}>
                <CardContent className="p-0">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <Zap className="w-8 h-8 mr-3 text-sky-600" />
                      <div className="text-6xl font-extrabold text-slate-900">500+</div>
                    </div>
                    <div className="text-xl mb-8 font-bold text-slate-800">{t('whyChoose.activeStores')}</div>
                    <div className="flex justify-center space-x-2 mb-6">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-6 h-6 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <div className="text-base font-semibold text-slate-700">{t('whyChoose.rating')}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      </SoftSkyStage>

      {/* Stats Section - Below the fold, lazy loaded */}
      <Stats />

      {/* Testimonials Section - Below the fold, lazy loaded */}
      <Testimonials />

      {/* CTA Section - Below the fold, lazy loaded */}
      <CTA />

      {/* FAQ Section - Below the fold, lazy loaded */}
      <FAQ />

      {/* Blog Section - Latest Posts */}
      <BlogSection 
        title={t('blog.title') || 'Latest Blog Posts'}
        subtitle={t('blog.subtitle') || 'Discover insights and tips for your rental business'}
      />

      {/* Pricing Section - Below the fold, heavy component with API calls */}
      <Pricing />

      {/* Footer - Below the fold */}
      <PublicSiteFooter />
      
      {/* FloatingButtons */}
      <FloatingButtons />
    </div>
    </>
  );
};

// Lazy load heavy components to reduce initial bundle size
const Stats = React.memo(() => {
  return (
    <SoftSkyStage tone="white" className="py-20">
    <section className="relative" aria-label="Statistics section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          {[
            { value: '500+', label: 'Active Stores' },
            { value: '500,000+', label: 'Orders Processed' },
            { value: '4.9/5', label: 'Customer Rating' },
            { value: '24/7', label: 'Support Available' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-sky-100 bg-white/80 px-4 py-8 shadow-sm">
              <div className="text-4xl font-bold text-slate-900 mb-2">{stat.value}</div>
              <div className="text-slate-600 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
    </SoftSkyStage>
  );
});

const Testimonials = React.memo(() => {
  const t = useTranslations('landing.testimonials')
  const tItems = useTranslations('landing.testimonials.items')
  
  // Get first letter of name for avatar
  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };
  
  // Unified gradient for all avatars
  const avatarGradient = 'from-brand-primary to-action-primary';
  const hoverGradient = 'from-brand-primary/5 to-action-primary/5';
  
  const testimonials = [
    { key: 'john' },
    { key: 'sarah' },
    { key: 'mike' },
    { key: 'aoDai' },
    { key: 'equipment' },
    { key: 'weddingDress' },
    { key: 'camera' }
  ] as const;
  
  return (
    <SoftSkyStage tone="mist" className="py-24 md:py-28">
    <section className="relative" aria-label="Testimonials section">
      <div className="w-full">
        <div className="text-center mb-16 px-4 sm:px-6 lg:px-8">
          <Badge variant="outline" className={softSkyBadgeClass}>
            <Star className="w-4 h-4 mr-2 text-sky-700 fill-sky-700" />
            <span className="text-sm font-medium">Testimonials</span>
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>
        
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
            {testimonials.map(({ key }) => {
              return (
                <Card 
                  key={key} 
                  className={`${softSkyCardClass} w-full md:w-[calc(33.333%-1rem)] max-w-md`}
                >
                  <CardContent className="p-6">
                    {/* Stars */}
                    <div className="flex items-center gap-1 mb-6">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className="w-5 h-5 text-yellow-500 fill-yellow-500" 
                        />
                      ))}
                    </div>
                    
                    {/* Quote */}
                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                      "{tItems(`${key}.quote`)}"
                    </p>
                    
                    {/* Author Info */}
                    <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                      <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {getInitial(tItems(`${key}.name`))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">
                          {tItems(`${key}.name`)}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {tItems(`${key}.role`)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
    </SoftSkyStage>
  );
});

const CTA = React.memo(() => {
  const t = useTranslations('landing.cta')
  const tHero = useTranslations('landing.hero')
  return (
      <SoftSkyStage tone="mist" className="py-24 md:py-28">
      <section className="relative" aria-label="Call to action section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            {t('description')}
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 justify-center items-center">
            <StoreBadges tone="dark" />
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-sky-200 bg-white text-sky-900 hover:bg-sky-50 hover:border-sky-300 rounded-xl px-8 py-3 text-base font-medium transition-all duration-200 h-10"
            >
              <Link href="/login">
                <Globe className="w-5 h-5 mr-2" />
                {tHero('tryWebPortal')}
              </Link>
            </Button>
          </div>
        </div>
    </section>
    </SoftSkyStage>
  );
});

const FAQ = React.memo(() => {
  const t = useTranslations('landing.faq')
  const [openItems, setOpenItems] = React.useState(new Set());
  
  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };
  
  const tFaq = useTranslations('landing.faq.items')
  const faqItems = [
    {
      question: tFaq('freeUse.question'),
      answer: tFaq('freeUse.answer')
    },
    {
      question: tFaq('multipleDevices.question'),
      answer: tFaq('multipleDevices.answer')
    },
    {
      question: tFaq('dataSecure.question'),
      answer: tFaq('dataSecure.answer')
    },
    {
      question: tFaq('support.question'),
      answer: tFaq('support.answer')
    }
  ];

  // FAQ Structured Data for SEO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faqStructuredData: any = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  } as Record<string, any>;
  
  return (
    <>
      {/* FAQ Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <section id="faq" className="relative py-24 md:py-28 bg-[#F4F8FC]" aria-label="Frequently asked questions">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 right-0 h-[420px] w-[420px] rounded-full bg-[#C9DEF5]/40 blur-3xl" />
        <div className="absolute bottom-0 left-[-80px] h-[360px] w-[360px] rounded-full bg-[#D7E8F8]/50 blur-3xl" />
      </div>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-600">
            {t('description')}
          </p>
        </div>
        
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <Card key={index} className={softSkyCardClass}>
              <Button
                onClick={() => toggleItem(index)}
                variant="ghost"
                className="w-full px-6 py-4 h-auto text-left flex items-center justify-between hover:bg-sky-50/50 rounded-xl"
              >
                <span className="font-semibold text-slate-900">{item.question}</span>
                {openItems.has(index) ? (
                  <ChevronUp className="w-5 h-5 text-sky-700" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </Button>
              {openItems.has(index) && (
                <div className="px-6 pb-4">
                  <p className="text-slate-600">{item.answer}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
    </>
  );
});

const Pricing = React.memo(() => {
  const tPricing = useTranslations('landing.pricing')
  const tPlans = usePlansTranslations()
  const [selectedDuration, setSelectedDuration] = useState<'3' | '6' | '12'>('3'); // '3', '6', '12'
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdditionalPricingDialog, setShowAdditionalPricingDialog] = useState(false);

  // Fetch plans from public API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔄 Fetching plans from /api/plans/public');
        const response = await publicPlansApi.getPublicPlansWithVariants();
        
        if (response.success && response.data) {
          console.log('✅ Plans loaded successfully:', response.data);
          // Sort plans by sortOrder and filter active ones
          const activePlans = response.data
            .filter(plan => plan.isActive)
            // Hide trial plans only: remove plans named like Trial
            // Keep contact plans (basePrice = 0 but has "contact" in description)
            .filter(plan => {
              const name = (plan.name || '').toLowerCase();
              const isTrialName = name.includes('trial');
              return !isTrialName; // Only filter out plans with "trial" in name
            })
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          setPlans(activePlans);
        } else {
          console.error('❌ Failed to load plans:', response.error);
          setError(response.error || 'Failed to load plans');
        }
      } catch (err) {
        console.error('❌ Error fetching plans:', err);
        setError(err instanceof Error ? err.message : 'Failed to load plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Transform plans to display format
  const getPricingData = () => {
    if (!plans || plans.length === 0) {
      return [];
    }

    return plans.map((plan) => {
      // Compute monthly price based on selected duration
      // Discounts: 3m=0%, 6m=5%, 12m=10% (applied to monthly price)
      let monthlyPrice = 0;
      const periodLabel = tPricing('plans.basic.period');
      let savings = 0;

      const base = plan.basePrice || 0;
      if (selectedDuration === '3') {
        monthlyPrice = base; // 0% discount
        savings = 0;
      } else if (selectedDuration === '6') {
        monthlyPrice = base * 0.95; // 5% discount per month
        savings = base * 0.05 * 6; // total savings for 6 months
      } else if (selectedDuration === '12') {
        monthlyPrice = base * 0.90; // 10% discount per month
        savings = base * 0.10 * 12; // total savings for 12 months
      } else {
        // Monthly (fallback)
        monthlyPrice = base;
        savings = 0;
      }

      // Parse features - handle both JSON string and array
      // Features can be: array of strings, array of objects with 'name' property, or JSON string
      let featuresArray: string[] = [];
      if (Array.isArray(plan.features)) {
        // If array of objects, extract 'name' property; if array of strings, use directly
        featuresArray = plan.features.map((feature: any) => {
          if (typeof feature === 'string') {
            return feature;
          } else if (feature && typeof feature === 'object' && feature.name) {
            return feature.name;
          }
          return String(feature);
        });
      } else if (typeof plan.features === 'string') {
        try {
          const parsed = JSON.parse(plan.features);
          if (Array.isArray(parsed)) {
            featuresArray = parsed.map((feature: any) => {
              if (typeof feature === 'string') {
                return feature;
              } else if (feature && typeof feature === 'object' && feature.name) {
                return feature.name;
              }
              return String(feature);
            });
          }
        } catch (e) {
          console.warn('Failed to parse features JSON:', e);
          featuresArray = [];
        }
      }

      // Filter out unwanted features
      const excludedFeatures = [
        'inventoryForecasting',
        'onlinePayments',
        'customIntegrations',
        'teamCollaborationTools',
        'apiIntegration'
      ];
      
      // Hide publicProductCatalog and productPublicCheck from Basic plan only
      const currentPlanNameLower = (plan.name || '').toLowerCase();
      const isBasicPlan = currentPlanNameLower.includes('basic');
      
      if (isBasicPlan) {
        excludedFeatures.push('publicProductCatalog', 'productPublicCheck');
      }
      
      const filteredFeatures = featuresArray.filter(feature => {
        const normalizedFeature = feature.toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9]/g, '')
          .replace(/plans\.features\./g, '')
          .replace(/features\./g, '');
        
        return !excludedFeatures.some(excluded => 
          normalizedFeature.includes(excluded.toLowerCase())
        );
      });

      // Transform features array to display format with translation
      const features = filteredFeatures.map((feature) => ({
        text: translatePlanFeature(feature, tPlans),
        included: true
      }));

      // Add limits as features
      const limits = plan.limits || {};
      const limitsFeatures = [];
      
      if (limits.outlets !== undefined) {
        const outletsText = limits.outlets === -1 
          ? tPlans('limits.unlimitedOutlets') || 'Unlimited Outlets'
          : tPlans('limits.outlets', { count: limits.outlets }) || `${limits.outlets} Outlets`;
        limitsFeatures.push({
          text: outletsText,
          included: true
        });
      }
      
      if (limits.users !== undefined) {
        const usersText = limits.users === -1
          ? tPlans('limits.unlimitedUsers') || 'Unlimited Users'
          : tPlans('limits.users', { count: limits.users }) || `${limits.users} Users`;
        limitsFeatures.push({
          text: usersText,
          included: true
        });
      }
      
      if (limits.products !== undefined) {
        const productsText = limits.products === -1
          ? tPlans('limits.unlimitedProducts') || 'Unlimited Products'
          : tPlans('limits.products', { count: limits.products }) || `${limits.products.toLocaleString()} Products`;
        limitsFeatures.push({
          text: productsText,
          included: true
        });
      }
      
      if (limits.customers !== undefined) {
        const customersText = limits.customers === -1
          ? tPlans('limits.unlimitedCustomers') || 'Unlimited Customers'
          : tPlans('limits.customers', { count: limits.customers }) || `${limits.customers.toLocaleString()} Customers`;
        limitsFeatures.push({
          text: customersText,
          included: true
        });
      }

      // Combine features and limits
      const allFeatures = [...features, ...limitsFeatures];

      // Check if it's a contact plan and format price accordingly
      let description = plan.description || '';
      // Remove duplicate "(Contact)" patterns
      description = description.replace(/\s*\(Contact\)\s*/gi, ' ').replace(/\s*\(Liên hệ\)\s*/gi, ' ').trim();
      // Remove multiple spaces
      description = description.replace(/\s+/g, ' ');
      
      const descriptionLower = description.toLowerCase();
      const planNameLower = (plan.name || '').toLowerCase();
      // Check if it's a contact plan: basePrice = 0 AND (description has contact OR plan name is Enterprise)
      const isContactPlan = (monthlyPrice === 0) && (
        descriptionLower.includes('contact') || 
        descriptionLower.includes('liên hệ') ||
        planNameLower.includes('enterprise')
      );
      const displayPrice = isContactPlan 
        ? (tPlans('fields.contactPrice') || 'Contact') 
        : formatCurrency(monthlyPrice, plan.currency);

      // Translate description based on plan name
      let translatedDescription = description;
      if (planNameLower.includes('basic')) {
        translatedDescription = tPlans('descriptions.basic') || description;
      } else if (planNameLower.includes('professional')) {
        translatedDescription = tPlans('descriptions.professional') || description;
      } else if (planNameLower.includes('enterprise')) {
        translatedDescription = tPlans('descriptions.enterprise') || description;
      }

      return {
        id: plan.id,
        name: plan.name,
        subtitle: translatedDescription,
        price: displayPrice,
        period: isContactPlan ? '' : periodLabel, // Don't show period for contact plans
        description: translatedDescription,
        features: allFeatures,
        popular: plan.isPopular || false,
        buttonText: tPricing('buttonText'),
        buttonClass: plan.isPopular
          ? "bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-secondary hover:to-brand-primary"
          : "bg-gradient-to-r from-action-success to-action-primary hover:from-action-primary hover:to-action-success",
        savings: savings > 0 ? savings : undefined,
        currency: plan.currency
      };
    });
  };

  const pricingData = getPricingData();

  return (
    <SoftSkyStage tone="white" className="py-24 md:py-28">
    <section id="pricing" className="relative" aria-label="Pricing plans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            {tPricing('title')}
          </h2>
          <p className="text-lg text-slate-600">
            {tPricing('description')}
          </p>
        </div>
        
        {/* Duration Toggle */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center bg-sky-50 border border-sky-100 rounded-xl p-1">
            <Button
              onClick={() => setSelectedDuration('3')}
              variant={selectedDuration === '3' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '3' ? 'bg-white shadow-sm border border-sky-100' : ''}
            >
              <div className="text-center">
                <div className="text-sm">{tPricing('months.three')}</div>
                <div className="text-lg text-slate-900 font-bold">{tPricing('discounts.three')}</div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedDuration('6')}
              variant={selectedDuration === '6' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '6' ? 'bg-white shadow-sm border border-sky-100' : ''}
            >
              <div className="text-center">
                <div className="text-sm">{tPricing('months.six')}</div>
                <div className="text-lg text-emerald-600 font-bold">{tPricing('discounts.six')}</div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedDuration('12')}
              variant={selectedDuration === '12' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '12' ? 'bg-white shadow-sm border border-sky-100' : ''}
            >
              <div className="text-center">
                <div className="text-sm">{tPricing('months.twelve')}</div>
                <div className="text-lg text-sky-700 font-bold">{tPricing('discounts.twelve')}</div>
              </div>
            </Button>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
            <span className="ml-3 text-gray-600">{tPricing('loading')}</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-red-600 mb-4">{error || tPricing('error')}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {tPricing('retry')}
            </Button>
          </div>
        )}
        
        {/* Pricing Cards */}
        {!loading && !error && pricingData.length > 0 && (
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingData.map((plan, index) => (
            <Card key={index} className={`relative transition-all duration-300 ${softSkyCardClass} ${
              plan.popular ? 'border-sky-300 ring-2 ring-sky-100 scale-[1.02]' : ''
            }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-sky-800 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                    {tPricing('plans.basic.mostPopular')}
                  </Badge>
                </div>
              )}
              
              <CardContent className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.subtitle}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">/{tPricing('plans.basic.period')}</span>
                  </div>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </div>
                        
                {/* Features */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center justify-between">
                      <span className={`text-sm ${feature.included ? 'text-gray-900' : 'text-gray-400'}`}>
                        {feature.text}
                      </span>
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  asChild
                  className={`w-full ${plan.popular ? 'bg-sky-800 hover:bg-sky-900 text-white' : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-100'} rounded-xl font-semibold transition-all duration-200`}
                >
                  <Link href="/login">
                    {plan.buttonText || tPricing('buttonText')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        )}

        {/* Empty State */}
        {!loading && !error && pricingData.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-600">{tPricing('noPlans')}</p>
          </div>
        )}
        
        {/* Additional information */}
        <div className="mt-16 text-center">
          <Card className={`${softSkyCardClass} p-8 max-w-4xl mx-auto`}>
            <CardContent className="p-0">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {tPricing('allPlansInclude')}
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-center justify-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900">{tPricing('support24')}</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900">{tPricing('dataBackup')}</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900">{tPricing('freeUpdates')}</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900">{tPricing('features.mobileApp')}</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900">{tPricing('training')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Pricing Note */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowAdditionalPricingDialog(true)}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
            title={tPricing('additionalPricingNote')}
          >
            <Info className="w-4 h-4" />
            <span>{tPricing('additionalPricingNote')}</span>
          </button>
        </div>

        {/* Additional Pricing Dialog */}
        <Dialog open={showAdditionalPricingDialog} onOpenChange={setShowAdditionalPricingDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{tPricing('additionalPricingTitle')}</DialogTitle>
              <DialogDescription>
                Information about additional pricing for accounts and addons
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {/* Additional Account Pricing */}
              <Card className="border border-gray-200">
                <CardContent className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {tPricing('additionalAccountPrice')}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {tPricing('additionalAccountDescription')}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Price:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {tPricing('additionalAccountPriceValue')}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Addon Pricing */}
              <Card className="border border-gray-200">
                <CardContent className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {tPricing('addonPrice')}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {tPricing('addonDescription')}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Price:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {tPricing('addonPriceValue')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAdditionalPricingDialog(false)}
              >
                {tPricing('close')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
    </SoftSkyStage>
  );
});

const Footer = React.memo(() => {
  const tf = useTranslations('landing.footer')
  return (
    <footer id="contact" className="bg-slate-900 text-white py-12" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-4">
            <div className="flex items-center gap-3 mb-4">
              <LandingBrandLogo size="sm" showLabel={false} />
              <span className="text-xl font-bold text-white">AnyRent</span>
            </div>
            <p className="text-gray-400 mb-4 text-sm">
              {tf('description')}
            </p>
            <div className="flex space-x-4">
              <a href="mailto:trinhduc20@gmail.com" className="text-gray-400 hover:text-white transition-colors" aria-label="Email">
                <Mail className="w-5 h-5" />
              </a>
              <a href="https://wa.me/840764774647" className="text-gray-400 hover:text-white transition-colors" aria-label="WhatsApp">
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">{tf('product.title')}</h3>
            <ul className="space-y-2">
              <li><Link href="/features" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('product.features')}</Link></li>
              <li><Link href="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('product.pricing')}</Link></li>
              <li><Link href="/download" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('product.downloadApp')}</Link></li>
              <li><Link href="/tim-san-pham-bang-hinh-anh" className="text-gray-400 hover:text-white transition-colors text-sm">Tìm bằng hình ảnh AI</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Ngành nghề</h3>
            <ul className="space-y-2">
              <li><Link href="/cho-thue-ao-dai" className="text-gray-400 hover:text-white transition-colors text-sm">Cho thuê áo dài</Link></li>
              <li><Link href="/cho-thue-ao-cuoi" className="text-gray-400 hover:text-white transition-colors text-sm">Cho thuê áo cưới</Link></li>
              <li><Link href="/cho-thue-trang-thiet-bi" className="text-gray-400 hover:text-white transition-colors text-sm">Cho thuê thiết bị</Link></li>
              <li><Link href="/cho-thue-trang-phuc" className="text-gray-400 hover:text-white transition-colors text-sm">Cho thuê trang phục</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">{tf('support.title')}</h3>
            <ul className="space-y-2">
              <li><a href="#faq" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('support.faq')}</a></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('support.documentation')}</Link></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('support.contact')}</a></li>
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">{tf('company.title')}</h3>
            <ul className="space-y-2">
              <li><Link href="/features" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('company.aboutUs')}</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('company.terms')}</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('company.privacy')}</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            {tf('copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
});

// Inline SVG logos for floating buttons (no external deps)
const ZaloLogo = () => (
  <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
    <path d="M12.5 7h23A5.5 5.5 0 0 1 41 12.5v23a5.5 5.5 0 0 1-5.5 5.5h-23A5.5 5.5 0 0 1 7 35.5v-23A5.5 5.5 0 0 1 12.5 7z" fill="#0068FF"/>
    <path d="M31.2 18.6H17.8c-.5 0-.8.4-.8.8v1.1c0 .4.3.8.8.8h8.5l-9.1 9.3c-.3.3-.1.9.4.9h13.4c.5 0 .8-.4.8-.8v-1.1c0-.4-.3-.8-.8-.8H22l9.5-9.3c.3-.3.1-.9-.3-.9z" fill="white"/>
  </svg>
);

const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// FloatingButtons component with CSS transitions (no framer-motion)
const FloatingButtons = React.memo(() => {
  // Số điện thoại: 0764774647
  // Format cho WhatsApp: 840764774647 (thêm 84 đầu)
  // Format cho Zalo: 0764774647
  // Format cho Telegram: 0764774647
  const phoneNumber = '840764774647';
  const zaloNumber = '0764774647';
  const telegramNumber = '0764774647';
  const whatsappMessage = encodeURIComponent('Xin chào! Tôi muốn tìm hiểu về AnyRent.');
  const telegramMessage = encodeURIComponent('Xin chào! Tôi muốn tìm hiểu về AnyRent.');
  
  const [showZaloQR, setShowZaloQR] = useState(false);
  const zaloButtonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!showZaloQR) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (zaloButtonRef.current && !zaloButtonRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.zalo-qr-popover')) {
          setShowZaloQR(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showZaloQR]);
  
  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex flex-col space-y-3 relative">
          {/* Zalo Button with label */}
          <button
            ref={zaloButtonRef}
            onClick={(e) => {
              e.preventDefault();
              setShowZaloQR(!showZaloQR);
            }}
            className="flex items-center gap-2 bg-[#0068FF] text-white pl-3 pr-4 py-2.5 rounded-full shadow-lg hover:bg-[#0052CC] transition-colors"
            title="Liên hệ Zalo"
          >
            <ZaloLogo />
            <span className="text-xs font-semibold hidden sm:inline">Zalo</span>
          </button>
          
          {/* WhatsApp Button with label */}
          <a 
            href={`https://wa.me/${phoneNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] text-white pl-3 pr-4 py-2.5 rounded-full shadow-lg hover:bg-[#20BA5A] transition-colors"
            title="Liên hệ WhatsApp"
          >
            <WhatsAppLogo />
            <span className="text-xs font-semibold hidden sm:inline">WhatsApp</span>
          </a>
          
          {/* Telegram Button with label */}
          <a 
            href={`https://t.me/${telegramNumber}?text=${telegramMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#0088cc] text-white pl-3 pr-4 py-2.5 rounded-full shadow-lg hover:bg-[#006ba3] transition-colors"
            title="Liên hệ Telegram"
          >
            <TelegramLogo />
            <span className="text-xs font-semibold hidden sm:inline">Telegram</span>
          </a>
        </div>
      </div>
      
      {/* Zalo QR Code Modal with CSS transitions */}
      {showZaloQR && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ease-out"
            onClick={() => setShowZaloQR(false)}
            style={{
              animation: 'fadeIn 0.2s ease-out'
            }}
          />
          {/* QR Code Popup - positioned next to button */}
          <div
            className="zalo-qr-popover fixed bottom-24 right-6 z-50 bg-white rounded-lg shadow-2xl p-6 max-w-sm transition-all duration-300 ease-out"
            style={{
              animation: 'slideUpFadeIn 0.3s ease-out'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quét mã QR để liên hệ Zalo</h3>
              <button
                onClick={() => setShowZaloQR(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="relative w-48 h-48 bg-white rounded-lg p-2">
                <Image
                  src="/image/qrcode-0764774647.jpeg"
                  alt="Zalo QR Code"
                  fill
                  className="object-contain rounded-lg"
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Mở ứng dụng Zalo và quét mã QR code bên trên để kết nối với chúng tôi
              </p>
            </div>
            <a
              href={`https://zalo.me/${zaloNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-4 py-2 bg-[#0068FF] text-white rounded-lg hover:bg-[#0052CC] transition-colors text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4 inline mr-2" />
              Mở Zalo
            </a>
          </div>
        </>
      )}
    </>
  );
});

export default LandingPage;
