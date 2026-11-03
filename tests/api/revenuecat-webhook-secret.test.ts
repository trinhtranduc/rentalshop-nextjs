/**
 * #1459 audit A2: the RevenueCat webhook refuses everything when REVENUECAT_WEBHOOK_SECRET is unset (503 + log), and
 * compares `Authorization: Bearer <secret>` (the literal format RevenueCat sends) in constant time.
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

describe('webhook secret (A2)', () => {
  it('no secret configured: 503, nothing written', async () => {
    delete process.env.REVENUECAT_WEBHOOK_SECRET;
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await send(POST, event('INITIAL_PURCHASE'));
    expect(res.status).toBe(503);
    expect(store.events).toHaveLength(0);
    expect(sub().storeProductId).toBe('anyrent_merchant_annual');
    expect(spy.mock.calls.flat().join(' ')).toMatch(/REVENUECAT_WEBHOOK_SECRET/);
    spy.mockRestore();
  });

  it('missing, wrong, unprefixed or shorter header: 401', async () => {
    for (const auth of [null, 'Bearer nope', SECRET, `Bearer ${SECRET}x`, 'Bearer ']) {
      const res = await send(POST, event('INITIAL_PURCHASE'), auth);
      expect([auth, res.status]).toEqual([auth, 401]);
    }
    expect(store.events).toHaveLength(0);
  });

  it('the exact "Bearer <secret>" passes', async () => {
    expect((await send(POST, event('RENEWAL'))).status).toBe(200);
  });
});
