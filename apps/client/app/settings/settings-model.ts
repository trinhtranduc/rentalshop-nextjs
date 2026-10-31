/**
 * Cài đặt cửa hàng model (#528, board Cai-dat). Pure, no @rentalshop/* imports, so Jest loads it.
 * Tab ids are the old `?tab=` values so existing links keep working.
 */

export type SettingsTab =
  | 'merchant'
  | 'outlet'
  | 'public-page'
  | 'payment'
  | 'receipt'
  | 'subscription'
  | 'profile'
  | 'language';

/** Nav group headers (#1259): Cửa hàng · Tài khoản. */
export type SettingsGroup = 'shop' | 'account';

export interface SettingsTabDef {
  id: SettingsTab;
  group: SettingsGroup;
  /** Roles that see the tab; undefined = every role. Same rules as the old Settings menu. */
  roles?: string[];
}

export const SETTINGS_TABS: SettingsTabDef[] = [
  { id: 'merchant', group: 'shop', roles: ['MERCHANT'] },
  { id: 'outlet', group: 'shop', roles: ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'] },
  /** #1140: Mã URL + public page / referral links, moved out of Thông tin cửa hàng */
  { id: 'public-page', group: 'shop', roles: ['MERCHANT'] },
  /**
   * #1259 "Thu tiền": bank accounts (#852, per branch for the owner) + "Cách thu cọc" (#1199, owner only), one tab.
   * The tab is open to the outlet admin for the bank accounts; the deposit part stays owner only.
   */
  { id: 'payment', group: 'shop', roles: ['MERCHANT', 'OUTLET_ADMIN'] },
  /** "In & phiếu" (#626): paper sizes and previews for every role; the printed note stays owner / outlet admin only. */
  { id: 'receipt', group: 'shop' },
  { id: 'subscription', group: 'account', roles: ['MERCHANT'] },
  /** "Hồ sơ & bảo mật" (#1259): profile, then change password, logout, delete account */
  { id: 'profile', group: 'account' },
  /** Ngôn ngữ & giao diện (#1140 merged the old `appearance` tab in) */
  { id: 'language', group: 'account' },
];

export const SETTINGS_GROUPS: SettingsGroup[] = ['shop', 'account'];

/**
 * Old keys that now open another tab. `printer` (#623) → In & phiếu (#626); `appearance` → Ngôn ngữ & giao diện (#1140);
 * `bank-accounts` → Thu tiền and `account` → Hồ sơ & bảo mật (#1259).
 */
const TAB_ALIASES: Record<string, SettingsTab> = { printer: 'receipt', appearance: 'language', 'bank-accounts': 'payment', account: 'profile' };

/** Visible tabs for a role. Giao diện lives inside `language`, so the theme kill switch hides no tab. */
export function tabsForRole(role?: string | null): SettingsTabDef[] {
  const r = String(role || '').toUpperCase();
  return SETTINGS_TABS.filter((tab) => !tab.roles || tab.roles.includes(r));
}

/** Tabs per group header, in nav order, empty groups dropped. */
export function groupedTabs(tabs: SettingsTabDef[]): Array<{ group: SettingsGroup; tabs: SettingsTabDef[] }> {
  return SETTINGS_GROUPS.map((group) => ({ group, tabs: tabs.filter((t) => t.group === group) })).filter((g) => g.tabs.length > 0);
}

/** First screen: the shop for owners and outlet users (the board), otherwise "Hồ sơ & bảo mật". */
export function defaultTab(role?: string | null): SettingsTab {
  const r = String(role || '').toUpperCase();
  if (r === 'MERCHANT') return 'merchant';
  if (r === 'OUTLET_ADMIN' || r === 'OUTLET_STAFF' || r === 'OUTLET_INVENTORY') return 'outlet';
  return 'profile';
}

export type TabResolution = { tab: SettingsTab; redirect?: string };

/**
 * `?tab=` → the tab to show. `loyalty` moved to /loyalty; old keys map through `TAB_ALIASES`; a tab
 * the role may not open (e.g. anyone but the owner on `subscription`) falls back to the default.
 */
export function resolveTab(requested: string | null | undefined, role?: string | null): TabResolution {
  if (requested === 'loyalty') return { tab: defaultTab(role), redirect: '/loyalty' };
  if (requested && TAB_ALIASES[requested]) requested = TAB_ALIASES[requested];
  const allowed = tabsForRole(role);
  const hit = allowed.find((t) => t.id === requested);
  return { tab: hit ? hit.id : defaultTab(role) };
}

/** #1140: `?settings=` with no tab is the section list on a phone (desktop shows the default tab). */
export function isSettingsList(requested: string | null | undefined): boolean {
  return requested === '';
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

/**
 * #1138 "Nhận đặt online": the login payload has no `onlineBookingEnabled`, only
 * GET /api/users/profile does. A missing key is unknown (load the profile), never OFF.
 */
export function onlineBookingFlag(merchant: { onlineBookingEnabled?: unknown } | null | undefined): boolean | null {
  const v = merchant?.onlineBookingEnabled;
  return typeof v === 'boolean' ? v : null;
}

/**
 * #1174 "Hiện giá trên trang shop": login has no `showPublicPrice`, only GET /api/users/profile does.
 * A missing key is unknown (load the profile). After load, missing still means ON (default true).
 */
export function showPublicPriceFlag(merchant: { showPublicPrice?: unknown } | null | undefined): boolean | null {
  const v = merchant?.showPublicPrice;
  return typeof v === 'boolean' ? v : null;
}

/**
 * #1189 "Với app cũ" (day-block prices): login has no `blockPricing`, only GET /api/users/profile does (#1138).
 * A missing key is unknown (load the profile), never a choice; any value but 'block' is 'recompute'.
 */
export function blockOldAppsFlag(merchant: { blockPricing?: { oldApps?: unknown } | null } | null | undefined): 'recompute' | 'block' | null {
  const bp = merchant?.blockPricing;
  if (!bp || typeof bp !== 'object') return null;
  return bp.oldApps === 'block' ? 'block' : 'recompute';
}

/**
 * #1314 "Cho tạo đơn khi trùng lịch" (#518): the stored value, or null when the merchant has no such key
 * (load the profile). Display it with `!== false`, as the order editor does.
 */
export function overlapFlag(merchant: { allowOverlappingOrders?: unknown } | null | undefined): boolean | null {
  const v = merchant?.allowOverlappingOrders;
  return typeof v === 'boolean' ? v : null;
}

/** #1314 only the owner changes the overlap switch (API: MERCHANT / ADMIN; the web card is the owner's). */
export function canChangeOverlap(role?: string | null): boolean {
  return String(role || '').toUpperCase() === 'MERCHANT';
}

/**
 * #1344 "Hiện ghi chú đơn trên ảnh chia sẻ": login has no `shareOrderNote`, only GET /api/users/profile does (every role).
 * A missing key is unknown (load the profile), never OFF; after the load the API always sends a boolean.
 */
export function shareOrderNoteFlag(merchant: { shareOrderNote?: unknown } | null | undefined): boolean | null {
  const v = merchant?.shareOrderNote;
  return typeof v === 'boolean' ? v : null;
}

/** #1344 only the owner changes the switch (API: MERCHANT only, every other role 403); the others see it dimmed. */
export function canChangeShareOrderNote(role?: string | null): boolean {
  return String(role || '').toUpperCase() === 'MERCHANT';
}

/** #1332 stub until the fix */
export function canEditPrintSettings(_role?: string | null): boolean {
  return true;
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

/** #852: branch of the bank-accounts / receipt tabs for an owner with several branches: `?settingsOutlet=<id>`. */
export const SETTINGS_OUTLET_PARAM = 'settingsOutlet';

/** Current page, dialog still open, on branch `outletId`. */
export function settingsOutletHref(pathname: string, search: string, outletId: number): string {
  const params = new URLSearchParams(search);
  params.set(SETTINGS_OUTLET_PARAM, String(outletId));
  return withQuery(pathname, params);
}

/** Branch to show: the URL's when it is one of the shop's, else the default branch, else the first; none without branches. */
export function settingsOutletChoice(options: Array<{ id: number; isDefault?: boolean }>, raw: string | null | undefined): number | null {
  const wanted = raw && /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
  if (wanted !== null && options.some((o) => o.id === wanted)) return wanted;
  return options.find((o) => o.isDefault)?.id ?? options[0]?.id ?? null;
}

/** Current page with the dialog closed. */
export function closeSettingsHref(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete(SETTINGS_PARAM);
  params.delete(SETTINGS_OUTLET_PARAM);
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

/** #1145 shop currency shown in "Tiền tệ": VND or USD; anything else is what CurrencyProvider shows (USD). */
export type ShopCurrency = 'VND' | 'USD';
export function shopCurrency(value: unknown): ShopCurrency {
  return String(value ?? '').trim().toUpperCase() === 'VND' ? 'VND' : 'USD';
}

/** #1145 only the owner changes the currency (the API answers 403 for every other role). */
export function canChangeCurrency(role?: string | null): boolean {
  return String(role || '').toUpperCase() === 'MERCHANT';
}

/** #1145 confirm example: the same amount in both currencies, nothing converted ("220.000 đ → $220,000.00"). */
export function currencyExample(from: ShopCurrency, to: ShopCurrency, format: (amount: number, currency: ShopCurrency) => string): string {
  return `${format(220000, from)} → ${format(220000, to)}`;
}

/** #1321 web reads the shop currency again at most this often (page load, tab back in front). */
export const SHOP_CURRENCY_REFRESH_MS = 60_000;

/**
 * #1321 Should the shop web read `GET /api/settings/currency` now? Pure: the caller passes the clock.
 * No for ADMIN / OPS or a user without a merchant (nothing to read); yes when never read, when a minute passed,
 * or when the clock went backwards.
 */
export function shouldRefreshShopCurrency(input: {
  now: number;
  role?: string | null;
  hasMerchant: boolean;
  lastRefreshAt?: number | null;
}): boolean {
  const role = String(input.role || '').toUpperCase();
  if (!role || role === 'ADMIN' || role === 'OPS' || !input.hasMerchant) return false;
  const last = input.lastRefreshAt;
  if (last == null || !Number.isFinite(last)) return true;
  const age = input.now - last;
  return age < 0 || age >= SHOP_CURRENCY_REFRESH_MS;
}
