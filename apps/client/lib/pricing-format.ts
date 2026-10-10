/**
 * #734 / #735 /pricing: number, price and comparison-row formatting with an EXPLICIT locale,
 * so the server render and the browser render give the same text (no hydration mismatch).
 */

const INTL_LOCALES: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
};

/** App locale (vi, en, ja, ko, zh) to a BCP 47 tag; unknown values fall back to vi-VN. */
export function pricingIntlLocale(locale: string): string {
  return INTL_LOCALES[locale] ?? INTL_LOCALES.vi;
}

/** 2000 -> "2.000" (vi), "2,000" (en). Always uses the given locale, never the runtime default. */
export function formatPricingCount(value: number, locale: string): string {
  return new Intl.NumberFormat(pricingIntlLocale(locale)).format(value);
}

/** A plan price in VND, formatted in the page language. */
export function formatPricingPrice(value: number, locale: string): string {
  return new Intl.NumberFormat(pricingIntlLocale(locale), {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
}

/** A plan limit: -1 means unlimited. */
export function formatPlanLimit(value: number, locale: string, unlimitedLabel: string): string {
  return value === -1 ? unlimitedLabel : formatPricingCount(value, locale);
}

/** Comparison cells come as "5,000" strings from the constants; re-format digits in the page language. */
export function formatComparisonValue(value: string, locale: string): string {
  return /^\d{1,3}(,\d{3})*$|^\d+$/.test(value)
    ? formatPricingCount(Number(value.replace(/,/g, '')), locale)
    : value;
}

/** Comparison row name (English, from constants) to its key under plans.pricingPage. */
export const COMPARISON_NAME_KEYS: Record<string, string> = {
  'Mobile App': 'mobileApp',
  'Web Dashboard': 'webDashboard',
  Products: 'products',
  Customers: 'customers',
  Users: 'users',
  Outlets: 'outlets',
  Orders: 'orders',
  'Product Public Check': 'publicCheckTitle',
  'Advanced Analytics': 'advancedAnalytics',
  'API Access': 'apiAccess',
  'Priority Support': 'prioritySupport',
  '24/7 Phone Support': 'phoneSupport',
};

const PLAN_KEYS: Record<string, string> = {
  trial: 'Trial',
  basic: 'Basic',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const BADGE_KEYS: Record<string, string> = {
  'Free Trial': 'badgeFreeTrial',
  'Most Popular': 'badgeMostPopular',
  Premium: 'badgePremium',
};

/** Keys under plans.pricingPage for a plan card: name, description, badge (null when unknown). */
export function planTextKeys(planId: string, badge?: string | null) {
  const suffix = PLAN_KEYS[planId];
  return {
    name: suffix ? `plan${suffix}` : null,
    description: suffix ? `desc${suffix}` : null,
    badge: badge ? BADGE_KEYS[badge] ?? null : null,
  };
}
