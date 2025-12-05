/**
 * Translation Hooks
 * 
 * Type-safe hooks for accessing translations in components.
 * These hooks wrap next-intl's useTranslations hook with domain-specific namespaces.
 */

import { useTranslations } from 'next-intl';

/**
 * Hook for common translations (buttons, labels, messages, navigation, etc.)
 */
export function useCommonTranslations() {
  return useTranslations('common');
}

/**
 * Hook for authentication translations (login, register, password, etc.)
 */
export function useAuthTranslations() {
  return useTranslations('auth');
}

/**
 * Hook for dashboard translations (stats, charts, activities, etc.)
 */
export function useDashboardTranslations() {
  return useTranslations('dashboard');
}

/**
 * Hook for order management translations
 */
export function useOrderTranslations() {
  return useTranslations('orders');
}

/**
 * Hook for product management translations
 */
export function useProductTranslations() {
  return useTranslations('products');
}

/**
 * Hook for customer management translations
 */
export function useCustomerTranslations() {
  return useTranslations('customers');
}

/**
 * Hook for settings page translations
 */
export function useSettingsTranslations() {
  return useTranslations('settings');
}

/**
 * Hook for validation message translations
 */
export function useValidationTranslations() {
  return useTranslations('validation');
}

/**
 * Hook for user management translations
 */
export function useUsersTranslations() {
  return useTranslations('users');
}

/**
 * Hook for outlet management translations
 */
export function useOutletsTranslations() {
  return useTranslations('outlets');
}

/**
 * Hook for category management translations
 */
export function useCategoriesTranslations() {
  return useTranslations('categories');
}

/**
 * Hook for calendar translations
 */
export function useCalendarTranslations() {
  return useTranslations('calendar');
}

/**
 * Hook for subscription plans translations
 */
export function usePlansTranslations() {
  return useTranslations('plans');
}

/**
 * Hook for subscription management translations
 */
export function useSubscriptionTranslations() {
  return useTranslations('subscription');
}

/**
 * Hook for API error message translations
 */
export function useErrorTranslations() {
  return useTranslations('errors');
}

/**
 * Hook for bank account management translations
 */
export function useBankAccountTranslations() {
  return useTranslations('bankAccounts');
}

/**
 * Convenience type for translation function
 * Can be used to type the return value of useTranslations
 */
export type TranslationFunction = ReturnType<typeof useTranslations>;

