/**
 * #1200 — order list totals (paymentCount / totalPaid): the Payment groupBy leaves INSTALLMENT rows out
 * unless the client declared `installments`. NULL notes still count.
 */
const groupBy = jest.fn().mockResolvedValue([]);
const prismaMock: any = {
  order: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  orderItem: { groupBy: jest.fn().mockResolvedValue([]) },
  payment: { groupBy },
  $queryRaw: jest.fn().mockResolvedValue([]),
};
jest.mock('../../packages/database/src/client', () => ({ prisma: prismaMock }));
jest.mock('@rentalshop/utils', () => ({}));

import { simplifiedOrders } from '../../packages/database/src/order';

const NOT_INSTALLMENT = { OR: [{ notes: null }, { notes: { not: 'INSTALLMENT' } }] };

async function run(fn: (filters: any) => Promise<any>, filters: any) {
  prismaMock.order.findMany.mockResolvedValue([{ id: 1, orderItems: [], customer: null, outlet: null }]);
  groupBy.mockClear();
  await fn(filters);
  return groupBy.mock.calls[0]?.[0];
}

describe('order list totals vs INSTALLMENT (#1200)', () => {
  it('findManyLightweight: old client excludes INSTALLMENT, keeps COMPLETED-only', async () => {
    const arg = await run((f) => simplifiedOrders.findManyLightweight(f), { merchantId: 1 });
    expect(arg.where).toEqual({ orderId: { in: [1] }, status: 'COMPLETED', ...NOT_INSTALLMENT });
  });

  it('findManyLightweight: client with `installments` gets the old where', async () => {
    const arg = await run((f) => simplifiedOrders.findManyLightweight(f), { merchantId: 1, includeInstallments: true });
    expect(arg.where).toEqual({ orderId: { in: [1] }, status: 'COMPLETED' });
  });

  it('findManyMinimal: same rule', async () => {
    const old = await run((f) => simplifiedOrders.findManyMinimal(f), { merchantId: 1 });
    expect(old.where).toEqual({ orderId: { in: [1] }, ...NOT_INSTALLMENT });
    const capable = await run((f) => simplifiedOrders.findManyMinimal(f), { merchantId: 1, includeInstallments: true });
    expect(capable.where).toEqual({ orderId: { in: [1] } });
  });
});

describe('findManyLightweight depositPlan select (#1222)', () => {
  const selectOf = async (filters: any) => {
    prismaMock.order.findMany.mockClear();
    await run((f) => simplifiedOrders.findManyLightweight(f), filters);
    return prismaMock.order.findMany.mock.calls[0][0].select;
  };
  it('selects depositPlan only when asked', async () => {
    expect(await selectOf({ merchantId: 1 })).not.toHaveProperty('depositPlan');
    expect((await selectOf({ merchantId: 1, includeDepositPlan: true })).depositPlan).toBe(true);
  });
  it('returns the column in the rows only when asked', async () => {
    const plan = { v: 1, items: [] };
    prismaMock.order.findMany.mockResolvedValue([{ id: 1, orderItems: [], customer: null, outlet: null, depositPlan: plan }]);
    const asked = await simplifiedOrders.findManyLightweight({ merchantId: 1, includeDepositPlan: true });
    expect(asked.data[0].depositPlan).toEqual(plan);
    const notAsked = await simplifiedOrders.findManyLightweight({ merchantId: 1 });
    expect(notAsked.data[0]).not.toHaveProperty('depositPlan');
  });
});
