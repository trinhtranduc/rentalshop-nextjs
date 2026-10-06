/**
 * Cài đặt → Gói dịch vụ (#557): plan, status tag, price, expiry, usage and history text.
 * Pure, no @rentalshop/* imports, so Jest loads it. Days are Vietnam civil days: the caller passes
 * `toKey` (instant → `YYYY-MM-DD` in Asia/Ho_Chi_Minh, `formatDateKeyInTimeZone` in the app).
 * Days left always come from the API (`daysRemaining`), never from the browser clock.
 */

export type T = (key: string, values?: Record<string, string | number>) => string;
/** ISO instant → Vietnam day key `YYYY-MM-DD`, or null when it does not parse. */
export type ToKey = (iso: string) => string | null;

/** The flat `GET /api/subscriptions/status` payload (fields this tab reads). */
export interface SubscriptionStatus {
  subscriptionId?: number | null;
  status?: string | null;
  dbStatus?: string | null;
  daysRemaining?: number | null;
  isExpiringSoon?: boolean | null;
  cancelAtPeriodEnd?: boolean | null;
  canceledAt?: string | null;
  currentPeriodEnd?: string | null;
  planName?: string | null;
  planPrice?: number | null;
  planCurrency?: string | null;
  billingAmount?: number | null;
  billingCurrency?: string | null;
  billingInterval?: string | null;
  billingIntervalCount?: number | null;
  limits?: Record<string, number | null | undefined> | null;
  usage?: Record<string, number | null | undefined> | null;
}

const up = (v: unknown) => String(v ?? '').toUpperCase();
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// ---------------------------------------------------------------- plan card

export type SubscriptionTag = 'expired' | 'paused' | 'cancelled' | 'pastDue' | 'expiring' | 'trial' | 'active';

/** First match wins: expired, paused, cancelled, past due, expiring soon, trial, active. */
export function subscriptionTag(s: SubscriptionStatus): SubscriptionTag {
  const db = up(s.dbStatus);
  if (up(s.status) === 'EXPIRED' || db === 'EXPIRED') return 'expired';
  if (db === 'PAUSED') return 'paused';
  if (db === 'CANCELLED' || db === 'CANCELED' || s.cancelAtPeriodEnd || s.canceledAt) return 'cancelled';
  if (db === 'PAST_DUE') return 'pastDue';
  if (s.isExpiringSoon) return 'expiring';
  if (db === 'TRIAL') return 'trial';
  return 'active';
}

export const isTrialPlan = (name?: string | null) => /^\s*(trial|dùng thử)\s*$/i.test(name || '');

/** "Trial" reads in the UI language; other plan names are names. */
export function planLabel(name: string | null | undefined, t: T): string {
  if (!name || !name.trim()) return t('subscription.noPlan');
  return isTrialPlan(name) ? t('subscription.trialPlan') : name.trim();
}

