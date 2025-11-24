'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button, Logo, LanguageSwitcher } from '@rentalshop/ui'
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
  Loader2
} from 'lucide-react'

const LandingPage = () => {
  const t = useTranslations('landing')
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-bg-card to-bg-tertiary">
      
        {/* Header */}
        <header className="bg-bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
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

        {/* Hero Banner */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6">
                {t('hero.title')}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-action-primary to-brand-secondary">
                  {" "}{t('hero.subtitle')}
                </span>
              </h1>
              <p className="text-xl text-text-secondary mb-8 max-w-3xl mx-auto">
                {t('hero.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="https://apps.apple.com/vn/app/rentalshop/id1500115668" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-brand-primary to-action-primary text-text-inverted rounded-xl hover:from-brand-secondary hover:to-action-primary transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Download className="w-5 h-5 mr-2" />
                  {t('hero.downloadApp')}
                </a>
                <Link 
                  href="/login" 
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-brand-primary text-brand-primary rounded-xl hover:bg-gradient-to-r hover:from-brand-primary hover:to-action-primary hover:text-text-inverted transition-all duration-200 transform hover:scale-105"
                >
                  <Globe className="w-5 h-5 mr-2" />
                  {t('hero.tryWebPortal')}
                </Link>
              </div>
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-brand-primary/30 to-action-primary/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-gradient-to-r from-action-primary/30 to-brand-secondary/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-action-warning/30 to-action-success/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
          </div>
        </section>

      {/* App Download Section */}
      <section id="download" className="py-20 bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              {t('download.title')}
            </h2>
            <p className="text-xl text-text-secondary">
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
              <div className="bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-3xl p-8 shadow-xl">
                <div className="w-full flex items-center justify-center">
                  <Image 
                    src="/anyrent-iphone-splashscreen.jpg"
                    alt="AnyRent iPhone Splashscreen"
                    width={288}
                    height={576}
                    className="rounded-3xl shadow-2xl border border-border"
                    priority
                  />
                </div>
                <div className="mt-8">
                  <a 
                    href="https://apps.apple.com/vn/app/rentalshop/id1500115668" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-text-primary text-text-inverted py-3 px-6 rounded-xl hover:bg-text-secondary transition-colors flex items-center justify-center"
                  >
                    <span className="mr-2">📱</span>
                    {t('download.downloadOnAppStore')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-bg-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-text-primary mb-4">
                {t('features.title')}
              </h2>
              <p className="text-xl text-text-secondary">
                {t('features.description')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-border hover:border-brand-primary/30">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-primary/20 to-action-primary/20 rounded-xl flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-brand-primary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">{t('features.orderManagement')}</h3>
                <p className="text-text-secondary">{t('features.orderManagementDesc')}</p>
              </div>
              
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-border hover:border-action-success/30">
                <div className="w-12 h-12 bg-gradient-to-br from-action-success/20 to-emerald-400/20 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-action-success" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">{t('features.customerManagement')}</h3>
                <p className="text-text-secondary">{t('features.customerManagementDesc')}</p>
              </div>
              
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-border hover:border-action-warning/30">
                <div className="w-12 h-12 bg-gradient-to-br from-action-warning/20 to-amber-400/20 rounded-xl flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6 text-action-warning" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">{t('features.calendarScheduling')}</h3>
                <p className="text-text-secondary">{t('features.calendarSchedulingDesc')}</p>
              </div>
            
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-border hover:border-action-primary/30">
                <div className="w-12 h-12 bg-gradient-to-br from-action-primary/20 to-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                  <DollarSign className="w-6 h-6 text-action-primary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">{t('features.financialReports')}</h3>
                <p className="text-text-secondary">{t('features.financialReportsDesc')}</p>
              </div>
            
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-border hover:border-action-danger/30">
                <div className="w-12 h-12 bg-gradient-to-br from-action-danger/20 to-red-500/20 rounded-xl flex items-center justify-center mb-6">
                  <AlertTriangle className="w-6 h-6 text-action-danger" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">{t('features.duplicatePrevention')}</h3>
                <p className="text-text-secondary">{t('features.duplicatePreventionDesc')}</p>
              </div>
            
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-border hover:border-brand-secondary/30">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-secondary/20 to-blue-400/20 rounded-xl flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6 text-brand-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">{t('features.multiPlatform')}</h3>
                <p className="text-text-secondary">{t('features.multiPlatformDesc')}</p>
              </div>
            </div>
          </div>
        </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              {t('whyChoose.title')}
            </h2>
            <p className="text-xl text-text-secondary">
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
              <div className="bg-gradient-to-br from-brand-primary via-action-primary to-brand-secondary rounded-3xl p-8 text-text-inverted shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="text-center relative z-10">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="w-8 h-8 mr-2 text-yellow-300" />
                    <div className="text-6xl font-bold">500+</div>
                  </div>
                  <div className="text-xl mb-8 font-semibold">{t('whyChoose.activeStores')}</div>
                  <div className="flex justify-center space-x-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-6 h-6 fill-yellow-300 text-yellow-300" />
                    ))}
                  </div>
                  <div className="text-sm font-semibold">{t('whyChoose.rating')}</div>
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
  );
};

// Simple component implementations for the landing page
const Stats = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-brand-primary via-action-primary to-brand-secondary text-text-inverted relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">500+</div>
            <div className="text-text-inverted/70">Active Stores</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">10,000+</div>
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
    <section className="py-20 bg-bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            {t('title')}
          </h2>
          <p className="text-xl text-text-secondary">
            {t('description')}
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-bg-secondary rounded-2xl p-8">
            <div className="flex items-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-5 h-5 text-action-warning fill-current" />
              ))}
            </div>
            <p className="text-text-secondary mb-4">
              "AnyRent has helped me manage my rental business efficiently. The interface is easy to use and features are comprehensive."
            </p>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center text-text-inverted font-bold">
                J
              </div>
              <div className="ml-3">
                <div className="font-semibold text-text-primary">John Smith</div>
                <div className="text-sm text-text-tertiary">Rental Shop Owner</div>
              </div>
            </div>
          </div>
          
          <div className="bg-bg-secondary rounded-2xl p-8">
            <div className="flex items-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-5 h-5 text-action-warning fill-current" />
              ))}
            </div>
            <p className="text-text-secondary mb-4">
              "The order management feature is very convenient. I can track all orders easily and manage my inventory effectively."
            </p>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-action-success rounded-full flex items-center justify-center text-text-inverted font-bold">
                S
              </div>
              <div className="ml-3">
                <div className="font-semibold text-text-primary">Sarah Johnson</div>
                <div className="text-sm text-text-tertiary">Shop Manager</div>
              </div>
            </div>
          </div>
          
          <div className="bg-bg-secondary rounded-2xl p-8">
            <div className="flex items-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-5 h-5 text-action-warning fill-current" />
              ))}
            </div>
            <p className="text-text-secondary mb-4">
              "The mobile app is very convenient. I can manage my shop from anywhere and the interface is intuitive."
            </p>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-action-primary rounded-full flex items-center justify-center text-text-inverted font-bold">
                M
              </div>
              <div className="ml-3">
                <div className="font-semibold text-text-primary">Mike Wilson</div>
                <div className="text-sm text-text-tertiary">Business Owner</div>
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
      <section className="py-20 bg-gradient-to-br from-brand-primary via-action-primary to-brand-secondary relative overflow-hidden">
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
            href="https://apps.apple.com/vn/app/rentalshop/id1500115668" 
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
  
  return (
    <section id="faq" className="py-20 bg-bg-secondary">
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
      // Discounts: 3m=0%, 6m=5%, 12m=15% (applied to monthly price)
      let monthlyPrice = 0;
      const periodLabel = tPricing('plans.basic.period');
      let savings = 0;

      const base = plan.basePrice || 0;
      if (selectedDuration === '3') {
        monthlyPrice = base; // no discount
        savings = 0;
      } else if (selectedDuration === '6') {
        monthlyPrice = base * 0.95; // 5% discount per month
        savings = base * 0.05 * 6; // total savings for context if needed
      } else if (selectedDuration === '12') {
        monthlyPrice = base * 0.85; // 15% discount per month
        savings = base * 0.15 * 12;
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

      // Transform features array to display format with translation
      const features = featuresArray.map((feature) => ({
        text: translatePlanFeature(feature, tPlans),
        included: true
      }));

      // Check if it's a contact plan and format price accordingly
      const description = (plan.description || '').toLowerCase();
      const isContactPlan = (monthlyPrice === 0) && (description.includes('contact') || description.includes('liên hệ'));
      const displayPrice = isContactPlan 
        ? (tPlans('fields.contactPrice') || 'Contact') 
        : formatCurrency(monthlyPrice, plan.currency);

      return {
        id: plan.id,
        name: plan.name,
        subtitle: plan.description || '',
        price: displayPrice,
        period: periodLabel,
        description: plan.description || '',
        features: features,
        popular: plan.isPopular || false,
        buttonText: "Get Started",
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
    <section id="pricing" className="py-20 bg-bg-card">
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
                <div className="text-lg text-text-secondary font-bold">0%</div>
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
                <div className="text-lg text-action-success font-bold">-5%</div>
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
                <div className="text-lg text-action-danger font-bold">-15%</div>
              </div>
            </Button>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            <span className="ml-3 text-text-secondary">Loading plans...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-action-danger mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Retry
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
                  {tPricing('plans.basic.buttonText')}
                </Link>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Empty State */}
        {!loading && !error && pricingData.length === 0 && (
          <div className="text-center py-20">
            <p className="text-text-secondary">No plans available at the moment.</p>
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
    <footer id="contact" className="bg-gray-900 text-white py-12">
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
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col space-y-3">
        <a 
          href="https://apps.apple.com/vn/app/rentalshop/id1500115668" 
          target="_blank"
          rel="noopener noreferrer"
          className="bg-text-primary text-text-inverted p-3 rounded-full shadow-lg hover:bg-text-secondary transition-colors"
          title="Download iOS App"
        >
          <Download className="w-6 h-6" />
        </a>
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