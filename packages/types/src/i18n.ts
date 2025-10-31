/**
 * i18n Type Definitions
 * 
 * Type-safe translations with autocomplete support
 */

// Import English messages as the source of truth for types
type Messages = typeof import('../../../locales/en/common.json') & 
  typeof import('../../../locales/en/auth.json') &
  typeof import('../../../locales/en/dashboard.json') &
  typeof import('../../../locales/en/orders.json') &
  typeof import('../../../locales/en/products.json') &
  typeof import('../../../locales/en/customers.json') &
  typeof import('../../../locales/en/settings.json') &
  typeof import('../../../locales/en/validation.json');

// Extend next-intl module for type safety
declare global {
  // Use type safe message keys with next-intl
  type IntlMessages = Messages;
}

// Export locale type
export type Locale = 'en' | 'vi';

// Export default locale
export const defaultLocale: Locale = 'en';

// Export available locales
export const locales: readonly Locale[] = ['en', 'vi'] as const;

