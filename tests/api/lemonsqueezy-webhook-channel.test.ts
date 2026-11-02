/**
 * #1459 POST /api/lemonsqueezy/webhook with signed fixtures (HMAC-SHA256 of the raw body, as Lemon Squeezy sends it).
 * Phase 1 only records the billing channel (LEMON), auto-renew and the billing issue next to what the route already did.
 */
import crypto from 'crypto';

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));
jest.mock('@rentalshop/env', () => ({ env: { LEMON_SQUEEZY_WEBHOOK_SECRET: 'lemon-test-secret' } }));

const rows: Record<number, any> = {};
const payments: any[] = [];
const mockPrisma = {
  subscription: {
    upsert: async ({ where, create, update }: any) => {
      rows[where.merchantId] = rows[where.merchantId] ? { ...rows[where.merchantId], ...update } : { id: 70, ...create };
      return rows[where.merchantId];
    },
    findUnique: async ({ where }: any) => rows[where.merchantId] ?? null,
  },
  payment: { create: async ({ data }: any) => payments.push(data) },
};
jest.mock('@rentalshop/database', () => ({ db: { prisma: mockPrisma }, prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/billing-dates'),
  ResponseBuilder: { error: (code: string) => ({ success: false, code }) },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { POST } from '../../apps/api/app/api/lemonsqueezy/webhook/route';

function sign(body: string, secret = 'lemon-test-secret') {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

function lemon(eventName: string, status: string, over: Record<string, any> = {}) {
  return {
    meta: { event_name: eventName, custom_data: { merchantId: 7, planId: 3, billingInterval: 'annual' } },
    data: {
      id: '9001',
      type: 'subscriptions',
      attributes: { status, renews_at: '2027-11-02T02:00:00.000Z', ends_at: null, cancelled: false, ...over },
    },
  };
}

async function send(eventName: string, payload: any, signature?: string) {
  const raw = JSON.stringify(payload);
  const headers: Record<string, string> = { 'x-event-name': eventName, 'x-signature': signature ?? sign(raw) };
  const request: any = { headers: { get: (n: string) => headers[n.toLowerCase()] ?? null }, text: async () => raw };
  return (await POST(request)) as any;
}

beforeEach(() => {
  for (const k of Object.keys(rows)) delete rows[Number(k)];
  payments.length = 0;
});

describe('Lemon Squeezy webhook records the channel (#1459)', () => {
  it('a bad signature is rejected and writes nothing', async () => {
    const res = await send('subscription_created', lemon('subscription_created', 'active'), 'bad');
    expect(res.status).toBe(400);
    expect(rows[7]).toBeUndefined();
  });

  it('created (active): channel LEMON, auto-renew on, no billing issue', async () => {
    const res = await send('subscription_created', lemon('subscription_created', 'active'));
    expect(res.status).toBe(200);
    expect(rows[7]).toMatchObject({ planId: 3, lemonSubscriptionId: '9001', status: 'ACTIVE', billingChannel: 'LEMON', autoRenew: true, billingIssueAt: null });
  });

  it('the same signed event twice gives the same row', async () => {
    const payload = lemon('subscription_updated', 'active');
    await send('subscription_updated', payload);
    const first = { ...rows[7] };
    await send('subscription_updated', payload);
    const { updatedAt: a, ...one } = first;
    const { updatedAt: b, ...two } = rows[7];
    expect(two).toEqual(one);
  });

  it('past_due: billing issue flagged; active again clears it', async () => {
    await send('subscription_updated', lemon('subscription_updated', 'past_due'));
    expect(rows[7].billingIssueAt).toBeInstanceOf(Date);
    expect(rows[7].status).toBe('PAST_DUE');
    await send('subscription_updated', lemon('subscription_updated', 'active'));
    expect(rows[7].billingIssueAt).toBeNull();
  });

  it('cancelled: auto-renew off', async () => {
    await send('subscription_created', lemon('subscription_created', 'active'));
    await send('subscription_cancelled', lemon('subscription_cancelled', 'cancelled', { cancelled: true, ends_at: '2027-11-02T02:00:00.000Z' }));
    expect(rows[7]).toMatchObject({ billingChannel: 'LEMON', autoRenew: false, status: 'CANCELLED' });
  });
});
