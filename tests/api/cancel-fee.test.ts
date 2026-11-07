/**
 * #1491: cancelling a RENT order that was not handed over and has no deposit plan, with a fee (`cancelKeptAmount`) kept inside
 * the deposit. 0 <= fee <= deposit; staff cannot keep money; no payment rows, depositAmount untouched.
 */
import { parseCancelRequest, planCancellation, recordPlanCancellation } from '../../apps/api/lib/installments';
import { createFakePrisma, createFakeState } from '../helpers/installment-fake';

const order = (fields: Record<string, any> = {}) => ({
  id: 1, orderType: 'RENT', status: 'RESERVED', totalAmount: 300_000, depositAmount: 300_000, depositPlan: null, cancelKeptAmount: null, ...fields,
});
const plan = (fields: Record<string, any>, kept?: number, role = 'MERCHANT') =>
  planCancellation(createFakePrisma(createFakeState(order(fields))).prisma, {
    order: order(fields) as any,
    role,
    request: parseCancelRequest(kept === undefined ? {} : { cancelKeptAmount: kept }),
  });

describe('planCancellation of an order without a deposit plan (#1491)', () => {
  it('case A: deposit 300.000, fee 100.000 -> keeps 100.000, gives back 200.000', async () => {
    expect(await plan({}, 100_000)).toEqual({ plan: expect.objectContaining({ collected: 300_000, kept: 100_000, refund: 200_000, refundedAll: false }) });
  });

  it('case B: deposit 100.000, fee 100.000 -> keeps all, gives back 0', async () => {
    expect(await plan({ depositAmount: 100_000 }, 100_000)).toEqual({ plan: expect.objectContaining({ collected: 100_000, kept: 100_000, refund: 0 }) });
  });

  it('case C: a fee above the deposit is refused (400 CANCEL_AMOUNTS_MISMATCH)', async () => {
    expect(await plan({ depositAmount: 100_000 }, 300_000)).toEqual({ error: { code: 'CANCEL_AMOUNTS_MISMATCH', status: 400 } });
  });

  it('case D and old apps: no fee or fee 0 -> nothing to record, everything goes back as before', async () => {
    expect(await plan({})).toEqual({ plan: null });
    expect(await plan({}, 0)).toEqual({ plan: null });
  });

  it('only the owner and the outlet admin keep money; staff get 403, and without a fee staff cancel as before', async () => {
    expect(await plan({}, 100_000, 'OUTLET_STAFF')).toEqual({ error: { code: 'INSTALLMENT_FORBIDDEN_ROLE', status: 403 } });
    expect(await plan({}, undefined, 'OUTLET_STAFF')).toEqual({ plan: null });
    expect(await plan({}, 100_000, 'OUTLET_ADMIN')).toEqual({ plan: expect.objectContaining({ kept: 100_000 }) });
  });

  it('a fee is refused where nothing can be kept: no deposit, handed over, or a sale', async () => {
    const refused = { error: { code: 'CANCEL_AMOUNTS_MISMATCH', status: 400 } };
    expect(await plan({ depositAmount: 0 }, 50_000)).toEqual(refused);
    expect(await plan({ status: 'PICKUPED' }, 50_000)).toEqual(refused);
    expect(await plan({ orderType: 'SALE', status: 'COMPLETED' }, 50_000)).toEqual(refused);
  });

  it('a negative or non-numeric fee is refused', async () => {
    expect(await plan({}, -1)).toEqual({ error: { code: 'CANCEL_AMOUNTS_MISMATCH', status: 400 } });
    const bad = await planCancellation(createFakePrisma(createFakeState(order())).prisma, {
      order: order() as any, role: 'MERCHANT', request: parseCancelRequest({ cancelKeptAmount: 'abc' }),
    });
    expect(bad).toEqual({ error: { code: 'CANCEL_AMOUNTS_MISMATCH', status: 400 } });
  });
});

describe('recordPlanCancellation of an order without a deposit plan (#1491)', () => {
  const at = new Date('2026-01-08T03:00:00Z');
  async function cancel(fields: Record<string, any>, kept: number) {
    const state = createFakeState(order({ status: 'CANCELLED', ...fields }));
    const { prisma } = createFakePrisma(state);
    const checked: any = await planCancellation(prisma, { order: order(fields) as any, role: 'MERCHANT', request: parseCancelRequest({ cancelKeptAmount: kept }) });
    await recordPlanCancellation(prisma, { orderId: 1, merchantId: 7, currency: 'VND', plan: checked.plan, userId: 5, at });
    return state;
  }

  it('stores the fee and the cancel instant, writes no payment and keeps depositAmount', async () => {
    const state = await cancel({}, 100_000);
    const row = state.orders.get(1);
    expect(row.cancelKeptAmount).toBe(100_000);
    expect(row.cancelledAt).toEqual(at);
    expect(row.depositAmount).toBe(300_000);
    expect(state.payments).toHaveLength(0);
  });

  it('a second request for the same order does not write again', async () => {
    const state = await cancel({}, 100_000);
    const { prisma } = createFakePrisma(state);
    await recordPlanCancellation(prisma, {
      orderId: 1, merchantId: 7, currency: 'VND', plan: { collected: 300_000, kept: 250_000, refund: 50_000, refundedAll: false, plain: true } as any, userId: 5, at: new Date('2026-01-09T03:00:00Z'),
    });
    expect(state.orders.get(1).cancelKeptAmount).toBe(100_000);
    expect(state.orders.get(1).cancelledAt).toEqual(at);
  });

  it('the stored fee never exceeds the deposit', async () => {
    const state = createFakeState(order({ status: 'CANCELLED', depositAmount: 100_000 }));
    await recordPlanCancellation(createFakePrisma(state).prisma, {
      orderId: 1, merchantId: 7, currency: 'VND', plan: { collected: 100_000, kept: 300_000, refund: 0, refundedAll: false, plain: true } as any, userId: 5, at,
    });
    expect(state.orders.get(1).cancelKeptAmount).toBe(100_000);
  });
});
