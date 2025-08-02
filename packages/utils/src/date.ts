import { format, addDays, differenceInDays, isAfter, isBefore } from 'date-fns';

export const formatDate = (date: Date, formatString: string = 'dd/MM/yyyy'): string => {
  return format(date, formatString);
};

export const formatDateTime = (date: Date): string => {
  return format(date, 'dd/MM/yyyy HH:mm');
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