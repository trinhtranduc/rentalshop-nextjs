/**
 * #557 shop web Cài đặt → Gói dịch vụ: status tag, price, expiry, usage and history text.
 * Day logic must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { formatDateKeyInTimeZone } from '../packages/utils/src/core/date-range';
import {
  activityItem,
  dayText,
  expiryLine,
  historyItems,
  intervalText,
  paymentItem,
  planLabel,
  priceText,
  subscriptionTag,
  usageRows,
  usageText,
  type HistoryCtx,
  type SubscriptionStatus,
} from '../apps/client/app/settings/subscription-model';

const vi = JSON.parse(fs.readFileSync(path.join(__dirname, '../locales/vi/settings.json'), 'utf8')).web;

/** next-intl-like lookup on the real Vietnamese strings, so a missing key fails the test. */
const t = (key: string, values?: Record<string, string | number>) => {
  const raw = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], vi);
  if (typeof raw !== 'string') throw new Error(`missing key ${key}`);
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(values?.[k] ?? `{${k}}`));
};
const toKey = (iso: string) => formatDateKeyInTimeZone(new Date(iso), 'Asia/Ho_Chi_Minh');
const weekdays = vi.subscription.weekdays.split(',');
const ctx: HistoryCtx = { t, toKey, weekdays, currency: 'VND' };

/** The real seed payload of agent2.merchant (trial plan, over the outlet / staff limits). */
const trial: SubscriptionStatus = {
  subscriptionId: 1,
  status: 'ACTIVE',
  dbStatus: 'TRIAL',
  daysRemaining: 44,
  isExpiringSoon: false,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  currentPeriodEnd: '2026-11-19T14:14:37.735Z',
  planName: 'Trial',
  planPrice: 0,
  planCurrency: 'USD',
  billingAmount: 0,
  billingCurrency: 'USD',
  billingInterval: 'month',
  billingIntervalCount: 1,
  limits: { outlets: 1, users: 3, products: 500, customers: 2000, orders: 2000 },
  usage: { outlets: 2, users: 20, products: 30, customers: 34 },
};

const paid: SubscriptionStatus = {
  ...trial,
  dbStatus: 'ACTIVE',
  planName: 'Basic',
  planPrice: 199000,
  planCurrency: 'VND',
  billingAmount: 199000,
  billingCurrency: 'VND',
};

describe('subscriptionTag (spec 3)', () => {
  it('trial, active', () => {
    expect(subscriptionTag(trial)).toBe('trial');
    expect(subscriptionTag(paid)).toBe('active');
  });
  it('expired wins over everything', () => {
    expect(subscriptionTag({ ...paid, status: 'EXPIRED', cancelAtPeriodEnd: true, isExpiringSoon: true })).toBe('expired');
  });
  it('paused, cancelled, past due, expiring soon', () => {
    expect(subscriptionTag({ ...paid, dbStatus: 'PAUSED' })).toBe('paused');
    expect(subscriptionTag({ ...paid, dbStatus: 'CANCELLED' })).toBe('cancelled');
    expect(subscriptionTag({ ...paid, cancelAtPeriodEnd: true, isExpiringSoon: true })).toBe('cancelled');
    expect(subscriptionTag({ ...paid, canceledAt: '2026-10-01T00:00:00Z' })).toBe('cancelled');
    expect(subscriptionTag({ ...paid, dbStatus: 'PAST_DUE' })).toBe('pastDue');
    expect(subscriptionTag({ ...trial, isExpiringSoon: true })).toBe('expiring');
  });
});

describe('plan label and price (spec 2, 4)', () => {
  it('Trial reads Dùng thử; other names stay', () => {
    expect(planLabel('Trial', t)).toBe('Dùng thử');
    expect(planLabel('trial', t)).toBe('Dùng thử');
    expect(planLabel('Basic', t)).toBe('Basic');
    expect(planLabel('', t)).toBe('Chưa có gói');
  });
  it('0 is Miễn phí, not $0.00', () => {
    expect(priceText(trial, t)).toBe('Miễn phí');
  });
  it('billing amount per interval, plan price as fallback', () => {
    expect(priceText(paid, t)).toBe('199.000 ₫/tháng');
    expect(priceText({ ...paid, billingAmount: 0, planPrice: 9.99, planCurrency: 'USD' }, t)).toBe('$9.99/tháng');
    expect(priceText({ ...paid, billingInterval: 'year' }, t)).toBe('199.000 ₫/năm');
    expect(priceText({ ...paid, billingInterval: 'semi_annual' }, t)).toBe('199.000 ₫/6 tháng');
  });
  it('interval text', () => {
    expect(intervalText('month', 3, t)).toBe('/3 tháng');
    expect(intervalText('quarter', 1, t)).toBe('/3 tháng');
    expect(intervalText('annual', 1, t)).toBe('/năm');
    expect(intervalText('weird', 1, t)).toBe('');
  });
});

