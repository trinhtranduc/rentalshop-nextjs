import { format, addDays, differenceInDays, isAfter, isBefore, isValid, parseISO } from 'date-fns';

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