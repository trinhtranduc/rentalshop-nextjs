// ============================================================================
// CLIENT-SIDE UTILITIES - React Components and Hooks Only
// ============================================================================
// This file exports React components and hooks that should only be used in client-side code
// DO NOT import this in server-side code (API routes, server components)

// UI utilities with React components
export * from './core/badge-utils';
export * from './core/customer-utils';
export * from './core/product-utils';
export * from './core/user-utils';

// Product image helpers (client-safe)
export { parseProductImages } from './utils/product-image-helpers';

// Date formatting hooks (require React context)
export * from './client-date-hooks';

// Subscription period formatting utilities (client-safe)
// These are pure functions that don't depend on server-only code
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
 */
export function formatSubscriptionPeriod(period: SubscriptionPeriod): string {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  if (period.isTrial) {
    return `Trial: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`;
  }

  return `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`;
}

/**
 * Get subscription status badge configuration
 */
export function getSubscriptionStatusBadge(status: string, daysRemaining: number): { color: string; text: string } {
  const statusConfig: Record<string, { color: string; text: string }> = {
    active: { color: 'bg-green-100 text-green-800', text: 'Active' },
    trial: { color: 'bg-blue-100 text-blue-800', text: 'Trial' },
    expired: { color: 'bg-red-100 text-red-800', text: 'Expired' },
    cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Cancelled' },
    grace: { color: 'bg-yellow-100 text-yellow-800', text: `Grace Period (${daysRemaining} days)` },
    renewing: { color: 'bg-blue-100 text-blue-800', text: 'Renewing' },
    suspended: { color: 'bg-orange-100 text-orange-800', text: 'Suspended' },
    past_due: { color: 'bg-yellow-100 text-yellow-800', text: 'Past Due' },
    paused: { color: 'bg-purple-100 text-purple-800', text: 'Paused' }
  };

  return statusConfig[status.toLowerCase()] || statusConfig.expired;
}
