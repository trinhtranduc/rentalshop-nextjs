// ============================================================================
// DATE RANGE VALIDATION UTILITIES
// ============================================================================

/**
 * Date range period options
 */
export type DateRangePeriod = '1month' | '3months' | '6months' | '1year' | 'custom';

/**
 * Date range period configuration
 */
export const DATE_RANGE_PERIODS: Record<DateRangePeriod, { days: number; label: string }> = {
  '1month': { days: 30, label: 'Last 30 Days' },
  '3months': { days: 90, label: 'Last 90 Days' },
  '6months': { days: 180, label: 'Last 180 Days' },
  '1year': { days: 365, label: 'Last 365 Days' },
  'custom': { days: 0, label: 'Custom Range' }
};

/**
 * Maximum allowed date range in days
 */
export const MAX_DATE_RANGE_DAYS = 365;

/**
 * Normalize start date to beginning of day (00:00:00.000)
 * Useful for date range filtering to ensure all records from the start date are included
 * 
 * @param date - Date object or date string
 * @returns Date object set to beginning of day (00:00:00.000)
 * 
 * @example
 * normalizeStartDate('2025-12-06') // 2025-12-06T00:00:00.000Z
 * normalizeStartDate(new Date('2025-12-06T15:30:00')) // 2025-12-06T00:00:00.000Z
 */
export function normalizeStartDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return null;
  
  const normalized = new Date(dateObj);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Normalize end date to end of day (23:59:59.999)
 * Useful for date range filtering to ensure all records from the end date are included
 * 
 * @param date - Date object or date string
 * @returns Date object set to end of day (23:59:59.999)
 * 
 * @example
 * normalizeEndDate('2025-12-06') // 2025-12-06T23:59:59.999Z
 * normalizeEndDate(new Date('2025-12-06T15:30:00')) // 2025-12-06T23:59:59.999Z
 */
export function normalizeEndDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return null;
  
  const normalized = new Date(dateObj);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

/**
 * Get date range from period option
 * 
 * @param period - Period option (1month, 3months, 6months, 1year)
 * @returns Object with startDate and endDate
 */
export function getDateRangeFromPeriod(period: DateRangePeriod): { startDate: Date; endDate: Date } {
  if (period === 'custom') {
    throw new Error('Custom period requires explicit startDate and endDate');
  }
  
  const config = DATE_RANGE_PERIODS[period];
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999); // End of today
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - config.days);
  startDate.setHours(0, 0, 0, 0); // Start of day
  
  return { startDate, endDate };
}

/**
 * Calculate days difference between two dates
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days
 */
export function calculateDaysDifference(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Validate date range
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @param maxDays - Maximum allowed days (default: MAX_DATE_RANGE_DAYS)
 * @returns Validation result with error message if invalid
 */
export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string,
  maxDays: number = MAX_DATE_RANGE_DAYS
): { valid: boolean; error?: string } {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  // Check if dates are valid
  if (isNaN(start.getTime())) {
    return { valid: false, error: 'Invalid start date' };
  }
  
  if (isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid end date' };
  }
  
  // Check if start date is before end date
  if (start > end) {
    return { valid: false, error: 'Start date must be before end date' };
  }
  
  // Check if end date is in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (end > today) {
    return { valid: false, error: 'End date cannot be in the future' };
  }
  
  // Check if range exceeds maximum days
  const daysDiff = calculateDaysDifference(start, end);
  if (daysDiff > maxDays) {
    return { 
      valid: false, 
      error: `Date range cannot exceed ${maxDays} days (${Math.ceil(maxDays / 30)} months)` 
    };
  }
  
  return { valid: true };
}

/**
 * Parse date range from query parameters
 * 
 * @param period - Period option
 * @param startDateParam - Start date string from query (optional)
 * @param endDateParam - End date string from query (optional)
 * @returns Object with startDate and endDate, or error
 */
export function parseDateRangeFromQuery(
  period: string | null,
  startDateParam: string | null,
  endDateParam: string | null
): { startDate: Date; endDate: Date } | { error: string } {
  // If period is provided, use it
  if (period && period !== 'custom' && period in DATE_RANGE_PERIODS) {
    return getDateRangeFromPeriod(period as DateRangePeriod);
  }
  
  // If custom period, require both startDate and endDate
  if (period === 'custom' || (!period && (startDateParam || endDateParam))) {
    if (!startDateParam || !endDateParam) {
      return { error: 'Both startDate and endDate are required for custom range' };
    }
    
    const startDate = normalizeStartDate(startDateParam);
    const endDate = normalizeEndDate(endDateParam);
    
    if (!startDate || !endDate) {
      return { error: 'Invalid date format' };
    }
    
    // Validate date range
    const validation = validateDateRange(startDate, endDate);
    if (!validation.valid) {
      return { error: validation.error || 'Invalid date range' };
    }
    
    return { startDate, endDate };
  }
  
  // Default: last 30 days
  return getDateRangeFromPeriod('1month');
}

