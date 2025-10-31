/**
 * i18n Configuration for next-intl
 * 
 * This file is required by next-intl for App Router
 * It provides configuration for both server and client components
 */

import { getRequestConfig } from 'next-intl/server';

// Supported locales
export const locales = ['en', 'vi'] as const;
export const defaultLocale = 'vi' as const; // ✅ Vietnamese as default (Vietnam market)
export type Locale = typeof locales[number];

// Validate if locale is supported
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

// Import all locale files
import enCommon from '../../locales/en/common.json';
import enAuth from '../../locales/en/auth.json';
import enDashboard from '../../locales/en/dashboard.json';
import enOrders from '../../locales/en/orders.json';
import enProducts from '../../locales/en/products.json';
import enCustomers from '../../locales/en/customers.json';
import enSettings from '../../locales/en/settings.json';
import enValidation from '../../locales/en/validation.json';
import enErrors from '../../locales/en/errors.json';
import enUsers from '../../locales/en/users.json';
import enOutlets from '../../locales/en/outlets.json';
import enCategories from '../../locales/en/categories.json';
import enCalendar from '../../locales/en/calendar.json';
import enPlans from '../../locales/en/plans.json';
import enSubscription from '../../locales/en/subscription.json';

import viCommon from '../../locales/vi/common.json';
import viAuth from '../../locales/vi/auth.json';
import viDashboard from '../../locales/vi/dashboard.json';
import viOrders from '../../locales/vi/orders.json';
import viProducts from '../../locales/vi/products.json';
import viCustomers from '../../locales/vi/customers.json';
import viSettings from '../../locales/vi/settings.json';
import viValidation from '../../locales/vi/validation.json';
import viErrors from '../../locales/vi/errors.json';
import viUsers from '../../locales/vi/users.json';
import viOutlets from '../../locales/vi/outlets.json';
import viCategories from '../../locales/vi/categories.json';
import viCalendar from '../../locales/vi/calendar.json';
import viPlans from '../../locales/vi/plans.json';
import viSubscription from '../../locales/vi/subscription.json';

// Combine all messages by locale
const messages = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    orders: enOrders,
    products: enProducts,
    customers: enCustomers,
    settings: enSettings,
    validation: enValidation,
    errors: enErrors,
    users: enUsers,
    outlets: enOutlets,
    categories: enCategories,
    calendar: enCalendar,
    plans: enPlans,
    subscription: enSubscription,
  },
  vi: {
    common: viCommon,
    auth: viAuth,
    dashboard: viDashboard,
    orders: viOrders,
    products: viProducts,
    customers: viCustomers,
    settings: viSettings,
    validation: viValidation,
    errors: viErrors,
    users: viUsers,
    outlets: viOutlets,
    categories: viCategories,
    calendar: viCalendar,
    plans: viPlans,
    subscription: viSubscription,
  },
};

// Export configuration for next-intl
// This function is called by next-intl to get the configuration
export default getRequestConfig(async () => {
  // Detect locale from cookie (server-side)
  // This runs on the server for each request
  let locale = defaultLocale;

  // Check if running in browser or server
  if (typeof window === 'undefined') {
    // SERVER SIDE: Read from cookie header
    // Note: cookies() is available in server components
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const localeCookie = cookieStore.get('NEXT_LOCALE');
      
      if (localeCookie?.value && isValidLocale(localeCookie.value)) {
        locale = localeCookie.value;
      }
    } catch (error) {
      // Fallback to default if error
      console.log('Using default locale:', defaultLocale);
    }
  }

  return {
    locale,
    messages: messages[locale as keyof typeof messages],
    timeZone: 'Asia/Ho_Chi_Minh',
    now: new Date(),
  };
});
