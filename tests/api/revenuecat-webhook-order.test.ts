/**
 * #1459 audit A8 (event order): the last applied store event time is kept on the subscription; an older event retried
 * after a newer one (an old RENEWAL after a CANCELLATION) changes nothing.
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
import { DAY, SECRET, event, lastActivity, reset, send, store, sub } from './helpers/revenuecat-fake';

beforeEach(reset);

describe('event order (A8)', () => {
  it('an old RENEWAL retried after a CANCELLATION does not turn auto-renew back on', async () => {
    const t = Date.now();
    await send(POST, event('CANCELLATION', { cancel_reason: 'UNSUBSCRIBE', event_timestamp_ms: t }));
    expect(sub().autoRenew).toBe(false);
    const res = await send(POST, event('RENEWAL', { event_timestamp_ms: t - 60000 }));
    expect([res.status, res.body.status]).toEqual([200, 'stale']);
    expect(sub()).toMatchObject({ autoRenew: false, cancelAtPeriodEnd: true });
    expect(sub().lastStoreEventAt.getTime()).toBe(t);
  });

  it('newer and same-time events apply and move the mark', async () => {
    const t = Date.now();
    await send(POST, event('CANCELLATION', { cancel_reason: 'UNSUBSCRIBE', event_timestamp_ms: t }));
    await send(POST, event('UNCANCELLATION', { event_timestamp_ms: t }));
    expect(sub().autoRenew).toBe(true);
    await send(POST, event('BILLING_ISSUE', { event_timestamp_ms: t + 1000 }));
    expect(sub().lastStoreEventAt.getTime()).toBe(t + 1000);
  });
});
