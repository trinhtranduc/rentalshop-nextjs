'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button, Card, CardContent, Badge, Logo } from '@rentalshop/ui'
import {
  Smartphone,
  Globe,
  ShoppingBag,
  Users,
  Calendar,
  BarChart3,
  Shield,
  Zap,
  Search,
  Bell,
  FileText,
  Settings,
  CreditCard,
  Package,
  TrendingUp,
  CheckCircle2,
  Download,
  Monitor,
  Cloud,
  Lock,
  RefreshCw,
  X,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const FeaturesPage = () => {
  const t = useTranslations('features')
  const [mobileScreenshotIndex, setMobileScreenshotIndex] = useState(0)
  const [isMobilePaused, setIsMobilePaused] = useState(false)
  const mobileIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const mobileScreenshots = [
    { src: '/anyrent-iphone-order.jpg', alt: 'Order Management', label: 'Quản lý Đơn hàng' },
    { src: '/anyrent-iphone-product.jpg', alt: 'Product Management', label: 'Quản lý Sản phẩm' },
    { src: '/anyrent-iphone-calendar.jpg', alt: 'Calendar & Scheduling', label: 'Lịch & Lên lịch' },
    { src: '/anyrent-user-management.jpg', alt: 'User Management', label: 'Quản lý Người dùng' },
  ]

  const webScreenshots = [
    { src: '/anyrent-web-order-calendar.png', alt: 'Order Calendar', label: 'Lịch Đơn hàng' },
    { src: '/anyrent-web-order-detail.png', alt: 'Order Details', label: 'Chi tiết Đơn hàng' },
    { src: '/anyrent-web-order.png', alt: 'Order Management', label: 'Quản lý Đơn hàng' },
  ]

  const nextMobileScreenshot = () => {
    setMobileScreenshotIndex((prev) => (prev + 1) % mobileScreenshots.length)
  }

  const prevMobileScreenshot = () => {
    setMobileScreenshotIndex((prev) => (prev - 1 + mobileScreenshots.length) % mobileScreenshots.length)
  }


  // Auto-scroll for mobile screenshots
  useEffect(() => {
    if (isMobilePaused) {
      if (mobileIntervalRef.current) {
        clearInterval(mobileIntervalRef.current)
        mobileIntervalRef.current = null
      }
      return
    }

    mobileIntervalRef.current = setInterval(() => {
      setMobileScreenshotIndex((prev) => (prev + 1) % mobileScreenshots.length)
    }, 4000) // Change every 4 seconds

    return () => {
      if (mobileIntervalRef.current) {
        clearInterval(mobileIntervalRef.current)
        mobileIntervalRef.current = null
      }
    }
  }, [isMobilePaused, mobileScreenshots.length])


  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Header - Clean & Minimal */}
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
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                {t('navigation.home')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Clean & Modern */}
      <section className="relative pt-24 pb-20 bg-gradient-to-b from-gray-50 to-white" aria-label="Features hero section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-6 px-3 py-1 text-xs font-medium text-gray-600 border-gray-200 bg-white">
              {t('hero.badge')}
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
              {t('hero.title')}
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              {t('hero.description')}
            </p>
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
          </div>
        </div>
      </section>

      {/* Platform Overview Section - Clean Cards */}
      <section className="py-24 bg-white" aria-label="Platform overview">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              {t('platforms.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('platforms.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Mobile App Card */}
            <Card className="border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 bg-white">
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                  <Smartphone className="w-8 h-8 text-gray-900" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('platforms.mobile.title')}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{t('platforms.mobile.description')}</p>
                <div className="space-y-3">
                  {['ios', 'android', 'offline', 'sync'].map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{t(`platforms.mobile.features.${feature}`)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Web Portal Card */}
            <Card className="border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 bg-white">
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                  <Monitor className="w-8 h-8 text-gray-900" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('platforms.web.title')}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{t('platforms.web.description')}</p>
                <div className="space-y-3">
                  {['responsive', 'fullFeatures', 'reports', 'multiUser'].map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{t(`platforms.web.features.${feature}`)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mobile Features Section - Clean Grid */}
      <section className="py-24 bg-gray-50" aria-label="Mobile features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium text-gray-600 border-gray-200 bg-white">
              {t('mobile.badge')}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              {t('mobile.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('mobile.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: ShoppingBag, key: 'orderManagement' },
              { icon: Users, key: 'customerManagement' },
              { icon: Package, key: 'inventoryManagement' },
              { icon: Calendar, key: 'scheduling' },
              { icon: Search, key: 'quickSearch' },
              { icon: Bell, key: 'notifications' },
            ].map((feature) => {
              const IconComponent = feature.icon;
              return (
                <Card 
                  key={feature.key} 
                  className="border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 bg-white group"
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-4 transition-colors duration-300">
                      <IconComponent className="w-6 h-6 text-gray-900" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t(`mobile.features.${feature.key}.title`)}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {t(`mobile.features.${feature.key}.description`)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Mobile Screenshots Carousel */}
          <div className="mt-20">
            <div 
              className="relative max-w-sm mx-auto"
              onMouseEnter={() => setIsMobilePaused(true)}
              onMouseLeave={() => setIsMobilePaused(false)}
            >
              <div className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden border-8 border-gray-900 shadow-2xl bg-gray-100">
                <Image
                  src={mobileScreenshots[mobileScreenshotIndex].src}
                  alt={mobileScreenshots[mobileScreenshotIndex].alt}
                  fill
                  className="object-contain transition-opacity duration-500"
                  priority
                  sizes="(max-width: 768px) 100vw, 384px"
                />
              </div>
              
              {/* Navigation Buttons */}
              <button
                onClick={() => {
                  prevMobileScreenshot()
                  setIsMobilePaused(true)
                  setTimeout(() => setIsMobilePaused(false), 3000)
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-10"
                aria-label="Previous screenshot"
              >
                <ChevronLeft className="w-5 h-5 text-gray-900" />
              </button>
              <button
                onClick={() => {
                  nextMobileScreenshot()
                  setIsMobilePaused(true)
                  setTimeout(() => setIsMobilePaused(false), 3000)
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-10"
                aria-label="Next screenshot"
              >
                <ChevronRight className="w-5 h-5 text-gray-900" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {mobileScreenshots.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setMobileScreenshotIndex(index)
                      setIsMobilePaused(true)
                      setTimeout(() => setIsMobilePaused(false), 3000) // Resume after 3 seconds
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      index === mobileScreenshotIndex ? 'bg-white w-6' : 'bg-white/50'
                    }`}
                    aria-label={`Go to screenshot ${index + 1}`}
                  />
                ))}
              </div>

              {/* Label */}
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-gray-700">
                  {mobileScreenshots[mobileScreenshotIndex].label}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {mobileScreenshotIndex + 1} / {mobileScreenshots.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Web Features Section - Clean Grid */}
      <section className="py-24 bg-white" aria-label="Web features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium text-gray-600 border-gray-200 bg-white">
              {t('web.badge')}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              {t('web.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('web.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: BarChart3, key: 'analytics' },
              { icon: FileText, key: 'reports' },
              { icon: Settings, key: 'settings' },
              { icon: Users, key: 'userManagement' },
              { icon: CreditCard, key: 'payments' },
              { icon: Shield, key: 'security' },
            ].map((feature) => {
              const IconComponent = feature.icon;
              return (
                <Card 
                  key={feature.key} 
                  className="border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 bg-white group"
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-4 transition-colors duration-300">
                      <IconComponent className="w-6 h-6 text-gray-900" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t(`web.features.${feature.key}.title`)}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {t(`web.features.${feature.key}.description`)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Web Screenshots Grid */}
          <div className="mt-20">
            <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {webScreenshots.map((screenshot, index) => (
                <div key={index} className="group">
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-100">
                    <Image
                      src={screenshot.src}
                      alt={screenshot.alt}
                      fill
                      className="object-contain transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-sm font-medium text-gray-700">
                      {screenshot.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Shared Features Section - Clean Cards */}
      <section className="py-24 bg-gray-50" aria-label="Shared features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium text-gray-600 border-gray-200 bg-white">
              {t('shared.badge')}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              {t('shared.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('shared.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              { icon: Cloud, key: 'cloudSync' },
              { icon: Lock, key: 'dataSecurity' },
              { icon: Zap, key: 'realTime' },
              { icon: TrendingUp, key: 'scalable' },
            ].map((feature) => {
              const IconComponent = feature.icon;
              return (
                <Card key={feature.key} className="border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 bg-white">
                  <CardContent className="p-8">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                      <IconComponent className="w-8 h-8 text-gray-900" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      {t(`shared.features.${feature.key}.title`)}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {t(`shared.features.${feature.key}.description`)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section - Clean & Modern */}
      <section className="py-24 bg-gray-900" aria-label="Call to action">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            {t('cta.description')}
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
                {t('cta.downloadApp')}
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
                {t('cta.tryWebPortal')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  )
}

export default FeaturesPage
