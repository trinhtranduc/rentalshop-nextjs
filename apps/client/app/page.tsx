'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button, Logo, LanguageSwitcher, Card, CardContent, Badge } from '@rentalshop/ui'
import { publicPlansApi, translatePlanFeature } from '@rentalshop/utils'
import { usePlansTranslations } from '@rentalshop/hooks'
import type { Plan } from '@rentalshop/types'

// Import Blog Section (Client Component that calls API)
// import BlogSectionWrapper from './components/BlogSectionWrapper'
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Globe, 
  Shield, 
  Users, 
  BarChart3, 
  Smartphone, 
  Clock, 
  DollarSign,
  Star,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  BarChart,
  AlertTriangle,
  X,
  Store,
  Sparkles,
  ShoppingBag,
  Zap,
  Loader2,
  MessageCircle,
  Briefcase,
  ArrowRight
} from 'lucide-react'

const LandingPage = () => {
  const t = useTranslations('landing')
  
  // Structured Data for SEO (JSON-LD)
  const structuredData = {
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
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
    description: t('hero.description'),
    url: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop',
  }

  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AnyRent',
    url: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop',
    logo: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}/anyrent-logo-light.svg`,
    description: t('hero.description'),
    sameAs: [
      'https://apps.apple.com/vn/app/anyrent/id6754793592',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['Vietnamese', 'English', 'Chinese', 'Korean', 'Japanese'],
    },
  }

  // BreadcrumbList Structured Data for SEO
  const breadcrumbData = {
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
        item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}#features`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: t('navigation.pricing'),
        item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}#pricing`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: t('navigation.faq'),
        item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}#faq`,
      },
      {
        '@type': 'ListItem',
        position: 5,
        name: t('navigation.contact'),
        item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}#contact`,
      },
    ],
  };

  // Article Schema for landing page content
  const articleData = {
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
        url: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}/anyrent-logo-light.svg`,
      },
    },
    datePublished: '2024-01-01',
    dateModified: new Date().toISOString().split('T')[0],
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop',
    },
  };

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
      
    <div className="min-h-screen bg-white overflow-x-hidden">
      
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50" role="banner">
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
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/features" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">{t('navigation.features')}</Link>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">{t('navigation.pricing')}</a>
                {/* <a href="#blog" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">{t('navigation.blog')}</a> */}
                <a href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">{t('navigation.faq')}</a>
                <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">{t('navigation.contact')}</a>
                <LanguageSwitcher variant="compact" />
                <Button
                  asChild
                  variant="default"
                  className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  <Link href="/login">
                    {t('navigation.login')}
                  </Link>
                </Button>
              </div>
              {/* Mobile menu - simplified */}
              <div className="md:hidden flex items-center space-x-3">
                <LanguageSwitcher variant="compact" />
                <Button
                  asChild
                  variant="default"
                  className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-3 py-1.5 text-sm font-medium"
                >
                  <Link href="/login">
                    {t('navigation.login')}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Banner - Clean & Modern */}
        <section className="relative overflow-hidden pt-24 pb-20 bg-gradient-to-b from-gray-50 to-white" aria-label="Hero section">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              {/* Badge */}
              <Badge variant="outline" className="mb-6 px-3 py-1 text-xs font-medium text-gray-600 border-gray-200 bg-white">
                <Sparkles className="w-4 h-4 mr-2 text-gray-600" />
                {t('hero.subtitle')}
              </Badge>

              {/* Main Heading */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
                <span className="block">{t('hero.title')}</span>
                <span className="block">{t('hero.subtitle')}</span>
              </h1>
              
              {/* Description */}
              <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed" role="text">
                {t('hero.description')}
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <a 
                    href="https://apps.apple.com/vn/app/anyrent/id6754793592" 
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    {t('hero.downloadApp')}
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 rounded-xl px-8 py-3 text-base font-medium transition-all duration-200"
                >
                  <Link href="/login">
                    <Globe className="w-5 h-5 mr-2" />
                    {t('hero.tryWebPortal')}
                  </Link>
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>500+ Active Stores</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <span>4.9/5 Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-700" />
                  <span>Secure & Reliable</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* App Download Section - Clean Design */}
      <section id="download" className="py-24 bg-white" aria-label="Download section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium text-gray-600 border-gray-200 bg-white">
              <Smartphone className="w-4 h-4 mr-2 text-gray-600" />
              Platforms
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              {t('download.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('download.description')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('download.mobileApp')}</h3>
                  <p className="text-gray-600">{t('download.mobileAppDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('download.webPortal')}</h3>
                  <p className="text-gray-600">{t('download.webPortalDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BarChart className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('download.analytics')}</h3>
                  <p className="text-gray-600">{t('download.analyticsDesc')}</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <Card className="bg-white border border-gray-200 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-0">
                  <div className="w-full flex items-center justify-center mb-8">
                    <Image 
                      src="/anyrent-iphone-splashscreen.jpg"
                      alt="AnyRent phần mềm quản lý cửa hàng cho thuê trên iPhone - Hệ thống quản lý cho thuê di động"
                      width={288}
                      height={576}
                      priority
                      className="rounded-3xl shadow-xl border border-gray-200"
                    />
                  </div>
                  <div className="mt-8">
                    <Button
                      asChild
                      size="lg"
                      className="w-full bg-gray-900 text-white hover:bg-gray-800 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <a 
                        href="https://apps.apple.com/vn/app/anyrent/id6754793592" 
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        {t('download.downloadOnAppStore')}
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

        {/* Features Section - Clean Design */}
        <section id="features" className="py-24 bg-gray-50" aria-label="Features section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium text-gray-600 border-gray-200 bg-white">
                <Sparkles className="w-4 h-4 mr-2 text-gray-600" />
                Features
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
                {t('features.title')}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t('features.description')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <Card className="group border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 bg-white">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-4 transition-colors duration-300">
                    <BarChart3 className="w-6 h-6 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('features.orderManagement')}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('features.orderManagementDesc')}</p>
                </CardContent>
              </Card>
              
              <Card className="group border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 bg-white">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-4 transition-colors duration-300">
                    <Users className="w-6 h-6 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('features.customerManagement')}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('features.customerManagementDesc')}</p>
                </CardContent>
              </Card>
              
              <Card className="group border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 bg-white">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-4 transition-colors duration-300">
                    <Clock className="w-6 h-6 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('features.calendarScheduling')}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('features.calendarSchedulingDesc')}</p>
                </CardContent>
              </Card>
            
              <Card className="group border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 bg-white">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-4 transition-colors duration-300">
                    <DollarSign className="w-6 h-6 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('features.financialReports')}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('features.financialReportsDesc')}</p>
                </CardContent>
              </Card>
            
              <Card className="group border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 bg-white">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-4 transition-colors duration-300">
                    <AlertTriangle className="w-6 h-6 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('features.duplicatePrevention')}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('features.duplicatePreventionDesc')}</p>
                </CardContent>
              </Card>
            
              <Card className="group border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 bg-white">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-4 transition-colors duration-300">
                    <Sparkles className="w-6 h-6 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('features.multiPlatform')}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('features.multiPlatformDesc')}</p>
                </CardContent>
              </Card>
            </div>
            
            {/* View Details Button */}
            <div className="mt-12 text-center">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-xl px-8 py-3 text-base font-medium transition-all duration-200"
              >
                <Link href="/features">
                  <ArrowRight className="w-5 h-5 mr-2" />
                  {t('features.viewAllFeatures')}
                </Link>
              </Button>
            </div>
          </div>
        </section>

      {/* Custom Solution Contact Section */}
      <section id="custom-solution" className="py-24 bg-gray-900" aria-label="Custom solution contact section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-6">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
              {t('customSolution.title')}
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {t('customSolution.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Benefits Card */}
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold mb-6 text-white">{t('customSolution.benefits.title')}</h3>
                <ul className="space-y-4">
                  {[
                    'customSolution.benefits.customized',
                    'customSolution.benefits.dedicated',
                    'customSolution.benefits.scalable',
                    'customSolution.benefits.integration'
                  ].map((key, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-white/90 text-sm">{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Contact Card */}
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold mb-6 text-white">{t('customSolution.contact.title')}</h3>
                <p className="text-white/80 mb-6 text-sm">
                  {t('customSolution.contact.description')}
                </p>
                
                <div className="space-y-4">
                  {/* Email */}
                  <a
                    href={`mailto:trinhduc20@gmail.com?subject=${encodeURIComponent(t('customSolution.contact.emailSubject'))}&body=${encodeURIComponent(t('customSolution.contact.emailBody'))}`}
                    className="flex items-center space-x-4 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/20 hover:border-white/40 group"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white/70 mb-1">{t('customSolution.contact.email')}</div>
                      <div className="text-white font-semibold text-sm">trinhduc20@gmail.com</div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/840764774647?text=${encodeURIComponent(t('customSolution.contact.whatsappMessage'))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/20 hover:border-white/40 group"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white/70 mb-1">{t('customSolution.contact.whatsapp')}</div>
                      <div className="text-white font-semibold text-sm">0764774647</div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                  </a>
                </div>

                <div className="mt-6 pt-6 border-t border-white/20">
                  <p className="text-sm text-white/70 text-center">
                    {t('customSolution.contact.responseTime')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section - Clean Design */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium text-gray-600 border-gray-200 bg-white">
              <Star className="w-4 h-4 mr-2 text-gray-600" />
              Why Choose Us
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              {t('whyChoose.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('whyChoose.description')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('whyChoose.easyToUse')}</h3>
                  <p className="text-gray-600">{t('whyChoose.easyToUseDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('whyChoose.timeSaving')}</h3>
                  <p className="text-gray-600">{t('whyChoose.timeSavingDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('whyChoose.increaseRevenue')}</h3>
                  <p className="text-gray-600">{t('whyChoose.increaseRevenueDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('whyChoose.support')}</h3>
                  <p className="text-gray-600">{t('whyChoose.supportDesc')}</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <Card className="bg-gray-900 border-0 rounded-3xl p-10 text-white shadow-2xl">
                <CardContent className="p-0">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <Zap className="w-10 h-10 mr-3 text-yellow-400" />
                      <div className="text-7xl font-extrabold text-white">500+</div>
                    </div>
                    <div className="text-2xl mb-10 font-bold">{t('whyChoose.activeStores')}</div>
                    <div className="flex justify-center space-x-2 mb-6">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-7 h-7 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <div className="text-lg font-semibold">{t('whyChoose.rating')}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <Stats />

      {/* Testimonials Section */}
      <Testimonials />

        {/* CTA Section */}
      <CTA />

      {/* FAQ Section */}
      <FAQ />

      {/* Blog Section */}
      {/* <BlogSectionWrapper 
        title={t('blog.title')}
        subtitle={t('blog.subtitle')}
      /> */}

      {/* Pricing Section */}
      <Pricing />

      {/* Footer */}
      <Footer />
      <FloatingButtons />
    </div>
    </>
  );
};

// Simple component implementations for the landing page
const Stats = () => {
  return (
    <section className="py-20 bg-gray-900" aria-label="Statistics section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-white mb-2">500+</div>
            <div className="text-gray-300">Active Stores</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-white mb-2">500,000+</div>
            <div className="text-gray-300">Orders Processed</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-white mb-2">4.9/5</div>
            <div className="text-gray-300">Customer Rating</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-white mb-2">24/7</div>
            <div className="text-gray-300">Support Available</div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
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
    <section className="py-24 bg-white" aria-label="Testimonials section">
      <div className="w-full">
        {/* Header Section */}
        <div className="text-center mb-16 px-4 sm:px-6 lg:px-8">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium text-gray-600 border-gray-200 bg-white">
            <Star className="w-4 h-4 mr-2 text-gray-600 fill-gray-600" />
            <span className="text-sm font-medium">Testimonials</span>
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>
        
        {/* Testimonials Grid */}
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
            {testimonials.map(({ key }) => {
              return (
                <Card 
                  key={key} 
                  className="group border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 bg-white w-full md:w-[calc(33.333%-1rem)] max-w-md"
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
  );
};

const CTA = () => {
  const t = useTranslations('landing.cta')
  const tHero = useTranslations('landing.hero')
  return (
      <section className="py-24 bg-gray-900" aria-label="Call to action section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            {t('description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 rounded-xl px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <a 
                href="https://apps.apple.com/vn/app/anyrent/id6754793592" 
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-5 h-5 mr-2" />
                {tHero('downloadApp')}
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-white text-white hover:bg-white hover:text-gray-900 rounded-xl px-8 py-3 text-base font-medium transition-all duration-200"
            >
              <Link href="/login">
                <Globe className="w-5 h-5 mr-2" />
                {tHero('tryWebPortal')}
              </Link>
            </Button>
          </div>
        </div>
    </section>
  );
};

const FAQ = () => {
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
  const faqStructuredData = {
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
  };
  
  return (
    <>
      {/* FAQ Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <section id="faq" className="py-24 bg-gray-50" aria-label="Frequently asked questions">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600">
            {t('description')}
          </p>
        </div>
        
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <Card key={index} className="border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 bg-white">
              <Button
                onClick={() => toggleItem(index)}
                variant="ghost"
                className="w-full px-6 py-4 h-auto text-left flex items-center justify-between hover:bg-gray-50 rounded-lg"
              >
                <span className="font-semibold text-gray-900">{item.question}</span>
                {openItems.has(index) ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </Button>
              {openItems.has(index) && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600">{item.answer}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
    </>
  );
};

const Pricing = () => {
  const tPricing = useTranslations('landing.pricing')
  const tPlans = usePlansTranslations()
  const [selectedDuration, setSelectedDuration] = useState<'3' | '6' | '12'>('3'); // '3', '6', '12'
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <section id="pricing" className="py-24 bg-white" aria-label="Pricing plans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            {tPricing('title')}
          </h2>
          <p className="text-lg text-gray-600">
            {tPricing('description')}
          </p>
        </div>
        
        {/* Duration Toggle */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              onClick={() => setSelectedDuration('3')}
              variant={selectedDuration === '3' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '3' ? 'bg-white shadow-sm' : ''}
            >
              <div className="text-center">
                <div className="text-sm">{tPricing('months.three')}</div>
                <div className="text-lg text-gray-900 font-bold">{tPricing('discounts.three')}</div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedDuration('6')}
              variant={selectedDuration === '6' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '6' ? 'bg-white shadow-sm' : ''}
            >
              <div className="text-center">
                <div className="text-sm">{tPricing('months.six')}</div>
                <div className="text-lg text-green-600 font-bold">{tPricing('discounts.six')}</div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedDuration('12')}
              variant={selectedDuration === '12' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '12' ? 'bg-white shadow-sm' : ''}
            >
              <div className="text-center">
                <div className="text-sm">{tPricing('months.twelve')}</div>
                <div className="text-lg text-red-600 font-bold">{tPricing('discounts.twelve')}</div>
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
            <Card key={index} className={`relative border-2 transition-all duration-300 hover:shadow-xl bg-white ${
              plan.popular ? 'border-gray-900 scale-105' : 'border-gray-200'
            }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gray-900 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
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
                  className={`w-full ${plan.popular ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'} rounded-xl font-semibold transition-all duration-200`}
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
          <Card className="bg-gray-50 border border-gray-200 rounded-2xl p-8 max-w-4xl mx-auto">
            <CardContent className="p-0">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
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
      </div>
    </section>
  );
};