describe('expiry line (spec 5) — Vietnam civil day, days left from the API', () => {
  it('trial: Dùng thử đến T5 19/11/2026 · còn 44 ngày', () => {
    const line = expiryLine(trial, subscriptionTag(trial), toKey, weekdays, t);
    expect(line).toEqual({ text: 'Dùng thử đến T5 19/11/2026', left: 'còn 44 ngày' });
  });
  it('an end at 17:30 UTC is the next day in Vietnam', () => {
    const s = { ...paid, currentPeriodEnd: '2026-11-19T17:30:00.000Z' };
    expect(expiryLine(s, 'active', toKey, weekdays, t).text).toBe('Hết hạn T6 20/11/2026');
  });
  it('expired shows the day and no days left; cancelled says usable until', () => {
    const exp = { ...paid, status: 'EXPIRED', daysRemaining: null, currentPeriodEnd: '2026-10-01T03:00:00Z' };
    expect(expiryLine(exp, 'expired', toKey, weekdays, t)).toEqual({ text: 'Đã hết hạn T5 01/10/2026', left: '' });
    expect(expiryLine({ ...paid, cancelAtPeriodEnd: true }, 'cancelled', toKey, weekdays, t).text).toBe('Dùng được đến T5 19/11/2026');
  });
  it('uses daysRemaining as given (no browser clock)', () => {
    expect(expiryLine({ ...paid, daysRemaining: 3 }, 'expiring', toKey, weekdays, t).left).toBe('còn 3 ngày');
    expect(expiryLine({ ...paid, daysRemaining: 0 }, 'active', toKey, weekdays, t).left).toBe('');
  });
  it('dayText', () => {
    expect(dayText('2026-10-06', weekdays)).toBe('T3 06/10/2026');
    expect(dayText('bad', weekdays)).toBe('');
  });
});

describe('usage rows (spec 7)', () => {
  const n = (v: number) => new Intl.NumberFormat('vi-VN').format(v);
  const rows = usageRows(trial.limits, trial.usage);
  it('over the limit is flagged, bar capped at 100', () => {
    const outlets = rows.find((r) => r.key === 'outlets')!;
    expect(outlets).toMatchObject({ used: 2, limit: 1, over: true, pct: 100 });
    expect(usageText(outlets, t, n)).toBe('2/1');
    expect(rows.find((r) => r.key === 'products')).toMatchObject({ over: false, pct: 6 });
  });
  it('orders have no usage from the API → "Tối đa 2.000", no bar', () => {
    const orders = rows.find((r) => r.key === 'orders')!;
    expect(orders).toMatchObject({ used: null, pct: null, over: false });
    expect(usageText(orders, t, n)).toBe('Tối đa 2.000');
  });
  it('-1 is unlimited; missing limit hides the row', () => {
    const r = usageRows({ outlets: -1, users: 5 }, { outlets: 4, users: 2 });
    expect(r.map((x) => x.key)).toEqual(['outlets', 'users']);
    expect(usageText(r[0], t, n)).toBe('4 · không giới hạn');
    expect(r[0].pct).toBeNull();
  });
});

