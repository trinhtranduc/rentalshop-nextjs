/**
 * #1482 — a refund through RevenueCat dates the payment (`Payment.refundedAt`), so the admin revenue report can show
 * the refund in the month it happened without rewriting the month the money was received in.
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
import { DAY, event, reset, send, store, sub } from './helpers/revenuecat-fake';

beforeEach(reset);

const REFUND_AT = Date.parse('2026-11-03T05:00:00.000Z');
const refund = (over: Record<string, any> = {}) =>
  event('CANCELLATION', { cancel_reason: 'CUSTOMER_SUPPORT', transaction_id: 'tx-old', expiration_at_ms: sub().currentPeriodEnd.getTime() - 365 * DAY, event_timestamp_ms: REFUND_AT, ...over });

describe('refundedAt', () => {
  it('a refund marks the payment REFUNDED and stores the refund event time', async () => {
    store.payments.push({ id: 1, transactionId: 'tx-old', merchantId: 7, status: 'COMPLETED', processedAt: new Date('2026-10-10T05:00:00.000Z') });
    await send(POST, refund());
    expect(store.payments[0].status).toBe('REFUNDED');
    expect(store.payments[0].refundedAt).toEqual(new Date(REFUND_AT));
    expect(store.payments[0].processedAt).toEqual(new Date('2026-10-10T05:00:00.000Z')); // the month it was received in is untouched
  });

  it('a repeated refund event keeps the first date', async () => {
    store.payments.push({ id: 1, transactionId: 'tx-old', merchantId: 7, status: 'COMPLETED' });
    await send(POST, refund());
    await send(POST, refund({ event_timestamp_ms: REFUND_AT + 5 * DAY }));
    expect(store.payments[0].refundedAt).toEqual(new Date(REFUND_AT));
  });

  it('another shop\'s payment with the same transaction id is not touched', async () => {
    store.payments.push({ id: 2, transactionId: 'tx-old', merchantId: 8, status: 'COMPLETED' });
    await send(POST, refund());
    expect(store.payments[0]).toMatchObject({ status: 'COMPLETED' });
    expect(store.payments[0].refundedAt).toBeUndefined();
  });

  it('a cancellation that is not a refund leaves the payment alone', async () => {
    store.payments.push({ id: 3, transactionId: 'tx-old', merchantId: 7, status: 'COMPLETED' });
    await send(POST, event('CANCELLATION', { cancel_reason: 'UNSUBSCRIBE', transaction_id: 'tx-old' }));
    expect(store.payments[0].status).toBe('COMPLETED');
    expect(store.payments[0].refundedAt).toBeUndefined();
  });
});
