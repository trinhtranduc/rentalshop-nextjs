/**
 * i18n Configuration for next-intl
 *
 * This file is required by next-intl for App Router
 * It provides configuration for both server and client components
 */

import { getRequestConfig } from 'next-intl/server';
import { isPublicLocale } from '@rentalshop/constants';
import { APP_LOCALES, appLocaleFor, type AppLocale } from './lib/public-content/shop-locale';
import { shopMessages } from './lib/public-content/shop-messages';
import { appMessages } from './lib/app-messages';

// #1597 the web languages that are on (`webLanguages()`)
export const locales = APP_LOCALES;
export const defaultLocale = 'vi' as const; // ✅ Vietnamese as default (Vietnam market)
export type Locale = AppLocale;

// Validate if locale is supported
export function isValidLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale);
}

// Export configuration for next-intl
// This function is called by next-intl to get the configuration
export default getRequestConfig(async () => {
  // Detect locale from cookie (server-side)
  // This runs on the server for each request
  let locale: Locale = defaultLocale;

  // Check if running in browser or server
  if (typeof window === 'undefined') {
    // SERVER SIDE: Read from cookie header
    // Note: cookies() is available in server components
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      // #1146: a public language that is not on for the web falls back to English
      locale = appLocaleFor(cookieStore.get('NEXT_LOCALE')?.value);

      // #1146: the public shop pages use the shop language the middleware picked (12 public languages)
      const { headers } = await import('next/headers');
      const shopLanguage = headers().get('x-anyrent-shop-page') ? headers().get('x-anyrent-public-locale') : null;
      if (isPublicLocale(shopLanguage)) {
        if (isValidLocale(shopLanguage)) locale = shopLanguage;
        else {
          const en = await appMessages('en');
          return {
            locale: shopLanguage,
            messages: { ...en, ...shopMessages(shopLanguage, { products: en.products, common: en.common }) },
            timeZone: 'Asia/Ho_Chi_Minh',
            now: new Date(),
          };
        }
      }
    } catch (error) {
      // Fallback to default if error
      console.log('Using default locale:', defaultLocale);
    }
  }

  return {
    locale,
    // #1597 every namespace in the picked language, over English
    messages: await appMessages(locale),
    timeZone: 'Asia/Ho_Chi_Minh',
    now: new Date(),
  };
});
