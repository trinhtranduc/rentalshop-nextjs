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
 * ⚠️ NOTE: This function uses LOCAL date components (getDate, getMonth, getFullYear)
 * which will convert UTC to local timezone. For date-only fields (pickupPlanAt, returnPlanAt),
 * use formatDateOnlyByLocale() instead to preserve UTC date without conversion.
 * 
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted date string (e.g., "28/11/2020" for vi, "Nov 28, 2020" for en)
 */
export function formatFullDateByLocale(date: string | Date, locale: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return date.toString();
  
  if (locale === 'vi') {
    // Vietnamese format: dd/mm/yyyy (e.g., "28/11/2020")
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString(); // Full 4-digit year
    
    return `${day}/${month}/${year}`;
  }
  
  // English format: MMM dd, yyyy (US standard, e.g., "Nov 28, 2020")
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dateObj.getMonth()];
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  
  return `${month} ${day}, ${year}`;
}

/**
 * Format date-only fields (pickupPlanAt, returnPlanAt) without timezone conversion
 * This function uses UTC date components to preserve the date as stored in database
 * 
 * Use case: For date-only fields that should display the exact UTC date without conversion
 * Example: "2026-02-10T00:00:00.000Z" → "10/02/2026" (vi) or "Feb 10, 2026" (en)
 *          "2026-02-10T17:00:00.000Z" → "10/02/2026" (vi) or "Feb 10, 2026" (en)
 * 
 * @param date - Date string or Date object (UTC datetime from database)
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted date string using UTC date components (no timezone conversion)
 */
export function formatDateOnlyByLocale(date: string | Date, locale: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return date.toString();
  
  if (locale === 'vi') {
    // Vietnamese format: dd/mm/yyyy (e.g., "10/02/2026")
    // Use UTC date components to preserve date without timezone conversion
    const day = dateObj.getUTCDate().toString().padStart(2, '0');
    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getUTCFullYear().toString(); // Full 4-digit year
    
    return `${day}/${month}/${year}`;
  }
  
  // English format: MMM dd, yyyy (US standard, e.g., "Feb 10, 2026")
  // Use UTC date components to preserve date without timezone conversion
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dateObj.getUTCMonth()];
  const day = dateObj.getUTCDate();
  const year = dateObj.getUTCFullYear();
  
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
 * @param date - UTC datetime string or Date object from database
 * @returns Local date in YYYY-MM-DD format
 * 
 * @example
 * // Database stores UTC: "2025-10-28T17:00:00Z"
 * // User in UTC+7 timezone sees it as: "2025-10-29T00:00:00+07:00"
 * // This function returns: "2025-10-29"
 * getLocalDateKey("2025-10-28T17:00:00Z") // "2025-10-29"
 */
export function getLocalDateKey(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    // Use local date components (getFullYear, getMonth, getDate)
    // These automatically convert UTC to local timezone
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
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
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    // Extract UTC date components and normalize to midnight UTC
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    // Use YYYY-MM-DD format for ISO string (standard format)
    const dateKeyISO = `${year}-${month}-${day}`;
    
    return new Date(dateKeyISO + 'T00:00:00.000Z').toISOString();
  } catch {
    return '';
  }
}

/**
 * Parse date string (YYYY-MM-DD) and normalize to midnight UTC
 * This function treats the date string as a pure date (no time component)
 * and stores it as midnight UTC without timezone conversion
 * 
 * Use case: For pickupPlanAt and returnPlanAt fields that only store dates
 * Future: Will support time component, but for now only date is stored
 * 
 * @param dateInput - Date string (YYYY-MM-DD or ISO string) or Date object
 * @returns Date object at midnight UTC (e.g., "2026-02-10T00:00:00.000Z")
 * 
 * @example
 * parseDateStringToUTC("2026-02-10") // Date object: "2026-02-10T00:00:00.000Z"
 * parseDateStringToUTC("2026-02-10T17:00:00.000Z") // Date object: "2026-02-10T00:00:00.000Z" (normalized)
 * parseDateStringToUTC(new Date("2026-02-10T17:00:00.000Z")) // Date object: "2026-02-10T00:00:00.000Z" (normalized)
 */
export function parseDateStringToUTC(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  
  try {
    // Handle Date object input (from z.coerce.date())
    if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) return null;
      // Normalize Date object to midnight UTC using UTC date components
      return new Date(Date.UTC(
        dateInput.getUTCFullYear(),
        dateInput.getUTCMonth(),
        dateInput.getUTCDate(),
        0, 0, 0, 0
      ));
    }
    
    // Handle string input
    const dateStr = String(dateInput);
    
    // Try to match YYYY-MM-DD format first
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      // Create UTC date at midnight (no timezone shift)
      return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0));
    }
    
    // If not YYYY-MM-DD format, parse as ISO string or other date format
    // Then normalize to midnight UTC using UTC date components
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return null;
    
    // Normalize to midnight UTC using UTC date components (preserves date without timezone shift)
    return new Date(Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
      0, 0, 0, 0
    ));
  } catch {
    return null;
  }
}

/**
 * Normalize a Date object to midnight UTC based on its UTC date components
 * This function preserves the date without timezone shift, useful for normalizing old orders
 * 
 * Use case: Normalize old orders' dates that may have time components or timezone shifts
 * This ensures consistent date handling for calendar filtering and display
 * 
 * @param date - Date object or date string
 * @returns Date object at midnight UTC based on UTC date components
 * 
 * @example
 * normalizeDateToMidnightUTC(new Date("2026-02-10T17:00:00.000Z")) // "2026-02-10T00:00:00.000Z"
 * normalizeDateToMidnightUTC("2026-02-10T17:00:00.000Z") // "2026-02-10T00:00:00.000Z"
 */
export function normalizeDateToMidnightUTC(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return null;
    
    // Extract UTC date components and normalize to midnight UTC
    // This preserves the date without timezone shift
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();
    const day = dateObj.getUTCDate();
    
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  } catch {
    return null;
  }
}