describe('history (spec 8–10)', () => {
  const at = (iso: string) => ({ timestamp: iso });
  it('maps every known activity type to Vietnamese, never the raw code', () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ['subscription_created', { planName: 'Trial', status: 'TRIAL' }, 'Bắt đầu dùng thử'],
      ['subscription_created', { planName: 'Basic', status: 'ACTIVE' }, 'Bắt đầu gói Basic'],
      ['subscription_plan_changed', { oldPlanName: 'Trial', newPlanName: 'Basic' }, 'Nâng cấp lên Basic'],
      ['subscription_plan_changed', { oldPlanName: 'Basic', newPlanName: 'Pro' }, 'Đổi sang gói Pro'],
      ['plan_changed', { previousPlan: { name: 'Pro', amount: 499000 }, newPlan: { name: 'Basic', amount: 199000 } }, 'Chuyển xuống Basic'],
      ['plan_changed', { previousPlan: { name: 'Basic', amount: 199000 }, newPlan: { name: 'Pro', amount: 499000 } }, 'Nâng cấp lên Pro'],
      ['subscription_extended', { extensionDays: 30 }, 'Gia hạn 30 ngày'],
      ['MANUAL_EXTENSION', { months: 3 }, 'Gia hạn 3 tháng'],
      ['IAP_INITIAL_PURCHASE', { store: 'APP_STORE' }, 'Mua gói trên ứng dụng'],
      ['IAP_RENEWAL', { store: 'PLAY_STORE' }, 'Gia hạn trên ứng dụng'],
      ['stripe_checkout_completed', {}, 'Thanh toán gói'],
      ['subscription_cancelled', {}, 'Huỷ gói'],
      ['subscription_paused', {}, 'Tạm dừng gói'],
      ['subscription_resumed', {}, 'Tiếp tục gói'],
      ['something_new_from_admin', {}, 'Cập nhật gói'],
    ];
    for (const [type, metadata, title] of cases) {
      const item = activityItem({ id: 1, type, metadata, ...at('2026-10-06T03:00:00Z') }, ctx)!;
      expect(item.title).toBe(title);
      expect(item.title).not.toContain('_');
    }
  });
  it('expiry reminder emails are not listed', () => {
    expect(activityItem({ type: 'subscription_expiry_reminder_sent', ...at('2026-10-06T03:00:00Z') }, ctx)).toBeNull();
  });
  it('detail lines: from → to, until day, amount and method', () => {
    expect(activityItem({ type: 'subscription_plan_changed', metadata: { oldPlanName: 'Trial', newPlanName: 'Basic' }, ...at('2026-10-06T03:00:00Z') }, ctx)!.detail).toBe('Dùng thử → Basic');
    const ext = activityItem(
      { type: 'subscription_extended', metadata: { extensionDays: 30, newEndDate: '2026-12-19T17:00:00Z', amount: 199000, method: 'TRANSFER' }, ...at('2026-11-19T03:00:00Z') },
      ctx,
    )!;
    expect(ext.detail).toBe('đến CN 20/12/2026 · 199.000 ₫ · Chuyển khoản');
  });
  it('the row day is the Vietnam civil day of the instant', () => {
    expect(activityItem({ type: 'subscription_cancelled', ...at('2026-10-05T18:30:00Z') }, ctx)!.day).toBe('T3 06/10/2026');
  });
  it('payments: zero hidden, title by type, status shown when not completed', () => {
    expect(paymentItem({ id: 1, amount: 0, currency: 'USD', method: 'STRIPE', type: 'SUBSCRIPTION_PAYMENT', status: 'COMPLETED', createdAt: '2026-10-06T14:14:37Z' }, ctx)).toBeNull();
    const p = paymentItem({ id: 2, amount: 597000, currency: 'VND', method: 'TRANSFER', type: 'PLAN_EXTENSION', status: 'PENDING', createdAt: '2026-10-06T03:00:00Z' }, ctx)!;
    expect(p.title).toBe('Thanh toán gia hạn');
    expect(p.detail).toBe('597.000 ₫ · Chuyển khoản · Đang chờ');
  });
  it('merges newest first and folds a payment into its activity', () => {
    const items = historyItems(
      [
        { id: 1, type: 'subscription_created', metadata: { planName: 'Trial', status: 'TRIAL' }, timestamp: '2026-09-01T03:00:00Z' },
        { id: 2, type: 'subscription_plan_changed', metadata: { oldPlanName: 'Trial', newPlanName: 'Basic' }, timestamp: '2026-09-15T03:00:00Z' },
        { id: 3, type: 'subscription_expiry_reminder_sent', timestamp: '2026-10-10T03:00:00Z' },
      ],
      [
        { id: 7, amount: 199000, currency: 'VND', method: 'TRANSFER', type: 'PLAN_CHANGE', status: 'COMPLETED', createdAt: '2026-09-15T03:01:00Z' },
        { id: 8, amount: 199000, currency: 'VND', method: 'TRANSFER', type: 'SUBSCRIPTION_PAYMENT', status: 'COMPLETED', createdAt: '2026-10-15T03:00:00Z' },
        { id: 9, amount: 0, currency: 'USD', method: 'STRIPE', type: 'SUBSCRIPTION_PAYMENT', status: 'COMPLETED', createdAt: '2026-09-01T03:00:00Z' },
      ],
      ctx,
    );
    expect(items.map((i) => i.title)).toEqual(['Thanh toán gói', 'Nâng cấp lên Basic', 'Bắt đầu dùng thử']);
    expect(items[1].detail).toBe('Dùng thử → Basic · 199.000 ₫ · Chuyển khoản');
  });
  it('empty input gives an empty list', () => {
    expect(historyItems([], [], ctx)).toEqual([]);
    expect(historyItems(null, undefined, ctx)).toEqual([]);
  });
});
