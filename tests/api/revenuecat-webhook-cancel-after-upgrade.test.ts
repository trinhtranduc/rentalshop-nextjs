/**
 * #1466 Cancel after an App Store upgrade. On dev (shop 30, sandbox) the owner bought Basic 12 months, upgraded to
 * Professional 12 months, then turned auto-renew off in Apple's manage sheet. RevenueCat sent RENEWAL (Basic),
 * PRODUCT_CHANGE (Basic → Professional) and CANCELLATION with the Basic product id. The webhook compared products, called
 * the cancellation "another product" and left auto-renew on.
 *
 * Apple keeps the original transaction id across upgrades, downgrades and crossgrades in a subscription group: an App
 * Store event with the shop's original transaction id is the shop's subscription, whatever product it names. The same
 * holds for EXPIRATION, a refund (CANCELLATION + CUSTOMER_SUPPORT) and SUBSCRIPTION_EXTENDED. Google Play starts a new
 * order id on every product change, so the product still decides there (revenuecat-webhook.test.ts).
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

const BASIC = 'anyrent_merchant_annual';
const PRO = 'anyrent_professional_annual';
const MIN = 60 * 1000;

type Row = Record<string, any>;

beforeEach(reset);

/**
 * RENEWAL of Basic 12 months, then PRODUCT_CHANGE to Professional 12 months, one minute apart (the shop's App Store
 * subscription, original transaction id `otx-7`). Returns the period the RENEWAL set and the event time to go on from.
 */
async function renewThenUpgrade(over: Row = {}, merchantId = 7) {
  const t0 = Date.now() - 10 * MIN;
  const renewal = event('RENEWAL', { product_id: BASIC, purchased_at_ms: t0, expiration_at_ms: t0 + 365 * DAY, event_timestamp_ms: t0, ...over });
  expect((await send(POST, renewal)).body.status).toBe('ok');
  const change = event('PRODUCT_CHANGE', {
    product_id: BASIC, new_product_id: PRO, event_timestamp_ms: t0 + MIN, price_in_purchased_currency: 2399000, ...over,
  });
  expect((await send(POST, change)).body.status).toBe('ok');
  expect(sub(merchantId)).toMatchObject({ planId: 3, storeProductId: PRO, autoRenew: true, cancelAtPeriodEnd: false });
  const period = { start: sub(merchantId).currentPeriodStart.getTime(), end: sub(merchantId).currentPeriodEnd.getTime() };
  return { renewal, period, next: t0 + 2 * MIN };
}

describe('CANCELLATION after an App Store upgrade (#1466)', () => {
  it('Basic product id, same original transaction id: auto-renew off, access until the period end', async () => {
    const { period, next } = await renewThenUpgrade();
    const res = await send(POST, event('CANCELLATION', {
      product_id: BASIC, original_transaction_id: 'otx-7', cancel_reason: 'UNSUBSCRIBE', event_timestamp_ms: next,
    }));
    expect(res.body.status).toBe('ok');
    expect(sub()).toMatchObject({ autoRenew: false, cancelAtPeriodEnd: true, status: 'ACTIVE', planId: 3, storeProductId: PRO });
    expect(sub().canceledAt).toBeInstanceOf(Date);
    expect(sub().currentPeriodStart.getTime()).toBe(period.start);
    expect(sub().currentPeriodEnd.getTime()).toBe(period.end);
    expect(lastActivity().type).toBe('IAP_CANCELLATION');
    expect(lastActivity().description).toMatch(/^Đã tắt tự gia hạn trên App Store\. Gói vẫn dùng đến \d{2}\/\d{2}\/\d{4}\.$/);
  });

  it('the events as they reached dev: sandbox, dev_merchant_30', async () => {
    process.env.REVENUECAT_APP_USER_ID_PREFIX = 'dev_merchant_';
    store.merchants.push({ id: 30 });
    // Shop 30 on Basic 12 months from the App Store
    store.subscriptions.push({ ...sub(7), id: 300, merchantId: 30, storeOriginalTransactionId: '2000000812345678' });
    const dev = { app_user_id: 'dev_merchant_30', environment: 'SANDBOX', original_transaction_id: '2000000812345678' };
    const { period, next } = await renewThenUpgrade(dev, 30);
    const res = await send(POST, event('CANCELLATION', { ...dev, product_id: BASIC, cancel_reason: 'UNSUBSCRIBE', event_timestamp_ms: next }));
    expect(res.body.status).toBe('ok');
    expect(sub(30)).toMatchObject({ autoRenew: false, cancelAtPeriodEnd: true, status: 'ACTIVE', planId: 3, storeProductId: PRO });
    expect(sub(30).currentPeriodStart.getTime()).toBe(period.start);
    expect(sub(30).currentPeriodEnd.getTime()).toBe(period.end);
    // Shop 7 untouched
    expect(sub(7)).toMatchObject({ autoRenew: true, cancelAtPeriodEnd: false, planId: 2 });
  });

  it('another Apple ID (another original transaction id) changes nothing, whatever the product', async () => {
    const { period, next } = await renewThenUpgrade();
    for (const product_id of [BASIC, PRO]) {
      const res = await send(POST, event('CANCELLATION', {
        product_id, original_transaction_id: 'otx-other-apple-id', cancel_reason: 'UNSUBSCRIBE', event_timestamp_ms: next,
      }));
      expect(res.body.status).toBe('ok_other_product');
    }
    expect(sub()).toMatchObject({ autoRenew: true, cancelAtPeriodEnd: false, canceledAt: null, planId: 3 });
    expect(sub().currentPeriodEnd.getTime()).toBe(period.end);
  });
});