/** Money as the shop reads it: VND "199.000 ₫", others "$9.99". */
export function moneyText(amount: number, currency?: string | null): string {
  const cur = up(currency) || 'VND';
  try {
    return new Intl.NumberFormat(cur === 'VND' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: cur === 'VND' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${cur}`;
  }
}

/** "/tháng", "/3 tháng", "/năm" … ; empty when the interval is unknown. */
export function intervalText(interval: string | null | undefined, count: number | null | undefined, t: T): string {
  const i = String(interval || '').toLowerCase();
  const n = num(count) && count! > 0 ? count! : 1;
  const months = i === 'month' || i === 'monthly' ? n : i === 'quarter' || i === 'quarterly' ? 3 * n : i === 'semi_annual' ? 6 * n : null;
  if (months != null) return months === 1 ? t('subscription.perMonth') : t('subscription.perMonths', { count: months });
  if (i === 'year' || i === 'annual' || i === 'yearly') return n === 1 ? t('subscription.perYear') : t('subscription.perYears', { count: n });
  return '';
}

/** Price per interval: billing amount when set, else the plan price; 0 → "Miễn phí". */
export function priceText(s: SubscriptionStatus, t: T): string {
  const billing = num(s.billingAmount);
  const plan = num(s.planPrice);
  const [amount, currency] = billing && billing > 0 ? [billing, s.billingCurrency] : [plan, s.planCurrency];
  if (!amount || amount <= 0) return t('subscription.free');
  return `${moneyText(amount, currency)}${intervalText(s.billingInterval, s.billingIntervalCount, t)}`;
}

/** "T5 19/11/2026" from a day key; `weekdays` is Sunday-first (CN, T2 … T7). */
export function dayText(key: string | null | undefined, weekdays: string[]): string {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
  const [y, m, d] = key.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${weekdays[wd] ?? ''} ${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`.trim();
}

export interface ExpiryLine {
  /** "Hết hạn T5 19/11/2026", "Dùng thử đến …", "Đã hết hạn …", "Dùng đến …"; '' when no end date. */
  text: string;
  /** "còn 44 ngày" from the API; '' when not positive. */
  left: string;
}

export function expiryLine(s: SubscriptionStatus, tag: SubscriptionTag, toKey: ToKey, weekdays: string[], t: T): ExpiryLine {
  const key = s.currentPeriodEnd ? toKey(s.currentPeriodEnd) : null;
  const day = dayText(key, weekdays);
  const days = num(s.daysRemaining);
  const left = tag !== 'expired' && days != null && days > 0 ? t('subscription.daysLeft', { count: days }) : '';
  if (!day) return { text: '', left };
  const key2 =
    tag === 'expired' ? 'expiredOn' : tag === 'cancelled' ? 'usableUntil' : tag === 'trial' || (tag === 'expiring' && up(s.dbStatus) === 'TRIAL') ? 'trialUntil' : 'expiresOn';
  return { text: t(`subscription.${key2}`, { day }), left };
}

// ------------------------------------------------------------------- usage

export const USAGE_KEYS = ['outlets', 'users', 'products', 'customers', 'orders'] as const;
export type UsageKey = (typeof USAGE_KEYS)[number];

export interface UsageRow {
  key: UsageKey;
  /** null when the API does not count it (orders). */
  used: number | null;
  /** null = unlimited (-1). */
  limit: number | null;
  over: boolean;
  /** 0–100 bar fill; null = no bar. */
  pct: number | null;
}

/** Plan limits vs usage; a key with no limit at all is not shown. */
export function usageRows(limits: SubscriptionStatus['limits'], usage: SubscriptionStatus['usage']): UsageRow[] {
  const rows: UsageRow[] = [];
  for (const key of USAGE_KEYS) {
    const raw = num(limits?.[key]);
    if (raw == null) continue;
    const limit = raw < 0 ? null : raw;
    const used = num(usage?.[key]);
    const over = limit != null && used != null && used > limit;
    const pct = limit != null && used != null ? (limit === 0 ? (used > 0 ? 100 : 0) : Math.min(100, Math.round((used / limit) * 100))) : null;
    rows.push({ key, used, limit, over, pct });
  }
  return rows;
}

export function usageText(row: UsageRow, t: T, n: (v: number) => string): string {
  if (row.limit == null) return row.used != null ? t('subscription.usedUnlimited', { used: n(row.used) }) : t('subscription.unlimited');
  if (row.used == null) return t('subscription.upTo', { limit: n(row.limit) });
  return `${n(row.used)}/${n(row.limit)}`;
}

// ----------------------------------------------------------------- history

export interface ActivityLike {
  id?: number | string;
  type?: string | null;
  timestamp?: string | null;
  createdAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PaymentLike {
  id?: number | string;
  amount?: number | null;
  currency?: string | null;
  method?: string | null;
  type?: string | null;
  status?: string | null;
  createdAt?: string | null;
  processedAt?: string | null;
}

export type HistoryTone = 'up' | 'renew' | 'start' | 'stop' | 'pay' | 'other';

export interface HistoryItem {
  id: string;
  /** ms since epoch, for sorting */
  at: number;
  day: string;
  title: string;
  detail: string;
  tone: HistoryTone;
}

export interface HistoryCtx {
  t: T;
  toKey: ToKey;
  weekdays: string[];
  /** Fallback currency for activity amounts that do not carry one (the subscription's). */
  currency?: string | null;
}

/** Activity types that are not changes to the plan (emails), never listed. */
const HIDDEN_ACTIVITIES = new Set(['subscription_expiry_reminder_sent']);
/** Activity types that usually come with a payment a moment later. */
const PAID_ACTIVITIES = new Set([
  'subscription_extended',
  'subscription_plan_changed',
  'plan_changed',
  'manual_extension',
  'iap_initial_purchase',
  'iap_renewal',
  'stripe_checkout_completed',
]);
/** A payment this close to a paid activity is the same event. */
const SAME_EVENT_MS = 5 * 60 * 1000;

const METHODS = new Set(['STRIPE', 'LEMON_SQUEEZY', 'TRANSFER', 'MANUAL', 'CASH', 'CHECK', 'PAYPAL', 'IAP_APPLE', 'IAP_GOOGLE']);

const metaObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const metaStr = (m: Record<string, unknown>, k: string) => (typeof m[k] === 'string' && (m[k] as string).trim() ? (m[k] as string).trim() : '');
const instant = (iso?: string | null) => {
  const ms = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(ms) ? null : ms;
};

export function methodText(method: string | null | undefined, t: T): string {
  const m = up(method);
  return METHODS.has(m) ? t(`subscription.method.${m}`) : '';
}

function untilText(iso: string, ctx: HistoryCtx): string {
  const day = dayText(ctx.toKey(iso), ctx.weekdays);
  return day ? ctx.t('subscription.history.until', { day }) : '';
}

const joinDetail = (...parts: string[]) => parts.filter(Boolean).join(' · ');

/** One activity row; null when it is hidden or has no time. */
export function activityItem(a: ActivityLike, ctx: HistoryCtx): HistoryItem | null {
  const { t } = ctx;
  const type = String(a.type || '').toLowerCase();
  if (HIDDEN_ACTIVITIES.has(type)) return null;
  const iso = a.timestamp || a.createdAt || '';
  const at = instant(iso);
  if (at == null) return null;
  const m = metaObj(a.metadata);
  const plan = (name: string) => planLabel(name, t);
  const amount = num(m.amount) ?? num(m.price);
  const money = amount && amount > 0 ? moneyText(amount, metaStr(m, 'currency') || ctx.currency || null) : '';
  let title = '';
  let detail = '';
  let tone: HistoryTone = 'other';

  switch (type) {
    case 'subscription_created': {
      const name = metaStr(m, 'planName');
      const trial = up(m.status) === 'TRIAL' || isTrialPlan(name);
      title = trial ? t('subscription.history.trialStarted') : name ? t('subscription.history.started', { plan: plan(name) }) : t('subscription.history.startedPlain');
      detail = metaStr(m, 'currentPeriodEnd') ? untilText(metaStr(m, 'currentPeriodEnd'), ctx) : '';
      tone = 'start';
      break;
    }
    case 'subscription_plan_changed':
    case 'plan_changed': {
      const prev = metaObj(m.previousPlan);
      const next = metaObj(m.newPlan);
      const oldName = metaStr(m, 'oldPlanName') || metaStr(prev, 'name');
      const newName = metaStr(m, 'newPlanName') || metaStr(next, 'name');
      const oldAmount = num(prev.amount);
      const newAmount = num(next.amount);
      if (!newName) title = t('subscription.history.planChangedPlain');
      else if (isTrialPlan(oldName) || (oldAmount != null && newAmount != null && newAmount > oldAmount))
        title = t('subscription.history.upgraded', { plan: plan(newName) });
      else if (oldAmount != null && newAmount != null && newAmount < oldAmount) title = t('subscription.history.downgraded', { plan: plan(newName) });
      else title = t('subscription.history.planChanged', { plan: plan(newName) });
      detail = oldName && newName ? t('subscription.history.fromTo', { from: plan(oldName), to: plan(newName) }) : '';
      tone = 'up';
      break;
    }
    case 'subscription_extended': {
      const days = num(m.extensionDays);
      title = days && days > 0 ? t('subscription.history.extendedDays', { count: days }) : t('subscription.history.extendedPlain');
      detail = joinDetail(metaStr(m, 'newEndDate') ? untilText(metaStr(m, 'newEndDate'), ctx) : '', money, methodText(metaStr(m, 'method'), t));
      tone = 'renew';
      break;
    }
    case 'manual_extension': {
      const months = num(m.months);
      title = months && months > 0 ? t('subscription.history.extendedMonths', { count: months }) : t('subscription.history.extendedPlain');
      detail = metaStr(m, 'newEnd') ? untilText(metaStr(m, 'newEnd'), ctx) : '';
      tone = 'renew';
      break;
    }
    case 'iap_initial_purchase':
    case 'iap_renewal': {
      title = t(type === 'iap_renewal' ? 'subscription.history.appRenewed' : 'subscription.history.appPurchased');
      const store = up(m.store);
      const storeText = store === 'APP_STORE' ? t('subscription.method.IAP_APPLE') : store === 'PLAY_STORE' ? t('subscription.method.IAP_GOOGLE') : '';
      detail = joinDetail(metaStr(m, 'expiresAt') ? untilText(metaStr(m, 'expiresAt'), ctx) : '', money, storeText);
      tone = type === 'iap_renewal' ? 'renew' : 'start';
      break;
    }
    case 'stripe_checkout_completed':
      title = t('subscription.history.checkout');
      tone = 'pay';
      break;
    case 'subscription_cancelled':
      title = t('subscription.history.cancelled');
      tone = 'stop';
      break;
    case 'subscription_paused':
      title = t('subscription.history.paused');
      tone = 'stop';
      break;
    case 'subscription_resumed':
      title = t('subscription.history.resumed');
      tone = 'renew';
      break;
    default:
      title = t('subscription.history.updated');
  }

  return { id: `a-${a.id ?? at}`, at, day: dayText(ctx.toKey(iso), ctx.weekdays), title, detail, tone };
}

/** One payment row; null for amount 0 (seed / trial rows carry nothing) or no time. */
export function paymentItem(p: PaymentLike, ctx: HistoryCtx): HistoryItem | null {
  const { t } = ctx;
  const amount = num(p.amount);
  if (!amount || amount <= 0) return null;
  const iso = p.processedAt || p.createdAt || '';
  const at = instant(iso);
  if (at == null) return null;
  const type = up(p.type);
  const title = t(`subscription.history.payment.${['PLAN_CHANGE', 'PLAN_EXTENSION'].includes(type) ? type : 'SUBSCRIPTION_PAYMENT'}`);
  const status = up(p.status);
  const statusText = ['PENDING', 'FAILED', 'REFUNDED', 'CANCELLED'].includes(status) ? t(`subscription.history.paymentStatus.${status}`) : '';
  return {
    id: `p-${p.id ?? at}`,
    at,
    day: dayText(ctx.toKey(iso), ctx.weekdays),
    title,
    detail: joinDetail(moneyText(amount, p.currency), methodText(p.method, t), statusText),
    tone: 'pay',
  };
}

/**
 * Activities and payments, newest first. A completed payment within a few minutes of a paid
 * activity (extension, plan change, app purchase, checkout) is the same event: it is folded into
 * that activity's row (amount + method added when the activity does not show an amount yet).
 */
export function historyItems(activities: ActivityLike[] | null | undefined, payments: PaymentLike[] | null | undefined, ctx: HistoryCtx): HistoryItem[] {
  const acts: Array<{ item: HistoryItem; type: string; hasMoney: boolean; matched: boolean }> = [];
  for (const a of activities || []) {
    const item = activityItem(a, ctx);
    if (!item) continue;
    const m = metaObj(a.metadata);
    const amount = num(m.amount) ?? num(m.price);
    acts.push({ item, type: String(a.type || '').toLowerCase(), hasMoney: Boolean(amount && amount > 0), matched: false });
  }
  const rows = acts.map((x) => x.item);
  for (const p of payments || []) {
    const item = paymentItem(p, ctx);
    if (!item) continue;
    const completed = !p.status || up(p.status) === 'COMPLETED';
    const host = completed
      ? acts.find((x) => !x.matched && PAID_ACTIVITIES.has(x.type) && Math.abs(x.item.at - item.at) <= SAME_EVENT_MS)
      : undefined;
    if (!host) {
      rows.push(item);
      continue;
    }
    host.matched = true;
    if (!host.hasMoney) {
      host.hasMoney = true;
      host.item.detail = joinDetail(host.item.detail, moneyText(num(p.amount)!, p.currency), methodText(p.method, ctx.t));
    }
  }
  return rows.sort((a, b) => b.at - a.at);
}
