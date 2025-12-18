'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button, Logo, LanguageSwitcher, Card, CardContent, Badge } from '@rentalshop/ui'
import { publicPlansApi, translatePlanFeature } from '@rentalshop/utils'
import { usePlansTranslations } from '@rentalshop/hooks'
import type { Plan } from '@rentalshop/types'
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
  Briefcase
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
      
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-bg-card to-bg-tertiary overflow-x-hidden">
      
        {/* Header */}
        <header className="bg-bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50" role="banner">
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
              <div className="hidden md:flex items-center space-x-6">
                <a href="#features" className="text-text-secondary hover:text-action-primary transition-colors">{t('navigation.features')}</a>
                <a href="#pricing" className="text-text-secondary hover:text-action-primary transition-colors">{t('navigation.pricing')}</a>
                <a href="#faq" className="text-text-secondary hover:text-action-primary transition-colors">{t('navigation.faq')}</a>
                <a href="#contact" className="text-text-secondary hover:text-action-primary transition-colors">{t('navigation.contact')}</a>
                <LanguageSwitcher variant="compact" />
                <Link href="/login" className="bg-gradient-to-r from-brand-primary to-action-primary text-text-inverted px-4 py-2 rounded-lg hover:from-brand-secondary hover:to-action-primary transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105">
                  {t('navigation.login')}
                </Link>
              </div>
              {/* Mobile menu - simplified */}
              <div className="md:hidden flex items-center space-x-3">
                <LanguageSwitcher variant="compact" />
                <Link href="/login" className="bg-gradient-to-r from-brand-primary to-action-primary text-text-inverted px-3 py-1.5 rounded-lg text-sm">
                  {t('navigation.login')}
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Banner - Modern Design */}
        <section className="relative overflow-hidden min-h-[90vh] flex items-center" aria-label="Hero section">
          {/* Enhanced Background decoration with modern gradients */}
          <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
            {/* Animated gradient orbs */}
            <div className="absolute top-20 left-4 md:left-10 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-r from-brand-primary/40 to-action-primary/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse"></div>
            <div className="absolute top-40 right-4 md:right-10 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-r from-action-primary/40 to-brand-secondary/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse animation-delay-2000"></div>
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-r from-action-success/30 to-action-primary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse animation-delay-4000"></div>
            
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-10">
            <div className="text-center">
              {/* Badge */}
              <Badge variant="outline" className="mb-8 px-4 py-2 text-sm font-medium bg-gradient-to-r from-brand-primary/10 to-action-primary/10 border-brand-primary/20 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 mr-2 text-brand-primary" />
                {t('hero.subtitle')}
              </Badge>

              {/* Main Heading with better typography */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-text-primary mb-6 leading-tight">
                <span className="block">{t('hero.title')}</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-action-primary to-brand-secondary animate-gradient">
                  {t('hero.subtitle')}
                </span>
              </h1>
              
              {/* Description with better spacing */}
              <p className="text-lg md:text-xl lg:text-2xl text-text-secondary mb-12 max-w-4xl mx-auto leading-relaxed" role="text">
                {t('hero.description')}
              </p>
              
              {/* CTA Buttons with modern design using shadcn Button */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  asChild
                  size="lg"
                  className="group bg-gradient-to-r from-brand-primary to-action-primary hover:from-brand-secondary hover:to-action-primary text-white shadow-2xl hover:shadow-brand-primary/50 hover:scale-105 transition-all duration-300 text-lg font-semibold rounded-2xl px-8 py-6"
                >
                <a 
                  href="https://apps.apple.com/vn/app/anyrent/id6754793592" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                    <Download className="w-5 h-5 mr-2 group-hover:translate-y-0.5 transition-transform" />
                  {t('hero.downloadApp')}
                </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="group bg-background/80 backdrop-blur-sm border-2 border-brand-primary/30 text-brand-primary hover:bg-gradient-to-r hover:from-brand-primary hover:to-action-primary hover:text-white hover:border-transparent shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-lg font-semibold rounded-2xl px-8 py-6"
                >
                  <Link href="/login">
                    <Globe className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                  {t('hero.tryWebPortal')}
                </Link>
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-text-tertiary">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-action-success" />
                  <span>500+ Active Stores</span>
            </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-action-warning fill-current" />
                  <span>4.9/5 Rating</span>
          </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-action-primary" />
                  <span>Secure & Reliable</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* App Download Section - Modern Design */}
      <section id="download" className="py-32 bg-gradient-to-b from-bg-card to-bg-secondary relative overflow-hidden" aria-label="Download section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium bg-gradient-to-r from-brand-primary/10 to-action-primary/10 border-brand-primary/20 backdrop-blur-sm">
              <Smartphone className="w-4 h-4 mr-2 text-brand-primary" />
              Platforms
            </Badge>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-text-primary mb-6">
              {t('download.title')}
            </h2>
            <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto">
              {t('download.description')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">{t('download.mobileApp')}</h3>
                  <p className="text-text-secondary">{t('download.mobileAppDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-action-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-action-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">{t('download.webPortal')}</h3>
                  <p className="text-text-secondary">{t('download.webPortalDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-action-success/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BarChart className="w-6 h-6 text-action-success" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">{t('download.analytics')}</h3>
                  <p className="text-text-secondary">{t('download.analyticsDesc')}</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <Card className="bg-gradient-to-br from-card/90 to-muted/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-border/50 relative overflow-hidden group hover:shadow-brand-primary/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-action-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardContent className="relative z-10 p-0">
                  <div className="w-full flex items-center justify-center mb-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-action-primary/20 rounded-3xl blur-2xl scale-110"></div>
                  <Image 
                    src="/anyrent-iphone-splashscreen.jpg"
                    alt="AnyRent phần mềm quản lý cửa hàng cho thuê trên iPhone - Hệ thống quản lý cho thuê di động"
                    width={288}
                    height={576}
                    priority
                        className="relative rounded-3xl shadow-2xl border border-border/50 transform group-hover:scale-105 transition-transform duration-500"
                  />
                    </div>
                </div>
                <div className="mt-8">
                    <Button
                      asChild
                      size="lg"
                      className="group/btn w-full bg-gradient-to-r from-brand-primary to-action-primary hover:from-brand-secondary hover:to-action-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold rounded-2xl"
                    >
                  <a 
                    href="https://apps.apple.com/vn/app/anyrent/id6754793592" 
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                        <Download className="w-5 h-5 mr-2 group-hover/btn:translate-y-0.5 transition-transform" />
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

        {/* Features Section - Modern Glassmorphism Design */}
        <section id="features" className="py-32 bg-gradient-to-b from-bg-secondary via-bg-card to-bg-secondary relative overflow-hidden" aria-label="Features section">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-primary/5 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-action-primary/5 rounded-full filter blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-20">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium bg-gradient-to-r from-brand-primary/10 to-action-primary/10 border-brand-primary/20 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 mr-2 text-brand-primary" />
              Features
            </Badge>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-text-primary mb-6">
                {t('features.title')}
              </h2>
              <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto">
                {t('features.description')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              <Card className="group bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border-border/50 hover:border-brand-primary/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/0 to-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardContent className="relative z-10 p-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-brand-primary/20 to-action-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="w-7 h-7 text-brand-primary" />
                </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{t('features.orderManagement')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('features.orderManagementDesc')}</p>
                </CardContent>
              </Card>
              
              <Card className="group bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border-border/50 hover:border-action-success/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-action-success/0 to-action-success/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardContent className="relative z-10 p-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-action-success/20 to-emerald-400/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-7 h-7 text-action-success" />
                </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{t('features.customerManagement')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('features.customerManagementDesc')}</p>
                </CardContent>
              </Card>
              
              <Card className="group bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border-border/50 hover:border-action-warning/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-action-warning/0 to-action-warning/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardContent className="relative z-10 p-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-action-warning/20 to-amber-400/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Clock className="w-7 h-7 text-action-warning" />
                </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{t('features.calendarScheduling')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('features.calendarSchedulingDesc')}</p>
                </CardContent>
              </Card>
            
              <Card className="group bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border-border/50 hover:border-action-primary/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-action-primary/0 to-action-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardContent className="relative z-10 p-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-action-primary/20 to-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-7 h-7 text-action-primary" />
                </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{t('features.financialReports')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('features.financialReportsDesc')}</p>
                </CardContent>
              </Card>
            
              <Card className="group bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border-border/50 hover:border-action-danger/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-action-danger/0 to-action-danger/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardContent className="relative z-10 p-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-action-danger/20 to-red-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <AlertTriangle className="w-7 h-7 text-action-danger" />
                </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{t('features.duplicatePrevention')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('features.duplicatePreventionDesc')}</p>
                </CardContent>
              </Card>
            
              <Card className="group bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border-border/50 hover:border-brand-secondary/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-secondary/0 to-brand-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardContent className="relative z-10 p-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-brand-secondary/20 to-blue-400/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-7 h-7 text-brand-secondary" />
                </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{t('features.multiPlatform')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('features.multiPlatformDesc')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

      {/* Custom Solution Contact Section */}
      <section id="custom-solution" className="py-20 bg-gradient-to-br from-brand-primary via-action-primary to-brand-secondary text-text-inverted relative overflow-hidden" aria-label="Custom solution contact section">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-4">
              {t('customSolution.title')}
            </h2>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              {t('customSolution.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Benefits Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-semibold mb-6">{t('customSolution.benefits.title')}</h3>
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
                    <span className="text-white/90">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-semibold mb-6">{t('customSolution.contact.title')}</h3>
              <p className="text-white/80 mb-6">
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
                    <div className="text-white font-semibold">trinhduc20@gmail.com</div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/84764774647?text=${encodeURIComponent(t('customSolution.contact.whatsappMessage'))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-4 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/20 hover:border-white/40 group"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white/70 mb-1">{t('customSolution.contact.whatsapp')}</div>
                    <div className="text-white font-semibold">+84 76 4774647</div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                </a>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <p className="text-sm text-white/70 text-center">
                  {t('customSolution.contact.responseTime')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section - Modern Design */}
      <section className="py-32 bg-gradient-to-b from-bg-secondary via-bg-card to-bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-action-primary/5 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-brand-primary/5 rounded-full filter blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium bg-gradient-to-r from-brand-primary/10 to-action-primary/10 border-brand-primary/20 backdrop-blur-sm">
              <Star className="w-4 h-4 mr-2 text-brand-primary" />
              Why Choose Us
            </Badge>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-text-primary mb-6">
              {t('whyChoose.title')}
            </h2>
            <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto">
              {t('whyChoose.description')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">{t('whyChoose.easyToUse')}</h3>
                  <p className="text-text-secondary">{t('whyChoose.easyToUseDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-action-success/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-action-success" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">{t('whyChoose.timeSaving')}</h3>
                  <p className="text-text-secondary">{t('whyChoose.timeSavingDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-action-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-action-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">{t('whyChoose.increaseRevenue')}</h3>
                  <p className="text-text-secondary">{t('whyChoose.increaseRevenueDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-action-warning/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-action-warning" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">{t('whyChoose.support')}</h3>
                  <p className="text-text-secondary">{t('whyChoose.supportDesc')}</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-brand-primary via-action-primary to-brand-secondary rounded-3xl p-10 text-text-inverted shadow-2xl relative overflow-hidden group hover:shadow-brand-primary/50 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
                <div className="text-center relative z-10">
                  <div className="flex items-center justify-center mb-4">
                    <Zap className="w-10 h-10 mr-3 text-yellow-300 animate-pulse" />
                    <div className="text-7xl font-extrabold bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">500+</div>
                  </div>
                  <div className="text-2xl mb-10 font-bold">{t('whyChoose.activeStores')}</div>
                  <div className="flex justify-center space-x-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-7 h-7 fill-yellow-300 text-yellow-300" />
                    ))}
                  </div>
                  <div className="text-lg font-semibold">{t('whyChoose.rating')}</div>
                </div>
              </div>
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
    <section className="py-20 bg-gradient-to-br from-brand-primary via-action-primary to-brand-secondary text-text-inverted relative overflow-hidden" aria-label="Statistics section">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">500+</div>
            <div className="text-text-inverted/70">Active Stores</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">500,000+</div>
            <div className="text-text-inverted/70">Orders Processed</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">4.9/5</div>
            <div className="text-text-inverted/70">Customer Rating</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">24/7</div>
            <div className="text-text-inverted/70">Support Available</div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  const t = useTranslations('landing.testimonials')
  return (
    <section className="py-32 bg-gradient-to-b from-bg-card to-bg-secondary relative overflow-hidden" aria-label="Testimonials section">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-action-primary/5 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-brand-primary/5 rounded-full filter blur-3xl"></div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-gradient-to-r from-brand-primary/10 to-action-primary/10 backdrop-blur-sm border border-brand-primary/20 rounded-full">
            <Star className="w-4 h-4 text-brand-primary" />
            <span className="text-sm font-medium text-brand-primary">Testimonials</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-text-primary mb-6">
            {t('title')}
          </h2>
          <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto">
            {t('description')}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="group bg-bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-border/50 hover:border-brand-primary/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/0 to-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-6 h-6 text-action-warning fill-current" />
                ))}
              </div>
              <p className="text-text-secondary mb-6 text-lg leading-relaxed">
                "AnyRent has helped me manage my rental business efficiently. The interface is easy to use and features are comprehensive."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-action-primary rounded-full flex items-center justify-center text-text-inverted font-bold text-lg shadow-lg">
                  J
                </div>
                <div className="ml-4">
                  <div className="font-bold text-text-primary text-lg">John Smith</div>
                  <div className="text-sm text-text-tertiary">Rental Shop Owner</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group bg-bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-border/50 hover:border-action-success/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-action-success/0 to-action-success/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-6 h-6 text-action-warning fill-current" />
                ))}
              </div>
              <p className="text-text-secondary mb-6 text-lg leading-relaxed">
                "The order management feature is very convenient. I can track all orders easily and manage my inventory effectively."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-action-success to-emerald-500 rounded-full flex items-center justify-center text-text-inverted font-bold text-lg shadow-lg">
                  S
                </div>
                <div className="ml-4">
                  <div className="font-bold text-text-primary text-lg">Sarah Johnson</div>
                  <div className="text-sm text-text-tertiary">Shop Manager</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group bg-bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-border/50 hover:border-action-primary/50 relative overflow-hidden md:col-span-2">
            <div className="absolute inset-0 bg-gradient-to-br from-action-primary/0 to-action-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-6 h-6 text-action-warning fill-current" />
                ))}
              </div>
              <p className="text-text-secondary mb-6 text-lg leading-relaxed">
                "The mobile app is very convenient. I can manage my shop from anywhere and the interface is intuitive."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-action-primary to-blue-500 rounded-full flex items-center justify-center text-text-inverted font-bold text-lg shadow-lg">
                  M
                </div>
                <div className="ml-4">
                  <div className="font-bold text-text-primary text-lg">Mike Wilson</div>
                  <div className="text-sm text-text-tertiary">Business Owner</div>
                </div>
              </div>
            </div>
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
      <section className="py-20 bg-gradient-to-br from-brand-primary via-action-primary to-brand-secondary relative overflow-hidden" aria-label="Call to action section">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl font-bold text-text-inverted mb-4">
            {t('title')}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t('description')}
          </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="https://apps.apple.com/vn/app/anyrent/id6754793592" 
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 bg-bg-card text-brand-primary rounded-xl hover:bg-bg-secondary transition-all duration-200 font-semibold"
          >
            <Download className="w-5 h-5 mr-2" />
            {tHero('downloadApp')}
          </a>
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-bg-card text-bg-card rounded-xl hover:bg-bg-card hover:text-brand-primary transition-all duration-200"
          >
            <Globe className="w-5 h-5 mr-2" />
            {tHero('tryWebPortal')}
          </Link>
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
      <section id="faq" className="py-20 bg-bg-secondary" aria-label="Frequently asked questions">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            {t('title')}
          </h2>
          <p className="text-xl text-text-secondary">
            {t('description')}
          </p>
        </div>
        
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="bg-bg-card rounded-lg shadow-sm">
              <Button
                onClick={() => toggleItem(index)}
                variant="ghost"
                className="w-full px-6 py-4 h-auto text-left flex items-center justify-between hover:bg-bg-secondary rounded-lg"
              >
                <span className="font-semibold text-text-primary">{item.question}</span>
                {openItems.has(index) ? (
                  <ChevronUp className="w-5 h-5 text-text-tertiary" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-text-tertiary" />
                )}
              </Button>
              {openItems.has(index) && (
                <div className="px-6 pb-4">
                  <p className="text-text-secondary">{item.answer}</p>
                </div>
              )}
            </div>
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
      let featuresArray: string[] = [];
      if (Array.isArray(plan.features)) {
        featuresArray = plan.features;
      } else if (typeof plan.features === 'string') {
        try {
          featuresArray = JSON.parse(plan.features);
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
        'teamCollaborationTools'
      ];
      
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
    <section id="pricing" className="py-20 bg-bg-card" aria-label="Pricing plans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            {tPricing('title')}
          </h2>
          <p className="text-xl text-text-secondary">
            {tPricing('description')}
          </p>
        </div>
        
        {/* Duration Toggle */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center bg-bg-secondary rounded-lg p-1">
            <Button
              onClick={() => setSelectedDuration('3')}
              variant={selectedDuration === '3' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '3' ? 'bg-bg-card shadow-sm' : ''}
            >
              <div className="text-center">
                <div>{tPricing('months.three')}</div>
                <div className="text-lg text-text-secondary font-bold">{tPricing('discounts.three')}</div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedDuration('6')}
              variant={selectedDuration === '6' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '6' ? 'bg-bg-card shadow-sm' : ''}
            >
              <div className="text-center">
                <div>{tPricing('months.six')}</div>
                <div className="text-lg text-action-success font-bold">{tPricing('discounts.six')}</div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedDuration('12')}
              variant={selectedDuration === '12' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '12' ? 'bg-bg-card shadow-sm' : ''}
            >
              <div className="text-center">
                <div>{tPricing('months.twelve')}</div>
                <div className="text-lg text-action-danger font-bold">{tPricing('discounts.twelve')}</div>
              </div>
            </Button>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            <span className="ml-3 text-text-secondary">{tPricing('loading')}</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-action-danger mb-4">{error || tPricing('error')}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              {tPricing('retry')}
            </Button>
          </div>
        )}
        
        {/* Pricing Cards */}
        {!loading && !error && pricingData.length > 0 && (
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingData.map((plan, index) => (
            <div key={index} className={`relative bg-bg-card rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
              plan.popular ? 'border-brand-primary scale-105' : 'border-border'
            }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-brand-primary to-action-primary text-text-inverted px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                    {tPricing('plans.basic.mostPopular')}
                  </span>
                </div>
              )}
              
              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-text-primary mb-2">{plan.name}</h3>
                  <p className="text-text-secondary mb-4">{plan.subtitle}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-text-primary">{plan.price}</span>
                    <span className="text-text-secondary">/{tPricing('plans.basic.period')}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{plan.description}</p>
                </div>
                        
                {/* Features */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center justify-between">
                      <span className={`text-sm ${feature.included ? 'text-text-primary' : 'text-text-tertiary'}`}>
                        {feature.text}
                      </span>
                      {feature.included ? (
                        <Check className="w-6 h-6 text-action-success drop-shadow-sm" />
                      ) : (
                        <X className="w-6 h-6 text-action-danger drop-shadow-sm" />
                      )}
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Link 
                  href="/login" 
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-text-inverted transition-all duration-200 ${plan.buttonClass} inline-block text-center`}
                >
                  {plan.buttonText || tPricing('buttonText')}
                </Link>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Empty State */}
        {!loading && !error && pricingData.length === 0 && (
          <div className="text-center py-20">
            <p className="text-text-secondary">{tPricing('noPlans')}</p>
          </div>
        )}
        
        {/* Additional information */}
        <div className="mt-16 text-center">
          <div className="bg-bg-secondary rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              {tPricing('allPlansInclude')}
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-action-success" />
                <span className="text-text-primary">{tPricing('support24')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-action-success" />
                <span className="text-text-primary">{tPricing('dataBackup')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-action-success" />
                <span className="text-text-primary">{tPricing('freeUpdates')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-action-success" />
                <span className="text-text-primary">{tPricing('features.mobileApp')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-action-success" />
                <span className="text-text-primary">{tPricing('training')}</span>
              </div>
            </div>
          </div>
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
              <div className="w-10 h-10 bg-gradient-to-br from-brand-primary via-action-primary to-brand-secondary rounded-xl flex items-center justify-center mr-3 shadow-lg">
                <Store className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">AnyRent</span>
            </div>
            <p className="text-gray-400 mb-4">
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
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">{tf('product.features')}</a></li>
              <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">{tf('product.pricing')}</a></li>
              <li><a href="#download" className="text-gray-400 hover:text-white transition-colors">{tf('product.downloadApp')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">{tf('support.title')}</h3>
            <ul className="space-y-2">
              <li><a href="#faq" className="text-gray-400 hover:text-white transition-colors">{tf('support.faq')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{tf('support.documentation')}</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{tf('support.contact')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">{tf('company.title')}</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{tf('company.aboutUs')}</a></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">{tf('company.terms')}</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">{tf('company.privacy')}</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            {tf('copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};

const FloatingButtons = () => {
  // Số điện thoại: +840764774647
  // Format cho WhatsApp: 840764774647 (bỏ dấu +)
  // Format cho Zalo: 0764774647 (bỏ +84, thêm số 0 đầu)
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
        
        {/* Download App Button */}
        <a 
          href="https://apps.apple.com/vn/app/anyrent/id6754793592" 
          target="_blank"
          rel="noopener noreferrer"
          className="bg-text-primary text-text-inverted p-3 rounded-full shadow-lg hover:bg-text-secondary transition-colors"
          title="Download iOS App"
        >
          <Download className="w-6 h-6" />
        </a>
        
        {/* Login Button */}
        <Link 
          href="/login" 
          className="bg-gradient-to-r from-brand-primary to-action-primary text-text-inverted p-3 rounded-full shadow-lg hover:from-brand-secondary hover:to-action-primary transition-all duration-200 transform hover:scale-110"
          title="Login"
        >
          <Globe className="w-6 h-6" />
        </Link>
      </div>
    </div>
  );
};

export default LandingPage; 