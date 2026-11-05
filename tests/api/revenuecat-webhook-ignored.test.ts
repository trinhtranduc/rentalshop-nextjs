/**
 * #1459 audit A9: an event the webhook could not apply gives its event id back, so RevenueCat's retry (or a manual
 * resend) runs it later. "No plan for this tier" is a server problem: 500, so RevenueCat retries. Truly irrelevant events
 * (TEST, unknown types) stay 200.
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

describe('ignored events release their id (A9)', () => {
  it('unknown product and unknown merchant: 200 ignored, the id is free again', async () => {
    const a = await send(POST, event('INITIAL_PURCHASE', { product_id: 'other_app' }));
    expect([a.status, a.body.status]).toEqual([200, 'ignored_unknown_product']);
    const b = await send(POST, event('INITIAL_PURCHASE', { app_user_id: 'merchant_404' }));
    expect([b.status, b.body.status]).toEqual([200, 'ignored_unknown_merchant']);
    expect(store.events).toHaveLength(0);
  });

  it('no active plan for the tier: 500 and the id is free, so the retry applies once the plan exists', async () => {
    store.plans = store.plans.filter((p) => p.name !== 'Professional');
    const ev = event('INITIAL_PURCHASE', { product_id: 'anyrent_professional_annual' });
    const first = await send(POST, ev);
    expect(first.status).toBe(500);
    expect(store.events).toHaveLength(0);
    store.plans.push({ id: 3, name: 'Professional', isActive: true, deletedAt: null });
    const retry = await send(POST, ev);
    expect(retry.status).toBe(200);
    expect(sub().planId).toBe(3);
  });

  it('TEST and unknown types: 200, nothing changes', async () => {
    for (const type of ['TEST', 'SOMETHING_NEW']) {
      const res = await send(POST, event(type));
      expect(res.status).toBe(200);
    }
    expect(store.events).toHaveLength(0);
    expect(store.activities).toHaveLength(0);
  });
});
