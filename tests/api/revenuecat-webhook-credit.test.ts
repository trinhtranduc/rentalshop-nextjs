/**
 * #1459 A13 (owner, 2026-11-03): a renewal always continues from the old end, never from today. The shop never loses the
 * days it has left, trial days included. Plan ends 05/11/2026, 12 months bought on 03/11/2026 → access to 05/11/2027.
 *
 * Model: the store bills its own dates; the shop keeps a constant credit on top of them.
 * - a purchase that starts a new store subscription stores `storeBonusMs = max(0, old end − purchased_at)`;
 * - every store date is `store expiration + storeBonusMs` (renewal, product change, extension, uncancel, grace, expiry);
 * - an upgrade in the same store keeps the credit (the store prorates its own days); from a manual plan it gets one;
 * - a refund goes back to the paid period's start + credit (the first purchase: the old end) or ends access now.
 * Must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));
jest.mock('@rentalshop/database', () => {
  const fake = require('./helpers/revenuecat-fake');
  return { db: { prisma: fake.fakePrisma }, prisma: fake.fakePrisma };
});
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/billing-dates'),
  handleApiError: () => ({ response: { success: false, code: 'INTERNAL_SERVER_ERROR' }, statusCode: 500 }),
}));

import { POST } from '../../apps/api/app/api/webhooks/revenuecat/route';
import { DAY, event, lastActivity, reset, send, store, sub } from './helpers/revenuecat-fake';

beforeEach(reset);

const HOUR = 3600000;
const YEAR = 365 * DAY;

/** Merchant 7 paid by hand (or by the trial) until `daysLeft` days from `now` */
function manualPlan(now: number, daysLeft: number, over: Record<string, unknown> = {}) {
  Object.assign(sub(), {
    billingChannel: 'MANUAL', storeProductId: null, storeOriginalTransactionId: null, autoRenew: false,
    currentPeriodStart: new Date(now - 30 * DAY), currentPeriodEnd: new Date(now + daysLeft * DAY), storeBonusMs: null,
    ...over,
  });
}

/** Merchant 7 on an auto-renewing App Store Basic plan: the store bills until `storeEnd`, the shop has `credit` more */
function storePlan(storeEnd: number, credit: number, over: Record<string, unknown> = {}) {
  Object.assign(sub(), {
    billingChannel: 'APP_STORE', storeProductId: 'anyrent_merchant_annual', storeOriginalTransactionId: 'otx-7', autoRenew: true,
    currentPeriodEnd: new Date(storeEnd + credit), storeBonusMs: credit || null,
    ...over,
  });
}

const endMs = () => sub().currentPeriodEnd.getTime();

describe('a purchase keeps the days left (A13 design 1)', () => {
  it('renewing 2 days early from a manual plan keeps the 2 days', async () => {
    const now = Date.now();
    manualPlan(now, 2);
    const exp = now + YEAR;
    const res = await send(POST, event('INITIAL_PURCHASE', { purchased_at_ms: now, expiration_at_ms: exp }));
    expect(res.status).toBe(200);
    expect(endMs()).toBe(exp + 2 * DAY);
    expect(sub()).toMatchObject({ storeBonusMs: 2 * DAY, billingChannel: 'APP_STORE', autoRenew: true, status: 'ACTIVE' });
  });

  it('owner example: plan ends 05/11/2026, 12 months bought 03/11/2026 → 05/11/2027', async () => {
    const purchased = Date.parse('2026-11-03T03:00:00.000Z');
    manualPlan(purchased, 0, { currentPeriodEnd: new Date('2026-11-05T16:59:59.999Z') });
    await send(POST, event('INITIAL_PURCHASE', { purchased_at_ms: purchased, expiration_at_ms: Date.parse('2027-11-03T03:00:00.000Z') }));
    expect(sub().currentPeriodEnd.toISOString()).toBe('2027-11-05T16:59:59.999Z');
    expect(lastActivity().description).toBe('Mua gói Basic 12 tháng qua App Store. Dùng đến 05/11/2027.');
  });

  it('trial days are kept', async () => {
    const now = Date.now();
    manualPlan(now, 10, { planId: 1, status: 'TRIAL', billingChannel: null, amount: 0 });
    const exp = now + YEAR;
    await send(POST, event('INITIAL_PURCHASE', { purchased_at_ms: now, expiration_at_ms: exp }));
    expect(endMs()).toBe(exp + 10 * DAY);
    expect(sub()).toMatchObject({ planId: 2, status: 'ACTIVE', storeBonusMs: 10 * DAY });
  });

  it('a plan bought on the other store (auto-renew off there) keeps its days', async () => {
    const now = Date.now();
    storePlan(now + 3 * DAY, 0, { autoRenew: false });
    const exp = now + YEAR;
    await send(POST, event('INITIAL_PURCHASE', { store: 'PLAY_STORE', purchased_at_ms: now, expiration_at_ms: exp, original_transaction_id: 'gpa-1' }));
    expect(endMs()).toBe(exp + 3 * DAY);
    expect(sub()).toMatchObject({ billingChannel: 'PLAY_STORE', storeBonusMs: 3 * DAY });
  });

  it('an expired plan starts at the purchase: no credit', async () => {
    const now = Date.now();
    manualPlan(now, -3, { status: 'EXPIRED' });
    const exp = now + YEAR;
    await send(POST, event('INITIAL_PURCHASE', { purchased_at_ms: now, expiration_at_ms: exp }));
    expect(endMs()).toBe(exp);
    expect(sub().storeBonusMs).toBeNull();
  });

  it('a sandbox purchase (dev API) keeps the days too', async () => {
    process.env.REVENUECAT_APP_USER_ID_PREFIX = 'dev_merchant_';
    const now = Date.now();
    manualPlan(now, 4);
    await send(POST, event('INITIAL_PURCHASE', { app_user_id: 'dev_merchant_7', environment: 'SANDBOX', purchased_at_ms: now, expiration_at_ms: now + 5 * 60000 }));
    expect(sub().storeBonusMs).toBe(4 * DAY);
    expect(endMs() - now).toBeGreaterThan(YEAR - 2 * DAY + 4 * DAY);
  });
});

