/**
 * Modern subscription utilities for clean date handling and display
 */

export interface SubscriptionPeriod {
  startDate: Date;
  endDate: Date;
  duration: string;
  isActive: boolean;
  daysRemaining: number;
  nextBillingDate: Date;
  isTrial?: boolean;
}

/**
 * Format subscription period for display
 * @param period - Subscription period object
 * @returns Formatted period information
 */
export const formatSubscriptionPeriod = (period: SubscriptionPeriod) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const formatTimeRemaining = (days: number) => {
    if (days <= 0) return 'Expired';
    if (days === 1) return '1 day left';
    if (days < 7) return `${days} days left`;
    if (days < 30) return `${Math.ceil(days / 7)} weeks left`;
    return `${Math.ceil(days / 30)} months left`;
  };

  return {
    period: `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`,
    timeRemaining: formatTimeRemaining(period.daysRemaining),
    nextBilling: formatDate(period.nextBillingDate),
    status: period.isActive ? 'Active' : 'Inactive',
    isTrial: period.isTrial || false
  };
};

/**
 * Calculate subscription period from dates
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @param status - Subscription status
 * @param interval - Billing interval
 * @returns Subscription period object
 */
export const calculateSubscriptionPeriod = (
  startDate: Date,
  endDate: Date,
  status: string,
  interval: string = 'month'
): SubscriptionPeriod => {
  const now = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    startDate,
    endDate,
    duration: interval,
    isActive: status === 'active',
    daysRemaining: Math.max(0, daysRemaining),
    nextBillingDate: endDate,
    isTrial: status === 'trial'
  };
};

/**
 * Get subscription status badge info
 * @param status - Subscription status
 * @param daysRemaining - Days remaining in period
 * @returns Badge configuration
 */
export const getSubscriptionStatusBadge = (status: string, daysRemaining: number) => {
  if (status === 'trial') {
    return {
      text: 'Trial',
      color: 'bg-blue-100 text-blue-800',
      icon: 'clock'
    };
  }
  
  if (status === 'active') {
    if (daysRemaining <= 7) {
      return {
        text: 'Expires Soon',
        color: 'bg-orange-100 text-orange-800',
        icon: 'alert-triangle'
      };
    }
    return {
      text: 'Active',
      color: 'bg-green-100 text-green-800',
      icon: 'check-circle'
    };
  }
  
  if (status === 'paused') {
    return {
      text: 'Paused',
      color: 'bg-yellow-100 text-yellow-800',
      icon: 'pause'
    };
  }
  
  if (status === 'cancelled') {
    return {
      text: 'Cancelled',
      color: 'bg-red-100 text-red-800',
      icon: 'x-circle'
    };
  }
  
  return {
    text: 'Inactive',
    color: 'bg-gray-100 text-gray-800',
    icon: 'minus-circle'
  };
};
