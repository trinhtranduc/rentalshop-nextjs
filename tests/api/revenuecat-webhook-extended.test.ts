/**
 * #1459 audit A7: SUBSCRIPTION_EXTENDED (a deferred Google Play renewal, an App Store extension) moves the period end to
 * the new expiration, so the shop is not blocked while the store has extended it.
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

describe('SUBSCRIPTION_EXTENDED (A7)', () => {
  it('moves the period end to the new expiration, with a history row', async () => {
    const later = Date.now() + 40 * DAY;
    const res = await send(POST, event('SUBSCRIPTION_EXTENDED', { store: 'PLAY_STORE', expiration_at_ms: later }));
    expect(res.status).toBe(200);
    expect(sub().currentPeriodEnd.getTime()).toBe(later);
    expect(lastActivity()).toMatchObject({ type: 'IAP_EXTENDED' });
    expect(lastActivity().description).toMatch(/Google Play gia hạn thêm, gói dùng đến \d{2}\/\d{2}\/\d{4}\./);
  });

  it('an earlier expiration does not shorten the period', async () => {
    const end = sub().currentPeriodEnd.getTime();
    await send(POST, event('SUBSCRIPTION_EXTENDED', { expiration_at_ms: Date.now() + DAY }));
    expect(sub().currentPeriodEnd.getTime()).toBe(end);
  });
});
