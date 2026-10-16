'use client'

/**
 * Language Switcher Component
 * 
 * Provides a simple UI to switch between multiple languages.
 * 
 * HOW IT WORKS:
 * 1. User clicks language button
 * 2. Component sets cookie: NEXT_LOCALE={locale}
 * 3. Component sets localStorage for client-side persistence
 * 4. Page refreshes to apply new locale
 * 5. Server reads cookie and renders with correct locale
 * 
 * WHY USE COOKIE + LOCALSTORAGE?
 * - Cookie: Server can read it for SSR
 * - LocalStorage: Client-side fallback
 * - Both: Ensures consistency
 */

import React, { useTransition, useMemo, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentalshop/ui';
import { Globe } from 'lucide-react';

type SupportedLocale = 'en' | 'vi' | 'zh' | 'ko' | 'ja';
type PublicLocale = SupportedLocale | 'ru' | 'zh-TW' | 'fr' | 'de' | 'th' | 'id' | 'es';

// All languages (for landing page)
const allLanguages: Array<{ code: SupportedLocale; label: string; flag: string }> = [
  { code: 'vi', label: 'VI', flag: '🇻🇳' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

const publicLanguages: Array<{ code: PublicLocale; label: string; flag: string }> = [
  ...allLanguages,
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'th', label: 'TH', flag: '🇹🇭' },
  { code: 'id', label: 'ID', flag: '🇮🇩' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
];

// Basic languages (for other pages)
const basicLanguages: Array<{ code: SupportedLocale; label: string; flag: string }> = [
  { code: 'vi', label: 'VI', flag: '🇻🇳' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
];

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
  /** Uses URL-based public content locales without changing the merchant POS locale cookie. */
  publicLocale?: PublicLocale;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'default',
  publicLocale,
}) => {
  const currentLocale = useLocale() as SupportedLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Check if we're on the landing page
  const isLandingPage = useMemo(() => {
    return pathname === '/' || pathname === '/vi' || pathname === '/en' || pathname === '/zh' || pathname === '/ko' || pathname === '/ja';
  }, [pathname]);

  // Get available languages based on page
  const availableLanguages = useMemo(() => {
    if (publicLocale) return publicLanguages;
    if (isLandingPage) {
      return allLanguages;
    }
    // For non-landing pages, only show vi and en
    return basicLanguages;
  }, [isLandingPage, publicLocale]);

  // Auto-fallback to vi/en if on non-landing page with zh/ko/ja locale
  useEffect(() => {
    if (publicLocale) return;
    if (!isLandingPage && ['zh', 'ko', 'ja'].includes(currentLocale)) {
      // Auto-switch to Vietnamese (default) when on non-landing page
      const fallbackLocale: SupportedLocale = 'vi';
      document.cookie = `NEXT_LOCALE=${fallbackLocale};path=/;max-age=31536000;SameSite=Lax`;
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_language_preference', fallbackLocale);
      }
      router.refresh();
    }
  }, [isLandingPage, currentLocale, router, publicLocale]);

  const handleLanguageChange = (newLocale: SupportedLocale | PublicLocale) => {
    if (publicLocale) {
      if (newLocale === publicLocale) return;
      document.cookie = `NEXT_PUBLIC_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
      startTransition(() => {
        router.push(newLocale === 'vi' ? '/' : `/${newLocale}`);
      });
      return;
    }

    if (newLocale === currentLocale) return; // Already selected

    // If switching to zh/ko/ja on non-landing page, redirect to landing page
    if (!isLandingPage && ['zh', 'ko', 'ja'].includes(newLocale)) {
      startTransition(() => {
        document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_language_preference', newLocale);
        }
        router.push('/');
      });
      return;
    }

    startTransition(() => {
      // Set cookie for server-side access
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
      
      // Set localStorage for client-side persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_language_preference', newLocale);
      }
      
      // Refresh the page to apply new locale
      router.refresh();
    });
  };

  // Get current language display
  const selectedLocale = publicLocale || currentLocale;
  const currentLanguage = availableLanguages.find(lang => lang.code === selectedLocale) || availableLanguages[0];

  return (
    <div className="flex items-center gap-2">
      {variant !== 'compact' && <Globe className="w-4 h-4 text-text-tertiary" />}
      <Select
        value={selectedLocale}
        onValueChange={(value) => handleLanguageChange(value as SupportedLocale | PublicLocale)}
        disabled={isPending}
      >
        <SelectTrigger 
          className={variant === 'compact' ? 'h-8 w-auto min-w-[80px] text-xs' : 'h-9 w-auto min-w-[120px]'}
          variant="default"
        >
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span>{currentLanguage.flag}</span>
              <span>{currentLanguage.label}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center gap-2">
                <span className="text-base">{lang.flag}</span>
                <span>{lang.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && variant !== 'compact' && (
        <div className="h-4 w-4 border-2 border-action-primary border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
};
