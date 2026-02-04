import { format, addDays, differenceInDays, isAfter, isBefore, isValid, parseISO } from 'date-fns';
// Note: useLocale import removed - React hooks should not be in server-side code
// Client-side date hooks are now in @rentalshop/utils/client

/**
 * Safely convert any date input to a valid Date object
 */
const toDate = (date: Date | string | null | undefined): Date | null => {
  if (!date) return null;
  
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }
  
  try {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const formatDate = (date: Date | string | null | undefined, formatString: string = 'dd/MM/yyyy'): string => {
  const dateObj = toDate(date);
  if (!dateObj) return 'Invalid Date';
  
  try {
    return format(dateObj, formatString);
  } catch {
    return 'Invalid Date';
  }
};

export const formatDateTime = (date: Date | string | null | undefined): string => {
  const dateObj = toDate(date);
  if (!dateObj) return 'Invalid Date';
  
  try {
    return format(dateObj, 'dd/MM/yyyy HH:mm');
  } catch {
    return 'Invalid Date';
  }
};

export const addDaysToDate = (date: Date, days: number): Date => {
  return addDays(date, days);
};

export const getDaysDifference = (startDate: Date, endDate: Date): number => {
  return differenceInDays(endDate, startDate);
};

export const isDateAfter = (date1: Date, date2: Date): boolean => {
  return isAfter(date1, date2);
};

export const isDateBefore = (date1: Date, date2: Date): boolean => {
  return isBefore(date1, date2);
};

export const getCurrentDate = (): Date => {
  return new Date();
};

export const getTomorrow = (): Date => {
  return addDaysToDate(getCurrentDate(), 1);
};

/**
 * Format date in a user-friendly way (e.g., "January 15, 2025")
 */
export const formatDateLong = (date: Date | string | null | undefined): string => {
  const dateObj = toDate(date);
  if (!dateObj) return 'Invalid Date';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format date and time in a user-friendly way (e.g., "January 15, 2025 at 3:45 PM")
 */
export const formatDateTimeLong = (date: Date | string | null | undefined): string => {
  const dateObj = toDate(date);
  if (!dateObj) return 'Invalid Date';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(dateObj);
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format date in short format (e.g., "Jan 15, 2025")
 */
export const formatDateShort = (date: Date | string | null | undefined): string => {
  const dateObj = toDate(date);
  if (!dateObj) return 'Invalid Date';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(dateObj);
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format date and time in short format (e.g., "Jan 15, 2025 3:45 PM")
 */
export const formatDateTimeShort = (date: Date | string | null | undefined): string => {
  const dateObj = toDate(date);
  if (!dateObj) return 'Invalid Date';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(dateObj);
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format date with locale support
 * @param date - Date object or date string
 * @param locale - Locale code ('en' or 'vi')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatDateWithLocale = (
  date: Date | string | null | undefined,
  locale: 'en' | 'vi' = 'en',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string => {
  const dateObj = toDate(date);
  if (!dateObj) return 'Invalid Date';
  
  try {
    const localeCode = locale === 'vi' ? 'vi-VN' : 'en-US';
    return new Intl.DateTimeFormat(localeCode, options).format(dateObj);
  } catch {
    return 'Invalid Date';
  }
};

// ============================================================================
// CHART DATE FORMATTING UTILITIES
// ============================================================================

export type DateFormatOptions = {
  month?: 'short' | 'long' | 'numeric';
  year?: 'numeric' | '2-digit';
  day?: 'numeric' | '2-digit';
  weekday?: 'short' | 'long' | 'narrow';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
};

/**
 * Get the appropriate locale for date formatting based on current language
 */
export function getDateLocale(locale: string): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

/**
 * Format a date string or Date object according to the current locale
 * 
 * @param date - Date string or Date object to format
 * @param locale - Current locale ('en' or 'vi')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateByLocale(
  date: string | Date, 
  locale: string, 
  options: DateFormatOptions = { month: 'short', year: 'numeric' }
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return date.toString(); // Return original if invalid date
    }
    
    const dateLocale = getDateLocale(locale);
    return dateObj.toLocaleDateString(dateLocale, options);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return date.toString(); // Fallback to original
  }
}

/**
 * Format date for chart periods (month + year)
 * 
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted period string (e.g., "Th12 2024" or "Dec 2024")
 */
export function formatChartPeriod(date: string | Date, locale: string): string {
  if (locale === 'vi') {
    // Vietnamese format: mm/yy
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return date.toString();
    
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString().slice(-2);
    
    return `${month}/${year}`;
  }
  
  // English format: Dec 2024
  return formatDateByLocale(date, locale, { month: 'short', year: 'numeric' });
}

/**
 * Format date for full display (day + month + year)
 * Standardized format: Vietnamese dd/mm/yyyy, English MMM dd, yyyy (e.g., "Nov 28, 2020")
 * 
 * ✅ FIX: Converts UTC datetime to local date (VN UTC+7) for date-only fields
 * Dates like "2026-02-24T17:00:00.000Z" (17:00 UTC = 00:00 VN ngày 25) should display as 25/02
 * 
 * @param date - Date string or Date object (UTC datetime from database)
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted date string (e.g., "28/11/2020" for vi, "Nov 28, 2020" for en)
 */
export function formatFullDateByLocale(date: string | Date, locale: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return date.toString();
  
  // ✅ FIX: Convert UTC datetime to local date (VN UTC+7) for date-only fields
  // Dates are stored as "2026-02-24T17:00:00.000Z" (17:00 UTC = 00:00 VN ngày 25)
  // We need to convert to local date to display correctly
  // Add 7 hours to convert UTC to VN timezone, then extract date components
  const localDate = new Date(dateObj.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
  
  if (locale === 'vi') {
    // Vietnamese format: dd/mm/yyyy (e.g., "28/11/2020")
    // Use UTC components of the local date (after timezone conversion)
    const day = localDate.getUTCDate().toString().padStart(2, '0');
    const month = (localDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = localDate.getUTCFullYear().toString(); // Full 4-digit year
    
    return `${day}/${month}/${year}`;
  }
  
  // English format: MMM dd, yyyy (US standard, e.g., "Nov 28, 2020")
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[localDate.getUTCMonth()];
  const day = localDate.getUTCDate();
  const year = localDate.getUTCFullYear();
  
  return `${month} ${day}, ${year}`;
}

/**
 * Format date for month only display (month + year)
 * 
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted date string (e.g., "01/05" or "Jan 2025")
 */
export function formatMonthOnlyByLocale(date: string | Date, locale: string): string {
  if (locale === 'vi') {
    // Vietnamese format: mm/yy
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return date.toString();
    
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString().slice(-2);
    
    return `${month}/${year}`;
  }
  
  return formatDateByLocale(date, locale, { month: 'short', year: 'numeric' });
}

/**
 * Format date for daily display (day + month)
 * 
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted date string (e.g., "01/10" or "Oct 1")
 */
export function formatDailyByLocale(date: string | Date, locale: string): string {
  if (locale === 'vi') {
    // Vietnamese format: dd/mm
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return date.toString();
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    
    return `${day}/${month}`;
  }
  
  return formatDateByLocale(date, locale, { day: 'numeric', month: 'short' });
}

/**
 * Format date for time display (hour + minute)
 * 
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted time string (e.g., "14:30")
 */
export function formatTimeByLocale(date: string | Date, locale: string): string {
  return formatDateByLocale(date, locale, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date for datetime display (date + time)
 * 
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted datetime string (e.g., "10:12 20/01/05" or "10:12 AM Jan 20, 2025")
 */
export function formatDateTimeByLocale(date: string | Date, locale: string): string {
  if (locale === 'vi') {
    // Vietnamese format: dd/mm/yyyy hh:mm
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return date.toString();
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString(); // Full 4-digit year
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  
  return formatDateByLocale(date, locale, { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// ============================================================================
// REACT HOOKS - MOVED TO CLIENT-SIDE
// ============================================================================
// These hooks use React hooks (useLocale from next-intl) and should not be
// exported from server-side code. They are now available in @rentalshop/utils/client
// 
// Removed hooks:
// - useFormattedDate
// - useFormattedChartPeriod
// - useFormattedFullDate
// - useFormattedDateTime
// - useFormattedMonthOnly
// - useFormattedDaily
//
// Use the non-hook versions instead:
// - formatDateByLocale(date, locale, options)
// - formatChartPeriod(date, locale)
// - formatFullDateByLocale(date, locale)
// - formatDateTimeByLocale(date, locale)
// - formatMonthOnlyByLocale(date, locale)
// - formatDailyByLocale(date, locale)

// ============================================================================
// TIMEZONE UTILITIES
// ============================================================================

/**
 * Get local date key from UTC datetime string
 * Converts UTC database datetime to local date (YYYY-MM-DD)
 * 
 * ✅ FIX: Uses UTC date components to ensure consistency
 * Since orders are normalized to midnight UTC, we should use UTC components
 * to get the date key, not server timezone which may differ from user timezone
 * 
 * @param date - UTC datetime string or Date object from database
 * @returns Local date in YYYY-MM-DD format (based on UTC date components)
 * 
 * @example
 * // Database stores UTC: "2025-10-28T17:00:00Z" (normalized to "2025-10-28T00:00:00Z")
 * // This function returns: "2025-10-28" (using UTC date components)
 * getLocalDateKey("2025-10-28T00:00:00Z") // "2025-10-28"
 */
export function getLocalDateKey(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    // ✅ FIX: Use UTC date components instead of server timezone
    // This ensures consistency regardless of server timezone
    // Since dates are normalized to midnight UTC, UTC components give the correct date
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Get local date from UTC datetime string
 * Useful when database stores UTC but UI needs to display in local time
 * 
 * @param date - UTC datetime string or Date object
 * @returns Date object in local timezone
 */
export function getLocalDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return isValid(dateObj) ? dateObj : null;
  } catch {
    return null;
  }
}

/**
 * Get UTC date key from UTC datetime string
 * Converts UTC datetime to UTC date (YYYY/MM/DD)
 * This preserves the original UTC date without timezone conversion
 * 
 * @param date - UTC datetime string or Date object from database
 * @returns UTC date in YYYY/MM/DD format
 * 
 * @example
 * // Database stores UTC: "2025-10-27T17:00:00Z"
 * // This function returns: "2025/10/27" (no timezone conversion)
 * getUTCDateKey("2025-10-27T17:00:00Z") // "2025/10/27"
 */
export function getUTCDateKey(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    // Use UTC date components (getUTCFullYear, getUTCMonth, getUTCDate)
    // These return the UTC date without timezone conversion
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    
    return `${year}/${month}/${day}`;
  } catch {
    return '';
  }
}

// ============================================================================
// API DATE NORMALIZATION UTILITIES (for consistent API responses)
// ============================================================================

/**
 * Normalize a date to midnight UTC and return as Date object
 * Useful for date comparisons and filtering in API routes
 * 
 * @param date - Date object or date string
 * @returns Date object at midnight UTC (e.g., Date("2025-11-29T00:00:00.000Z"))
 * 
 * @example
 * normalizeDateToMidnightUTC(new Date("2025-11-29T09:37:02.976Z")) // Date("2025-11-29T00:00:00.000Z")
 * normalizeDateToMidnightUTC("2025-11-29T17:00:00.000Z") // Date("2025-11-29T00:00:00.000Z")
 */
export function normalizeDateToMidnightUTC(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return null;
    
    // Extract UTC date components and normalize to midnight UTC
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();
    const day = dateObj.getUTCDate();
    
    // Create new Date object at midnight UTC
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  } catch {
    return null;
  }
}

/**
 * Normalize a date to midnight UTC and return as ISO string
 * Useful for API responses where you want consistent date format for mobile locale formatting
 * 
 * @param date - Date object or date string
 * @returns ISO string at midnight UTC (e.g., "2025-11-29T00:00:00.000Z")
 * 
 * @example
 * normalizeDateToISO(new Date("2025-11-29T09:37:02.976Z")) // "2025-11-29T00:00:00.000Z"
 * normalizeDateToISO("2025/11/29") // "2025-11-29T00:00:00.000Z"
 */
export function normalizeDateToISO(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const normalized = normalizeDateToMidnightUTC(date);
  return normalized ? normalized.toISOString() : '';
}

/**
 * Convert local date string (YYYY-MM-DD) to UTC datetime string matching mobile app format
 * 
 * Single Source of Truth: This function ensures consistent date format between frontend and mobile app
 * Mobile app sends: "2026-02-24T17:00:00.000Z" (17:00 UTC = 00:00 local in VN UTC+7)
 * Frontend should match this format to avoid timezone shift issues
 * 
 * @param dateStr - Local date string in YYYY-MM-DD format
 * @returns UTC datetime string in ISO format (e.g., "2026-02-24T17:00:00.000Z")
 * 
 * @example
 * convertLocalDateToUTCDatetime("2026-02-24") // "2026-02-24T17:00:00.000Z"
 * convertLocalDateToUTCDatetime("2026-02-26") // "2026-02-26T17:00:00.000Z"
 */
export function convertLocalDateToUTCDatetime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  try {
    // Parse as local date (YYYY-MM-DD)
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
    if (month < 1 || month > 12) return '';
    if (day < 1 || day > 31) return '';
    
    // Create UTC datetime at 17:00 UTC (equivalent to 00:00 local in VN UTC+7)
    // This matches mobile app's format to ensure consistency
    const utcDate = new Date(Date.UTC(year, month - 1, day, 17, 0, 0, 0));
    
    if (isNaN(utcDate.getTime())) return '';
    
    return utcDate.toISOString();
  } catch {
    return '';
  }
}
