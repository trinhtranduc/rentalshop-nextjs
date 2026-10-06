/**
 * Cài đặt cửa hàng model (#528, board Cai-dat). Pure, no @rentalshop/* imports, so Jest loads it.
 * Tab ids are the old `?tab=` values so existing links keep working.
 */

export type SettingsTab =
  | 'merchant'
  | 'outlet'
  | 'bank-accounts'
  | 'receipt'
  | 'subscription'
  | 'profile'
  | 'account'
  | 'language';

export interface SettingsTabDef {
  id: SettingsTab;
  group: 'shop' | 'me';
  /** Roles that see the tab; undefined = every role. Same rules as the old Settings menu. */
  roles?: string[];
}

export const SETTINGS_TABS: SettingsTabDef[] = [
  { id: 'merchant', group: 'shop', roles: ['MERCHANT'] },
  { id: 'outlet', group: 'shop', roles: ['OUTLET_ADMIN', 'OUTLET_STAFF'] },
  { id: 'bank-accounts', group: 'shop', roles: ['OUTLET_ADMIN'] },
  { id: 'receipt', group: 'shop', roles: ['MERCHANT', 'OUTLET_ADMIN'] },
  { id: 'subscription', group: 'shop', roles: ['MERCHANT'] },
  { id: 'profile', group: 'me' },
  { id: 'account', group: 'me' },
  { id: 'language', group: 'me' },
];

export function tabsForRole(role?: string | null): SettingsTabDef[] {
  const r = String(role || '').toUpperCase();
  return SETTINGS_TABS.filter((tab) => !tab.roles || tab.roles.includes(r));
}

/** First screen: the shop for owners and outlet users (the board), otherwise "Tài khoản của tôi". */
export function defaultTab(role?: string | null): SettingsTab {
  const r = String(role || '').toUpperCase();
  if (r === 'MERCHANT') return 'merchant';
  if (r === 'OUTLET_ADMIN' || r === 'OUTLET_STAFF') return 'outlet';
  return 'profile';
}

export type TabResolution = { tab: SettingsTab; redirect?: string };

/**
 * `?tab=` → the tab to show. `loyalty` moved to /loyalty; a tab the role may not open (e.g.
 * staff on `receipt`, anyone but the owner on `subscription`) falls back to the default.
 */
export function resolveTab(requested: string | null | undefined, role?: string | null): TabResolution {
  if (requested === 'loyalty') return { tab: defaultTab(role), redirect: '/loyalty' };
  const allowed = tabsForRole(role);
  const hit = allowed.find((t) => t.id === requested);
  return { tab: hit ? hit.id : defaultTab(role) };
}

export interface AddressLike {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

/** "12 Lê Lợi, Quận 1, TP. Hồ Chí Minh" — empty parts and repeats skipped. */
export function addressLine(a: AddressLike | null | undefined): string {
  if (!a) return '';
  const parts: string[] = [];
  for (const p of [a.address, a.state, a.city]) {
    const v = (p || '').trim();
    if (v && !parts.includes(v)) parts.push(v);
  }
  return parts.join(', ');
}

export type PasswordProblem = 'currentRequired' | 'mismatch' | 'tooShort' | null;

/** Same checks, same order as the old Settings change-password form. */
export function passwordProblem(p: { currentPassword: string; newPassword: string; confirmPassword: string }): PasswordProblem {
  if (!p.currentPassword) return 'currentRequired';
  if (p.newPassword !== p.confirmPassword) return 'mismatch';
  if (p.newPassword.length < 6) return 'tooShort';
  return null;
}

/** Store URL key: lowercase letters, digits and hyphens (old field pattern). Empty is allowed. */
export function tenantKeyValid(value: string): boolean {
  return value === '' || /^[a-z0-9-]+$/.test(value);
}

/** The old merchant tab switched the shop currency to the UI language (vi → VND, else USD). */
export function currencyForLocale(locale: string): 'VND' | 'USD' {
  return locale === 'vi' ? 'VND' : 'USD';
}

/** Public product page and referral sign-up link, from the login payload or the tenant key. */
export function publicLinks(
  origin: string,
  opts: { publicProductLink?: string | null; tenantKey?: string | null; referralCode?: string | null },
): { productLink: string | null; registrationLink: string | null } {
  const key = (opts.tenantKey || '').trim();
  const productLink = (opts.publicProductLink || '').trim() || (key ? `${origin}/${key}/products` : null);
  const code = (opts.referralCode || '').trim() || key;
  return { productLink, registrationLink: code ? `${origin}/register?referralCode=${code}` : null };
}

/**
 * GET subscription status (flat) → the shape SubscriptionSection / the client subscription panel
 * read. Copied field for field from the old shared Settings component.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSubscriptionStatus(data: any) {
  return {
    hasSubscription: true,
    subscription: {
      id: data.subscriptionId,
      status: data.status,
      planName: data.planName,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      amount: data.billingAmount,
      currency: data.billingCurrency,
      interval: data.billingInterval,
      trialStart: data.trialStart,
      trialEnd: data.trialEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      canceledAt: data.canceledAt,
      cancelReason: data.cancelReason,
      plan: {
        id: data.planId,
        name: data.planName,
        description: data.planDescription,
        basePrice: data.planPrice,
        currency: data.planCurrency,
      },
    },
    status: data.status,
    statusReason: data.statusReason,
    isActive: data.status === 'ACTIVE',
    isExpired: data.status === 'EXPIRED',
    isTrial: data.status === 'TRIAL',
    isCanceled: data.status === 'CANCELED',
    hasAccess: data.hasAccess,
    isExpiringSoon: data.isExpiringSoon,
    daysRemaining: data.daysRemaining,
    merchant: { id: data.merchantId, name: data.merchantName, email: data.merchantEmail },
    limits: data.limits,
    usage: data.usage,
    features: data.features,
  };
}

// ---------------------------------------------------------------- dialog URL (#539)

/** Query key that opens the Cài đặt dialog on any shop page: `?settings=<tab>`. */
export const SETTINGS_PARAM = 'settings';

/** Params that only mean something while the dialog is open (subscription return / deep links). */
const DIALOG_ONLY_PARAMS = ['checkout', 'action'];

const withQuery = (pathname: string, params: URLSearchParams) => {
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
};

/**
 * Current page with the dialog open on `tab` (page params kept, `checkout` / `action` dropped once
 * read). Empty tab = the role's default.
 */
export function settingsHref(pathname: string, search: string, tab: string = ''): string {
  const params = new URLSearchParams(search);
  for (const key of DIALOG_ONLY_PARAMS) params.delete(key);
  params.set(SETTINGS_PARAM, tab);
  return withQuery(pathname, params);
}

/** Current page with the dialog closed. */
export function closeSettingsHref(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete(SETTINGS_PARAM);
  for (const key of DIALOG_ONLY_PARAMS) params.delete(key);
  return withQuery(pathname, params);
}

/** Old `/settings?tab=x&…` → `/dashboard?settings=x&…` (checkout / action kept for the subscription tab). */
export function legacySettingsRedirect(search: string): string {
  const params = new URLSearchParams(search);
  const tab = params.get('tab') || '';
  params.delete('tab');
  params.set(SETTINGS_PARAM, tab);
  return withQuery('/dashboard', params);
}
