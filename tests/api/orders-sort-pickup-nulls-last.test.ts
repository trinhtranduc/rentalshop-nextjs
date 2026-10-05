/**
 * #428 — GET /api/orders?sortBy=pickupPlanAt lists orders without a planned pickup first.
 * `findManyLightweight` must sort the nullable planned dates with NULLs last, in both directions,
 * and keep the merchant filter and the other sort keys unchanged.
 */
const mockPrisma: any = {
  order: { findMany: jest.fn(), count: jest.fn() },
  orderItem: { groupBy: jest.fn() },
  payment: { groupBy: jest.fn() },
};
jest.mock('../../packages/database/src/client', () => ({ prisma: mockPrisma }));
jest.mock('@rentalshop/utils', () => ({
  removeVietnameseDiacritics: (s: string) => s,
  normalizeStartDate: (d: any) => d,
  normalizeEndDate: (d: any) => d,
  formatFullName: (a: string, b: string) => [a, b].filter(Boolean).join(' '),
  parseProductImages: () => [],
}));

import { simplifiedOrders } from '../../packages/database/src/order';

function lastFindManyArgs() {
  const calls = mockPrisma.order.findMany.mock.calls;
  return calls[calls.length - 1][0];
}

describe('order list sort by planned dates puts NULLs last (#428)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.orderItem.groupBy.mockResolvedValue([]);
    mockPrisma.payment.groupBy.mockResolvedValue([]);
  });

  it.each(['asc', 'desc'] as const)('pickupPlanAt %s → NULLs last', async (sortOrder) => {
    await simplifiedOrders.findManyLightweight({ merchantId: 7, sortBy: 'pickupPlanAt', sortOrder });
    const args = lastFindManyArgs();
    expect(args.orderBy).toEqual({ pickupPlanAt: { sort: sortOrder, nulls: 'last' } });
    expect(args.where.outlet).toEqual({ merchantId: 7 });
  });

  it.each(['asc', 'desc'] as const)('returnPlanAt %s → NULLs last', async (sortOrder) => {
    await simplifiedOrders.findManyLightweight({ merchantId: 7, sortBy: 'returnPlanAt', sortOrder });
    expect(lastFindManyArgs().orderBy).toEqual({ returnPlanAt: { sort: sortOrder, nulls: 'last' } });
  });

  it('keeps the default createdAt desc and non-null keys unchanged', async () => {
    await simplifiedOrders.findManyLightweight({ merchantId: 7 });
    expect(lastFindManyArgs().orderBy).toEqual({ createdAt: 'desc' });
    await simplifiedOrders.findManyLightweight({ merchantId: 7, sortBy: 'totalAmount', sortOrder: 'asc' });
    expect(lastFindManyArgs().orderBy).toEqual({ totalAmount: 'asc' });
  });
});
