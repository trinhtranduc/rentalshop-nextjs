/**
 * #1200 — GET /api/payments (admin table of plan / subscription payments) must not list order payments.
 * Platform payments keep appearing; the other filters (status, method, search) are unchanged.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) => handler(request),
}));
const mockSearch = jest.fn();
jest.mock('@rentalshop/database', () => ({
  db: { payments: { search: (a: any) => mockSearch(a) }, merchants: { findById: jest.fn() }, subscriptions: { findById: jest.fn() } },
}));
jest.mock('@rentalshop/utils', () => ({
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { GET } from '../../apps/api/app/api/payments/route';

const call = (qs = '') => (GET as any)({ url: `http://x/api/payments${qs}` });

beforeEach(() => {
  mockSearch.mockReset();
  mockSearch.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50, totalPages: 0, hasMore: false });
});

describe('GET /api/payments type filter (#1200)', () => {
  it('asks the database for rows whose type is not ORDER_PAYMENT', async () => {
    await call();
    expect(mockSearch.mock.calls[0][0].where.type).toEqual({ not: 'ORDER_PAYMENT' });
  });

  it('keeps status, method and search filters next to the type filter', async () => {
    await call('?status=completed&method=cash&search=abc');
    const where = mockSearch.mock.calls[0][0].where;
    expect(where.type).toEqual({ not: 'ORDER_PAYMENT' });
    expect(where.status).toBe('COMPLETED');
    expect(where.method).toBe('CASH');
    expect(where.OR).toHaveLength(4);
  });

  it('platform payment rows come back with the same fields as before', async () => {
    const at = new Date('2026-10-01T00:00:00.000Z');
    mockSearch.mockResolvedValue({
      data: [{ id: 3, merchantId: null, subscriptionId: null, amount: 100, currency: 'VND', status: 'COMPLETED', method: 'STRIPE', type: 'SUBSCRIPTION_PAYMENT', createdAt: at, processedAt: at, invoiceNumber: 'INV-1' }],
      total: 1, page: 1, limit: 50, totalPages: 1, hasMore: false,
    });
    const res = await call();
    expect(res.body.data[0]).toEqual(expect.objectContaining({ id: 3, status: 'completed', paymentMethod: 'stripe', invoiceNumber: 'INV-1' }));
    expect(res.body.total).toBe(1);
  });
});
