'use client';

import React from 'react';
import { Button } from '@rentalshop/ui';
import { Link2, X, Sparkles, TrendingUp, Gift, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AffiliateBannerProps {
  variant?: 'default' | 'minimal' | 'badge' | 'info' | 'promo';
  onDismiss: () => void;
  onClick: () => void;
}

/**
 * Affiliate Banner Component with multiple UI variants
 * Based on common patterns from SaaS and affiliate systems
 */
export default function AffiliateBanner({ 
  variant = 'default',
  onDismiss,
  onClick 
}: AffiliateBannerProps) {
  const tAffiliate = useTranslations('affiliate');

  // Variant 1: Default - Full width gradient banner (current)
  if (variant === 'default') {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-blue-600/90 to-blue-700/90 text-white/90 shadow-lg cursor-pointer hover:from-blue-700/90 hover:to-blue-800/90 transition-all duration-200 backdrop-blur-sm"
        onClick={onClick}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Link2 className="w-4 h-4 flex-shrink-0 opacity-90" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-xs sm:text-sm truncate opacity-90">
                    {tAffiliate('banner.title')}
                  </p>
                  <span className="px-2 py-0.5 bg-orange-500/90 text-white text-[10px] sm:text-xs font-bold rounded whitespace-nowrap">
                    {tAffiliate('banner.promo')}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-blue-100/80 opacity-80 truncate">
                  {tAffiliate('banner.description')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="text-white/80 hover:bg-blue-600/40 flex-shrink-0 h-6 w-6"
              title={tAffiliate('banner.dismiss')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Variant 2: Minimal - Thin line with subtle background
  if (variant === 'minimal') {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[60] bg-blue-50 border-b border-blue-200 text-blue-900 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={onClick}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-blue-900 truncate">
                <span className="font-medium">{tAffiliate('banner.title')}</span>
                {' '}
                <span className="text-blue-700">{tAffiliate('banner.description')}</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="text-blue-600 hover:bg-blue-200 flex-shrink-0 h-5 w-5"
              title={tAffiliate('banner.dismiss')}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Variant 3: Badge - Small badge style in top right corner
  if (variant === 'badge') {
    return (
      <div 
        className="fixed top-4 right-4 z-[60] bg-white border-2 border-blue-500 rounded-lg shadow-xl cursor-pointer hover:shadow-2xl transition-all duration-200 group"
        onClick={onClick}
      >
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs text-gray-900 leading-tight">
              {tAffiliate('banner.title')}
            </p>
            <p className="text-[10px] text-gray-600 leading-tight">
              {tAffiliate('banner.button')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0 h-5 w-5"
            title={tAffiliate('banner.dismiss')}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Variant 4: Info - Info-style banner with icon
  if (variant === 'info') {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[60] bg-indigo-50 border-b border-indigo-200 text-indigo-900 cursor-pointer hover:bg-indigo-100 transition-colors"
        onClick={onClick}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Info className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs sm:text-sm text-indigo-900 truncate">
                  {tAffiliate('banner.title')}
                </p>
                <p className="text-[10px] sm:text-xs text-indigo-700 truncate">
                  {tAffiliate('banner.description')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="text-indigo-600 hover:bg-indigo-200 flex-shrink-0 h-6 w-6"
              title={tAffiliate('banner.dismiss')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Variant 5: Promo - Promotional style with gift icon
  if (variant === 'promo') {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white shadow-lg cursor-pointer hover:opacity-95 transition-opacity"
        onClick={onClick}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Gift className="w-4 h-4 flex-shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs sm:text-sm truncate">
                  {tAffiliate('banner.title')}
                </p>
                <p className="text-[10px] sm:text-xs text-white/90 truncate">
                  {tAffiliate('banner.description')}
                </p>
              </div>
              <TrendingUp className="w-4 h-4 flex-shrink-0 hidden sm:block" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="text-white hover:bg-white/20 flex-shrink-0 h-6 w-6"
              title={tAffiliate('banner.dismiss')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
