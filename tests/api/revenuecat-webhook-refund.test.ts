/**
 * #1459 audit A10: a refund ends access only when the refunded transaction is the period in use (its expiration matches
 * the current period end); a refund of an earlier period only marks that payment refunded.
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

describe('refunds cut only the current period (A10)', () => {
  it('the refunded transaction is the current period: access ends now', async () => {
    const end = sub().currentPeriodEnd.getTime();
    await send(POST, event('CANCELLATION', { cancel_reason: 'CUSTOMER_SUPPORT', expiration_at_ms: end + 60000 }));
    expect(sub().status).toBe('EXPIRED');
    expect(sub().currentPeriodEnd.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('a refund of an earlier period of the same product keeps the current period', async () => {
    const end = sub().currentPeriodEnd.getTime();
    store.payments.push({ id: 1, transactionId: 'tx-old', merchantId: 7, status: 'COMPLETED' });
    await send(POST, event('CANCELLATION', { cancel_reason: 'CUSTOMER_SUPPORT', transaction_id: 'tx-old', expiration_at_ms: end - 365 * DAY }));
    expect(sub()).toMatchObject({ status: 'ACTIVE', autoRenew: true });
    expect(sub().currentPeriodEnd.getTime()).toBe(end);
    expect(store.payments[0].status).toBe('REFUNDED');
    expect(lastActivity().type).toBe('IAP_REFUND');
  });

  it('a refund without an expiration does not cut the period', async () => {
    const end = sub().currentPeriodEnd.getTime();
    await send(POST, event('CANCELLATION', { cancel_reason: 'CUSTOMER_SUPPORT', expiration_at_ms: undefined }));
    expect(sub().currentPeriodEnd.getTime()).toBe(end);
  });
});
