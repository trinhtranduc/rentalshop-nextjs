import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to a readable string
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'vi-VN')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null | undefined, locale: string = 'vi-VN'): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format a date to a date-only string (no time)
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'vi-VN')
 * @returns Formatted date string (YYYY/MM/DD per locale)
 */
export function formatDateOnly(
  date: Date | string | null | undefined,
  locale: string = 'vi-VN'
): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
}

// formatCurrency is now exported from @rentalshop/utils for centralized currency management 