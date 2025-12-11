// ============================================================================
// CLIENT-SIDE DATE HOOKS - React Hooks Only
// ============================================================================
// This file exports React hooks for date formatting that require client-side context
// DO NOT import this in server-side code (API routes, server components)

import { useLocale as useNextIntlLocale } from 'next-intl';
import {
  formatDateByLocale,
  formatChartPeriod,
  formatFullDateByLocale,
  formatDateTimeByLocale,
  formatMonthOnlyByLocale,
  formatDailyByLocale,
  type DateFormatOptions
} from './core/date';

/**
 * Hook to get formatted date using current locale
 * 
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function useFormattedDate(
  date: string | Date, 
  options: DateFormatOptions = { month: 'short', year: 'numeric' }
): string {
  const locale = useNextIntlLocale() as 'en' | 'vi';
  return formatDateByLocale(date, locale, options);
}

/**
 * Hook to get formatted chart period using current locale
 * 
 * @param date - Date string or Date object
 * @returns Formatted period string for charts
 */
export function useFormattedChartPeriod(date: string | Date): string {
  const locale = useNextIntlLocale() as 'en' | 'vi';
  return formatChartPeriod(date, locale);
}

/**
 * Hook to get formatted full date using current locale
 * 
 * @param date - Date string or Date object
 * @returns Formatted date string (dd/mm/yy for Vietnamese, standard for English)
 */
export function useFormattedFullDate(date: string | Date): string {
  const locale = useNextIntlLocale() as 'en' | 'vi';
  return formatFullDateByLocale(date, locale);
}

/**
 * Hook to get formatted datetime using current locale
 * 
 * @param date - Date string or Date object
 * @returns Formatted datetime string (dd/mm/yyyy hh:mm for Vietnamese, standard for English)
 */
export function useFormattedDateTime(date: string | Date): string {
  const locale = useNextIntlLocale() as 'en' | 'vi';
  return formatDateTimeByLocale(date, locale);
}

/**
 * Hook to get formatted month only using current locale
 * 
 * @param date - Date string or Date object
 * @returns Formatted month string (mm/yy for Vietnamese, standard for English)
 */
export function useFormattedMonthOnly(date: string | Date): string {
  const locale = useNextIntlLocale() as 'en' | 'vi';
  return formatMonthOnlyByLocale(date, locale);
}

/**
 * Hook to get formatted daily using current locale
 * 
 * @param date - Date string or Date object
 * @returns Formatted daily string (dd/mm for Vietnamese, standard for English)
 */
export function useFormattedDaily(date: string | Date): string {
  const locale = useNextIntlLocale() as 'en' | 'vi';
  return formatDailyByLocale(date, locale);
}

