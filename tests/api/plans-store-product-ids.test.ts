/**
 * #1459 GET /api/plans: each plan adds `storeProductIds` ({ semiAnnual, annual } for Basic and Professional, null for
 * plans not sold in the apps). The apps take the plan ↔ store product map from here; every old key is unchanged.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));
jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) => handler(request, { user: { id: 1, role: 'MERCHANT' }, userScope: { merchantId: 7 } }),
}));
const PLANS = [
  { id: 1, name: 'Trial', isActive: true, isPopular: false, limits: '{}', features: '[]' },
  { id: 2, name: 'Basic', isActive: true, isPopular: false, limits: '{}', features: '[]' },
  { id: 3, name: 'Professional', isActive: true, isPopular: true, limits: '{}', features: '[]' },
];
jest.mock('@rentalshop/database', () => ({
  db: { plans: { search: async () => ({ data: PLANS, total: 3, page: 1, limit: 50, hasMore: false }) } },
}));
jest.mock('@rentalshop/utils', () => ({
  planCreateSchema: { parse: (x: any) => x },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { GET } from '../../apps/api/app/api/plans/route';

describe('GET /api/plans storeProductIds (#1459)', () => {
  it('adds the store products to Basic and Professional only, keeps the rest', async () => {
    const res: any = await GET({ url: 'http://x/api/plans' } as any);
    expect(res.status).toBe(200);
    const plans = res.body.data.plans;
    expect(plans.map((p: any) => p.storeProductIds)).toEqual([
      null,
      { semiAnnual: 'anyrent_merchant_semi_annual', annual: 'anyrent_merchant_annual' },
      { semiAnnual: 'anyrent_professional_semi_annual', annual: 'anyrent_professional_annual' },
    ]);
    plans.forEach((p: any, i: number) => {
      const { storeProductIds, ...rest } = p;
      expect(rest).toEqual(PLANS[i]);
    });
    expect(res.body.data).toMatchObject({ total: 3, page: 1, limit: 50, hasMore: false });
  });
});
