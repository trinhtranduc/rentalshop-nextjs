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
  // #1114: the newer public locales of the localized pricing page
  ru: 'ru-RU',
  'zh-TW': 'zh-TW',
  fr: 'fr-FR',
  de: 'de-DE',
  th: 'th-TH',
  id: 'id-ID',
  es: 'es-ES',
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

// ---------------------------------------------------------------------------
// #1147: plan cards come from GET /api/plans/public, never from SUBSCRIPTION_PLANS.
// ---------------------------------------------------------------------------

export type PricingCardId = 'basic' | 'professional' | 'enterprise' | string;

export interface PricingCardLimits {
  products: number;
  customers: number;
  users: number;
  outlets: number;
  orders: number;
}

export interface PricingCard {
  id: PricingCardId;
  name: string;
  isPopular: boolean;
  /** Formatted amount, or null: no amount (non-vi locale #1121, a 0 / contact price, or no API data). */
  price: string | null;
  /** null when the API gave no plans: show no numbers rather than wrong ones. */
  limits: PricingCardLimits | null;
  /** Web dashboard access; null when unknown. */
  web: boolean | null;
}

/** The subset of a public API plan the pricing page reads. */
export interface PublicPlanLike {
  name: string;
  basePrice: number;
  isActive?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
  limits?: Partial<PricingCardLimits> & { allowWebAccess?: boolean };
  features?: unknown;
}

/** #1171: we do not sell API access; the comparison table must not show that row. */
export const HIDDEN_COMPARISON_ROWS = ['API Access'] as const;

export function visibleComparisonFeatures<T extends { name: string }>(features: T[]): T[] {
  return features.filter((row) => !(HIDDEN_COMPARISON_ROWS as readonly string[]).includes(row.name));
}

function featureNames(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (item && typeof item === 'object' && 'name' in item && typeof (item as { name: unknown }).name === 'string') {
      return [(item as { name: string }).name];
    }
    return [];
  });
}

function normalizeFeature(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * #1171: the pricing page shows web only when the plan’s features include it.
 * Production Basic has limits.allowWebAccess true and no web feature — that flag must not win.
 */
export function planHasWebDashboard(plan: Pick<PublicPlanLike, 'features'>): boolean {
  const names = featureNames(plan.features).map(normalizeFeature);
  return names.some(
    (n) => n.includes('webdashboard') || n === 'allprofessionalfeatures' || n.includes('allprofessional')
  );
}

const FALLBACK_IDS = ['basic', 'professional', 'enterprise'];
const FALLBACK_NAMES: Record<string, string> = { basic: 'Basic', professional: 'Professional', enterprise: 'Enterprise' };

/** API failure: the plan names only, no amount and no limits. */
export function fallbackPricingCards(): PricingCard[] {
  return FALLBACK_IDS.map((id) => ({
    id,
    name: FALLBACK_NAMES[id],
    isPopular: id === 'professional',
    price: null,
    limits: null,
    web: null,
  }));
}

const limitOf = (value: unknown): number => (typeof value === 'number' ? value : -1);

/**
 * Active public plans (no Trial) to pricing cards, in sortOrder. Only vi shows an amount, in VND (#1121);
 * a price of 0 (Enterprise) means "contact".
 */
export function buildPricingCards(plans: PublicPlanLike[] | null | undefined, locale: string): PricingCard[] {
  const visible = (Array.isArray(plans) ? plans : [])
    .filter((p) => p && p.isActive !== false && !(p.name || '').toLowerCase().includes('trial'))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  if (visible.length === 0) return fallbackPricingCards();

  return visible.map((p) => {
    const l = p.limits ?? {};
    return {
      id: (p.name || '').trim().toLowerCase(),
      name: p.name,
      isPopular: Boolean(p.isPopular),
      price: locale === 'vi' && p.basePrice > 0 ? formatPricingPrice(p.basePrice, locale) : null,
      limits: {
        products: limitOf(l.products),
        customers: limitOf(l.customers),
        users: limitOf(l.users),
        outlets: limitOf(l.outlets),
        orders: limitOf(l.orders),
      },
      web: planHasWebDashboard(p),
    };
  });
}