const Footer = () => {
  const tf = useTranslations('landing.footer')
  return (
    <footer id="contact" className="bg-gray-900 text-white py-12" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mr-3">
                <Store className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AnyRent</span>
            </div>
            <p className="text-gray-400 mb-4 text-sm">
              {tf('description')}
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">{tf('product.title')}</h3>
            <ul className="space-y-2">
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('product.features')}</a></li>
              <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('product.pricing')}</a></li>
              <li><a href="#download" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('product.downloadApp')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">{tf('support.title')}</h3>
            <ul className="space-y-2">
              <li><a href="#faq" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('support.faq')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('support.documentation')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('support.contact')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">{tf('company.title')}</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">{tf('company.aboutUs')}</a></li>
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
};

const FloatingButtons = () => {
  // Số điện thoại: 0764774647
  // Format cho WhatsApp: 840764774647 (thêm 84 đầu)
  // Format cho Zalo: 0764774647
  const phoneNumber = '840764774647';
  const zaloNumber = '0764774647';
  const whatsappMessage = encodeURIComponent('Xin chào! Tôi muốn tìm hiểu về AnyRent.');
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col space-y-3">
        {/* Zalo Button */}
        <a 
          href={`https://zalo.me/${zaloNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#0068FF] text-white p-3 rounded-full shadow-lg hover:bg-[#0052CC] transition-colors"
          title="Liên hệ Zalo"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
        
        {/* WhatsApp Button */}
        <a 
          href={`https://wa.me/${phoneNumber}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white p-3 rounded-full shadow-lg hover:bg-[#20BA5A] transition-colors"
          title="Liên hệ WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      </div>
    </div>
  );
};

export default LandingPage; 