describe('every store date keeps the same credit (A13 design 2)', () => {
  it('renewal, extension, same-tier change, cancel and uncancel keep store date + credit', async () => {
    const now = Date.now();
    manualPlan(now, 2);
    const exp = now + YEAR;
    await send(POST, event('INITIAL_PURCHASE', { purchased_at_ms: now, expiration_at_ms: exp }));

    await send(POST, event('RENEWAL', { purchased_at_ms: exp, expiration_at_ms: exp + YEAR }));
    expect(endMs()).toBe(exp + YEAR + 2 * DAY);
    expect(sub().storeBonusMs).toBe(2 * DAY);

    await send(POST, event('SUBSCRIPTION_EXTENDED', { expiration_at_ms: exp + YEAR + 7 * DAY }));
    expect(endMs()).toBe(exp + YEAR + 9 * DAY);

    await send(POST, event('PRODUCT_CHANGE', { new_product_id: 'anyrent_merchant_semi_annual' }));
    await send(POST, event('CANCELLATION', { cancel_reason: 'UNSUBSCRIBE', expiration_at_ms: exp + YEAR + 7 * DAY }));
    await send(POST, event('UNCANCELLATION', { expiration_at_ms: exp + YEAR + 7 * DAY }));
    expect(endMs()).toBe(exp + YEAR + 9 * DAY);
    expect(sub()).toMatchObject({ storeBonusMs: 2 * DAY, autoRenew: true });
  });

  it('store expiry with credit: EXPIRATION keeps access until store expiry + credit', async () => {
    const storeEnd = Date.now() - HOUR;
    storePlan(storeEnd, 2 * DAY);
    const res = await send(POST, event('EXPIRATION', { expiration_at_ms: storeEnd }));
    expect(res.body.status).toBe('ok_period_not_ended');
    expect(endMs()).toBe(storeEnd + 2 * DAY);
    expect(sub()).toMatchObject({ status: 'ACTIVE', autoRenew: false });
  });

  it('billing issue with the store grace: access to grace end + credit', async () => {
    const storeEnd = Date.now() + DAY;
    storePlan(storeEnd, 2 * DAY);
    await send(POST, event('BILLING_ISSUE', { expiration_at_ms: storeEnd, grace_period_expiration_at_ms: storeEnd + 16 * DAY }));
    expect(endMs()).toBe(storeEnd + 18 * DAY);
    expect(sub().status).toBe('ACTIVE');
    expect(lastActivity().description).toContain('App Store cho dùng thêm đến');
  });

  it('a renewal that comes after the billing retry keeps what is left of the credit', async () => {
    const storeEnd = Date.now() - DAY; // the store charged one day late; the shop used one credit day
    storePlan(storeEnd, 2 * DAY);
    const charged = storeEnd + DAY;
    await send(POST, event('RENEWAL', { purchased_at_ms: charged, expiration_at_ms: charged + YEAR }));
    expect(sub().storeBonusMs).toBe(DAY);
    expect(endMs()).toBe(storeEnd + 2 * DAY + YEAR);
  });

  it('a resubscribe after the plan ended carries no credit', async () => {
    const storeEnd = Date.now() - 10 * DAY;
    storePlan(storeEnd, 2 * DAY, { status: 'EXPIRED', autoRenew: false });
    const now = Date.now();
    await send(POST, event('RENEWAL', { purchased_at_ms: now, expiration_at_ms: now + YEAR }));
    expect(endMs()).toBe(now + YEAR);
    expect(sub().storeBonusMs).toBeNull();
  });
});

