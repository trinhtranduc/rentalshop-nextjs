import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatInShopZone } from "@rentalshop/utils"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a business date-time in the shop zone (Vietnam)
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'vi-VN')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null | undefined, locale: string = 'vi-VN'): string {
  if (!date) return 'N/A';
  
  // Business dates in the shop zone (Vietnam), whatever the browser zone (#578 ADM-9)
  return formatInShopZone(date, locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }) || 'Invalid Date';
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
  // Shop civil day (Vietnam); a `YYYY-MM-DD` key is that day (#578 ADM-9)
  return formatInShopZone(date, locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }) || 'Invalid Date';
}

// formatCurrency is now exported from @rentalshop/utils for centralized currency management 