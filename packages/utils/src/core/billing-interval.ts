import type { BillingInterval } from '@rentalshop/types';

/**
 * Normalize user/API input into our canonical BillingInterval.
 *
 * Canonical values used across the system:
 * - monthly
 * - quarterly
 * - semi_annual
 * - annual
 */
export function normalizeBillingInterval(input: unknown): BillingInterval {
  const raw = String(input ?? '').trim().toLowerCase();

  // monthly
  if (raw === 'month' || raw === 'monthly' || raw === '1m' || raw === '1month' || raw === '1_month') {
    return 'monthly';
  }

  // quarterly (3 months)
  if (
    raw === 'quarter' ||
    raw === 'quarterly' ||
    raw === '3m' ||
    raw === '3months' ||
    raw === '3_months'
  ) {
    return 'quarterly';
  }

  // semi-annual (6 months)
  if (
    raw === 'semi_annual' ||
    raw === 'semi-annual' ||
    raw === 'semiannual' ||
    raw === '6m' ||
    raw === '6months' ||
    raw === '6_months'
  ) {
    return 'semi_annual';
  }

  // annual (12 months)
  if (raw === 'annual' || raw === 'year' || raw === 'yearly' || raw === '12m' || raw === '12months') {
    return 'annual';
  }

  return 'monthly';
}