describe('upgrade (A13 design 3)', () => {
  it('from a manual Basic: the days left become credit on Professional', async () => {
    const now = Date.now();
    manualPlan(now, 40);
    const exp = now + YEAR;
    await send(POST, event('INITIAL_PURCHASE', { product_id: 'anyrent_professional_annual', purchased_at_ms: now, expiration_at_ms: exp }));
    expect(sub()).toMatchObject({ planId: 3, storeBonusMs: 40 * DAY });
    expect(endMs()).toBe(exp + 40 * DAY);
  });

  it('from a store Basic: the existing credit stays, the prorated store days are not added again', async () => {
    const now = Date.now();
    storePlan(now + 100 * DAY, 2 * DAY);
    await send(POST, event('PRODUCT_CHANGE', { new_product_id: 'anyrent_professional_annual' }));
    expect(endMs()).toBe(now + 102 * DAY);
    const exp = now + YEAR;
    await send(POST, event('RENEWAL', { product_id: 'anyrent_professional_annual', purchased_at_ms: now, expiration_at_ms: exp }));
    expect(sub()).toMatchObject({ planId: 3, storeBonusMs: 2 * DAY });
    expect(endMs()).toBe(exp + 2 * DAY);
  });

  it('from a store Basic bought as a new purchase in the same store: still only the existing credit', async () => {
    const now = Date.now();
    storePlan(now + 100 * DAY, 2 * DAY);
    const exp = now + YEAR;
    await send(POST, event('INITIAL_PURCHASE', { product_id: 'anyrent_professional_annual', purchased_at_ms: now, expiration_at_ms: exp }));
    expect(sub().storeBonusMs).toBe(2 * DAY);
    expect(endMs()).toBe(exp + 2 * DAY);
  });
});

describe('refund (A13 design 4, with A10)', () => {
  it('refund of the first store purchase gives back the old end', async () => {
    const now = Date.now();
    manualPlan(now, 20);
    const exp = now + YEAR;
    await send(POST, event('INITIAL_PURCHASE', { purchased_at_ms: now, expiration_at_ms: exp, transaction_id: 'tx-first' }));
    expect(store.payments[0].status).toBe('COMPLETED');

    await send(POST, event('CANCELLATION', { cancel_reason: 'CUSTOMER_SUPPORT', transaction_id: 'tx-first', expiration_at_ms: exp }));
    expect(endMs()).toBe(now + 20 * DAY);
    expect(sub()).toMatchObject({
      status: 'ACTIVE', autoRenew: false, billingChannel: 'MANUAL', storeProductId: null, storeBonusMs: null, cancelReason: 'REFUND',
    });
    expect(store.payments[0].status).toBe('REFUNDED');
    expect(lastActivity()).toMatchObject({ type: 'IAP_REFUND' });
    expect(lastActivity().description).toMatch(/^App Store đã hoàn tiền\. Shop dùng tiếp các ngày còn lại đến \d{2}\/\d{2}\/\d{4}\.$/);
  });

  it('refund of a later renewal cuts back to that period start + credit', async () => {
    const now = Date.now();
    const start = now - DAY;
    storePlan(start + YEAR, 2 * DAY, { currentPeriodStart: new Date(start) });
    await send(POST, event('CANCELLATION', { cancel_reason: 'CUSTOMER_SUPPORT', expiration_at_ms: start + YEAR }));
    expect(endMs()).toBe(start + 2 * DAY);
    expect(sub()).toMatchObject({ status: 'ACTIVE', autoRenew: false });
  });

  it('refund when that old end has passed: access ends now', async () => {
    const now = Date.now();
    const start = now - 10 * DAY;
    storePlan(start + YEAR, 2 * DAY, { currentPeriodStart: new Date(start) });
    await send(POST, event('CANCELLATION', { cancel_reason: 'CUSTOMER_SUPPORT', expiration_at_ms: start + YEAR }));
    expect(sub().status).toBe('EXPIRED');
    expect(endMs()).toBeLessThanOrEqual(Date.now());
  });

  it('the refund is matched on the store expiry (end − credit), not on the end with credit', async () => {
    const now = Date.now();
    storePlan(now + 30 * DAY, 20 * DAY, { currentPeriodStart: new Date(now - 335 * DAY) });
    await send(POST, event('CANCELLATION', { cancel_reason: 'CUSTOMER_SUPPORT', expiration_at_ms: now + 30 * DAY }));
    expect(sub().autoRenew).toBe(false);
    expect(sub().cancelReason).toBe('REFUND');
  });
});

describe('TRANSFER carries the store dates, not the other shop credit', () => {
  it('shop 8 gets the store expiry plus its own days left', async () => {
    const now = Date.now();
    storePlan(now + 100 * DAY, 2 * DAY);
    store.subscriptions.push({
      id: 80, merchantId: 8, planId: 2, status: 'ACTIVE', currentPeriodStart: new Date(now - 20 * DAY), currentPeriodEnd: new Date(now + 10 * DAY),
      billingChannel: 'MANUAL', storeProductId: null, autoRenew: false, storeBonusMs: null, lastStoreEventAt: null,
    });
    await send(POST, event('TRANSFER', { transferred_from: ['merchant_7'], transferred_to: ['merchant_8'], event_timestamp_ms: now }));
    const to = store.subscriptions.find((s) => s.merchantId === 8)!;
    expect(to.currentPeriodEnd.getTime()).toBe(now + 110 * DAY);
    expect(to.storeBonusMs).toBe(10 * DAY);
    expect(sub()).toMatchObject({ billingChannel: 'MANUAL', storeBonusMs: null });
  });
});
