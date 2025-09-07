/**
 * Billing Configuration
 * Centralized configuration for billing intervals and discounts
 */

export interface BillingInterval {
  id: string;
  name: string;
  months: number;
  discountPercentage: number;
  description: string;
  isActive: boolean;
}

export interface BillingConfig {
  intervals: BillingInterval[];
  defaultInterval: string;
  maxDiscountPercentage: number;
  minDiscountPercentage: number;
}

// Default billing configuration
export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  intervals: [
    {
      id: 'month',
      name: 'Monthly',
      months: 1,
      discountPercentage: 0,
      description: 'No discount for monthly billing',
      isActive: true
    },
    {
      id: 'quarter',
      name: 'Quarterly',
      months: 3,
      discountPercentage: 5,
      description: '5% discount for quarterly billing',
      isActive: true
    },
    {
      id: '6months',
      name: '6 Months',
      months: 6,
      discountPercentage: 10,
      description: '10% discount for 6-month billing',
      isActive: true
    },
    {
      id: 'year',
      name: 'Yearly',
      months: 12,
      discountPercentage: 20,
      description: '20% discount for yearly billing',
      isActive: true
    }
  ],
  defaultInterval: 'month',
  maxDiscountPercentage: 50,
  minDiscountPercentage: 0
};

// Helper functions
export const getBillingInterval = (id: string): BillingInterval | undefined => {
  return DEFAULT_BILLING_CONFIG.intervals.find(interval => interval.id === id);
};

export const getActiveBillingIntervals = (): BillingInterval[] => {
  return DEFAULT_BILLING_CONFIG.intervals.filter(interval => interval.isActive);
};

export const getDiscountPercentage = (intervalId: string): number => {
  const interval = getBillingInterval(intervalId);
  return interval?.discountPercentage || 0;
};

export const calculateDiscountedPrice = (
  basePrice: number,
  intervalId: string,
  duration: number = 1
): number => {
  const interval = getBillingInterval(intervalId);
  if (!interval) return basePrice * duration;
  
  const discount = interval.discountPercentage / 100;
  const discountedPrice = basePrice * (1 - discount);
  return discountedPrice * duration;
};

export const formatBillingInterval = (intervalId: string): string => {
  const interval = getBillingInterval(intervalId);
  if (!interval) return intervalId;
  
  const discount = interval.discountPercentage > 0 
    ? ` (${interval.discountPercentage}% discount)`
    : '';
  
  return `${interval.name}${discount}`;
};