describe('EXPIRATION after an App Store upgrade (#1466)', () => {
  it('before the period end: auto-renew off, access kept', async () => {
    const { period, next } = await renewThenUpgrade();
    const res = await send(POST, event('EXPIRATION', { product_id: BASIC, original_transaction_id: 'otx-7', event_timestamp_ms: next }));
    expect(res.body.status).toBe('ok_period_not_ended');
    expect(sub()).toMatchObject({ status: 'ACTIVE', autoRenew: false, planId: 3 });
    expect(sub().currentPeriodEnd.getTime()).toBe(period.end);
    expect(lastActivity().type).toBe('IAP_EXPIRATION_IGNORED');
    expect(JSON.parse(lastActivity().metadata).reason).toBe('period_not_ended');
  });

  it('after the period end: EXPIRED', async () => {
    const { next } = await renewThenUpgrade();
    sub().currentPeriodEnd = new Date(Date.now() - DAY);
    const res = await send(POST, event('EXPIRATION', { product_id: BASIC, original_transaction_id: 'otx-7', event_timestamp_ms: next }));
    expect(res.body.status).toBe('ok');
    expect(sub()).toMatchObject({ status: 'EXPIRED', autoRenew: false });
    expect(lastActivity().type).toBe('IAP_EXPIRATION');
  });
});

describe('refund after an App Store upgrade (#1466, with A10)', () => {
  it('a refund of the period in use, named with the Basic product: access ends, the payment is refunded', async () => {
    const { renewal, next } = await renewThenUpgrade();
    expect(store.payments).toHaveLength(1);
    const res = await send(POST, event('CANCELLATION', {
      product_id: BASIC, original_transaction_id: 'otx-7', cancel_reason: 'CUSTOMER_SUPPORT',
      transaction_id: renewal.transaction_id, expiration_at_ms: renewal.expiration_at_ms, event_timestamp_ms: next,
    }));
    expect(res.body.status).toBe('ok');
    expect(sub()).toMatchObject({ status: 'EXPIRED', autoRenew: false, cancelAtPeriodEnd: true, cancelReason: 'REFUND' });
    expect(sub().currentPeriodEnd.getTime()).toBe(next);
    expect(store.payments[0].status).toBe('REFUNDED');
    expect(lastActivity().type).toBe('IAP_REFUND');
  });

  it('a refund of the Basic period after the Professional renewal only marks that payment (A10 kept)', async () => {
    const t0 = Date.now() - 30 * DAY;
    const basic = event('RENEWAL', { product_id: BASIC, purchased_at_ms: t0, expiration_at_ms: t0 + 365 * DAY, event_timestamp_ms: t0 });
    await send(POST, basic);
    await send(POST, event('PRODUCT_CHANGE', { product_id: BASIC, new_product_id: PRO, event_timestamp_ms: Date.now() - 2 * MIN }));
    const now = Date.now() - MIN;
    await send(POST, event('RENEWAL', { product_id: PRO, purchased_at_ms: now, expiration_at_ms: now + 365 * DAY, event_timestamp_ms: now }));
    const end = sub().currentPeriodEnd.getTime();
    const res = await send(POST, event('CANCELLATION', {
      product_id: BASIC, original_transaction_id: 'otx-7', cancel_reason: 'CUSTOMER_SUPPORT',
      transaction_id: basic.transaction_id, expiration_at_ms: basic.expiration_at_ms, event_timestamp_ms: Date.now(),
    }));
    expect(res.body.status).toBe('ok_other_period');
    expect(sub()).toMatchObject({ status: 'ACTIVE', autoRenew: true, planId: 3, storeProductId: PRO });
    expect(sub().currentPeriodEnd.getTime()).toBe(end);
    expect(store.payments.find((p) => p.transactionId === basic.transaction_id)?.status).toBe('REFUNDED');
  });
});

describe('SUBSCRIPTION_EXTENDED after an App Store upgrade (#1466)', () => {
  it('the Basic product id with the same original transaction id moves the period end', async () => {
    const { period, next } = await renewThenUpgrade();
    const later = period.end + 10 * DAY;
    const res = await send(POST, event('SUBSCRIPTION_EXTENDED', {
      product_id: BASIC, original_transaction_id: 'otx-7', expiration_at_ms: later, event_timestamp_ms: next,
    }));
    expect(res.body.status).toBe('ok');
    expect(sub().currentPeriodEnd.getTime()).toBe(later);
    expect(lastActivity().type).toBe('IAP_EXTENDED');
  });
});
