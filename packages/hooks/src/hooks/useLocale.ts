/**
 * Locale Management Hook
 * 
 * Provides functionality to switch between supported locales.
 * Uses cookies to persist locale preference across page reloads.
 * 
 * WHY USE COOKIES?
 * - Server components can read cookies
 * - Allows server-side rendering with correct locale
 * - Persists across browser sessions
 */

'use client';

import { useLocale as useNextIntlLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export type SupportedLocale = 'en' | 'vi';

/**
 * Hook to get current locale and switch between locales
 * 
 * @returns {Object} Object containing:
 *   - locale: Current locale ('en' or 'vi')
 *   - setLocale: Function to change locale
 *   - isPending: Whether locale change is in progress
 */
export function useLocale() {
  const locale = useNextIntlLocale() as SupportedLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  /**
   * Change the current locale
   * 
   * HOW IT WORKS:
   * 1. Set a cookie with the new locale
   * 2. Refresh the page to apply the new locale
   * 
   * WHY REFRESH?
   * - next-intl needs to reload to apply new messages
   * - Cookie is read server-side during next render
   * 
   * @param newLocale - The locale to switch to ('en' or 'vi')
   */
  const setLocale = (newLocale: SupportedLocale) => {
    // Set cookie that will be read by i18n.ts
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`; // 1 year
    
    startTransition(() => {
      // Refresh the current page to apply new locale
      router.refresh();
    });
  };

  return {
    locale,
    setLocale,
    isPending,
  };
}

