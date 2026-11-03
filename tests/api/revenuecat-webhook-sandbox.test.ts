/**
 * #1459 audit A3: sandbox purchases must not change real shops.
 * - The production API (REVENUECAT_APP_USER_ID_PREFIX unset = `merchant_`) takes SANDBOX events only for merchant ids in
 *   REVENUECAT_SANDBOX_MERCHANT_IDS (the App Review demo shop); others are ignored with a log line.
 * - Builds on a non-production API use `dev_merchant_<id>`; the dev API (prefix `dev_merchant_`) takes them, sandbox included.
 * - Each API ignores the other environment's ids.
 * - Sandbox events never write a payment.
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

describe('sandbox and environments (A3)', () => {
  const sandbox = (over = {}) => event('INITIAL_PURCHASE', { environment: 'SANDBOX', expiration_at_ms: Date.now() + 5 * 60000, ...over });

  it('production API: a sandbox purchase of a real shop is ignored and logged', async () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const before = { ...sub() };
    const res = await send(POST, sandbox());
    expect([res.status, res.body.status]).toEqual([200, 'ignored_sandbox']);
    expect(sub()).toEqual(before);
    expect(store.payments).toHaveLength(0);
    expect(spy.mock.calls.flat().join(' ')).toMatch(/sandbox/i);
    spy.mockRestore();
  });

  it('production API: the allow-listed demo shop gets the sandbox purchase, without a payment row', async () => {
    process.env.REVENUECAT_SANDBOX_MERCHANT_IDS = '12, 7';
    const res = await send(POST, sandbox({ product_id: 'anyrent_professional_annual' }));
    expect(res.status).toBe(200);
    expect(sub().planId).toBe(3);
    expect(store.payments).toHaveLength(0);
  });

  it('production purchases still write their payment', async () => {
    await send(POST, event('RENEWAL'));
    expect(store.payments).toHaveLength(1);
    expect(store.payments[0].status).toBe('COMPLETED');
  });

  it('production API ignores dev builds (dev_merchant_)', async () => {
    const before = { ...sub() };
    const res = await send(POST, event('RENEWAL', { app_user_id: 'dev_merchant_7' }));
    expect(res.body.status).toMatch(/^ignored/);
    expect(sub()).toEqual(before);
  });

  it('dev API (prefix dev_merchant_) takes dev ids, sandbox included, and ignores production ids', async () => {
    process.env.REVENUECAT_APP_USER_ID_PREFIX = 'dev_merchant_';
    const res = await send(POST, sandbox({ app_user_id: 'dev_merchant_7', product_id: 'anyrent_professional_semi_annual' }));
    expect(res.status).toBe(200);
    expect(sub().planId).toBe(3);
    expect(store.payments).toHaveLength(0);
    const prod = await send(POST, event('RENEWAL', { app_user_id: 'merchant_7', product_id: 'anyrent_merchant_annual' }));
    expect(prod.body.status).toMatch(/^ignored/);
    expect(sub().planId).toBe(3);
  });
});
