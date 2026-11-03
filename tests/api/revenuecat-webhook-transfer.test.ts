/**
 * #1459 audit A4: the merchant comes from `app_user_id`, then `original_app_user_id`, then `aliases` (a purchase made
 * before the app logged in is aliased later), and TRANSFER moves the store plan to the shop that restored it.
 * RevenueCat setting to use: Project settings → "Transfer behavior" → "Keep with original App User ID" (no transfers);
 * TRANSFER only happens with "Transfer to new App User ID".
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

describe('merchant resolution and TRANSFER (A4)', () => {
  const ANON = '$RCAnonymousID:abc';

  it('anonymous app_user_id: the merchant comes from original_app_user_id', async () => {
    const res = await send(POST, event('RENEWAL', { app_user_id: ANON, original_app_user_id: 'merchant_7', expiration_at_ms: Date.now() + 400 * DAY }));
    expect(res.status).toBe(200);
    expect(Math.round((sub().currentPeriodEnd.getTime() - Date.now()) / DAY)).toBe(400);
  });

  it('then from aliases', async () => {
    const res = await send(POST, event('RENEWAL', { app_user_id: ANON, original_app_user_id: ANON, aliases: [ANON, 'merchant_7'], expiration_at_ms: Date.now() + 400 * DAY }));
    expect(res.status).toBe(200);
    expect(Math.round((sub().currentPeriodEnd.getTime() - Date.now()) / DAY)).toBe(400);
  });

  it('TRANSFER merchant_7 → merchant_8: shop 8 gets the paid plan and period, shop 7 stops renewing', async () => {
    store.subscriptions.push({
      id: 80, merchantId: 8, planId: 1, status: 'TRIAL', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 2 * DAY),
      amount: 0, currency: 'VND', cancelAtPeriodEnd: false, autoRenew: false, billingChannel: null, storeProductId: null, billingIssueAt: null, lastStoreEventAt: null,
    });
    const end7 = sub(7).currentPeriodEnd.getTime();
    const res = await send(POST, { ...event('TRANSFER'), app_user_id: undefined, product_id: undefined, transferred_from: ['merchant_7'], transferred_to: ['merchant_8'] });
    expect(res.status).toBe(200);
    expect(sub(8)).toMatchObject({ planId: 2, status: 'ACTIVE', billingChannel: 'APP_STORE', storeProductId: 'anyrent_merchant_annual', autoRenew: true });
    expect(sub(8).currentPeriodEnd.getTime()).toBe(end7);
    expect(sub(7)).toMatchObject({ autoRenew: false, storeProductId: null, billingChannel: 'MANUAL' });
    expect(store.activities.map((a) => a.type)).toEqual(['IAP_TRANSFER', 'IAP_TRANSFER']);
  });

  it('TRANSFER to a shop without a subscription row creates it', async () => {
    const res = await send(POST, { ...event('TRANSFER'), app_user_id: undefined, transferred_from: ['merchant_7'], transferred_to: ['merchant_8'] });
    expect(res.status).toBe(200);
    expect(sub(8)).toMatchObject({ planId: 2, billingChannel: 'APP_STORE' });
  });

  it('TRANSFER from an anonymous id has nothing to move: 200, nothing changes', async () => {
    const before = { ...sub(7) };
    const res = await send(POST, { ...event('TRANSFER'), app_user_id: undefined, transferred_from: [ANON], transferred_to: ['merchant_8'] });
    expect(res.status).toBe(200);
    expect(sub(7)).toEqual(before);
    expect(store.subscriptions.find((s) => s.merchantId === 8)).toBeUndefined();
  });
});
