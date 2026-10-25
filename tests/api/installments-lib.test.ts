/**
 * #1199 helpers: depositAmount upkeep, the response shape for old / capable clients, balance and payment sums ignoring stages.
 */
import { computeDepositFromPayments, recomputeDepositFromPayments, shapeOrderInstallments, planForNewOrder, shopFromMerchant } from '../../apps/api/lib/installments';
import { computeOrderBalance } from '../../apps/api/lib/order-balance';
import { loadInstallmentReminders } from '../../apps/api/lib/installment-reminders';
import { createFakePrisma, createFakeState, planOrder, stagePayment } from '../helpers/installment-fake';

const cash = (amount: number, at: string, extra: any = {}) => ({ amount, status: 'COMPLETED', notes: 'INSTALLMENT', processedAt: at, ...extra });

describe('computeDepositFromPayments', () => {
  it('sums stage payments until hand-over, later ones are not deposit', () => {
    const rows = [cash(3_600_000, '2026-10-25T03:00:00Z'), cash(4_800_000, '2026-11-13T03:00:00Z'), cash(3_600_000, '2026-11-14T08:00:00Z')];
    expect(computeDepositFromPayments(rows, null)).toBe(12_000_000);
    expect(computeDepositFromPayments(rows, '2026-11-14T03:00:00Z')).toBe(8_400_000);
  });
  it('ignores cancelled, other notes; CANCEL_REFUND takes money off', () => {
    const rows = [
      cash(3_600_000, '2026-10-25T03:00:00Z'),
      cash(999, '2026-10-25T03:00:00Z', { status: 'CANCELLED' }),
      { amount: 5, status: 'COMPLETED', notes: 'PICKUP', processedAt: '2026-10-25T03:00:00Z' },
      { amount: 1_800_000, status: 'REFUNDED', notes: 'CANCEL_REFUND', processedAt: '2026-11-12T03:00:00Z' },
      { amount: 70, status: 'REFUNDED', notes: 'RETURN_ADJUSTMENT', processedAt: '2026-11-12T03:00:00Z' },
    ];
    expect(computeDepositFromPayments(rows, null)).toBe(1_800_000);
  });
});

describe('recomputeDepositFromPayments', () => {
  it('writes the sum for a plan order and leaves an order without a plan alone', async () => {
    const withPlan = createFakeState(planOrder(), [stagePayment('i1', 3_600_000)]);
    const { prisma } = createFakePrisma(withPlan);
    expect(await recomputeDepositFromPayments(prisma, 10)).toBe(3_600_000);
    expect(withPlan.orders.get(10).depositAmount).toBe(3_600_000);

    const legacy = createFakeState(planOrder({ depositPlan: null, depositAmount: 500_000 }), [stagePayment('i1', 3_600_000)]);
    const fake = createFakePrisma(legacy);
    expect(await recomputeDepositFromPayments(fake.prisma, 10)).toBeNull();
    expect(legacy.orders.get(10).depositAmount).toBe(500_000);
  });
});

describe('shapeOrderInstallments', () => {
  const order = { ...planOrder(), payments: [stagePayment('i1', 3_600_000)], cancelKeptAmount: null, cancelledAt: null };
  const request = (capabilities: string | null): any => ({ headers: { get: (k: string) => (k.toLowerCase() === 'x-client-capabilities' ? capabilities : null) } });

  it('old client: the three plan columns are dropped, nothing is added', async () => {
    const out: any = await shapeOrderInstallments(order, request(null), 2, null);
    expect(out).not.toHaveProperty('depositPlan');
    expect(out).not.toHaveProperty('cancelKeptAmount');
    expect(out).not.toHaveProperty('installments');
    expect(out.depositAmount).toBe(order.depositAmount);
  });

  it('capable client: stages with the documented fields, no raw plan', async () => {
    const { prisma } = createFakePrisma(createFakeState(order));
    const out: any = await shapeOrderInstallments(order, request('installments'), 2, prisma);
    expect(out).not.toHaveProperty('depositPlan');
    expect(Object.keys(out.installments[0]).sort()).toEqual(
      ['amount', 'collectedAt', 'dueDateKey', 'key', 'label', 'paidAmount', 'percent', 'plannedAmount', 'remaining', 'status'].sort()
    );
    expect(out.installments[0]).toMatchObject({ key: 'i1', label: 'Cọc giữ chỗ', percent: 30, amount: 3_600_000, status: 'PAID', paidAmount: 3_600_000 });
    expect(out.hasDepositPlan).toBe(true);
  });
});

describe('planForNewOrder', () => {
  const staged = shopFromMerchant({ settings: { payment: { depositMode: 'STAGED' } } });
  const oneTime = shopFromMerchant(null);
  it('needs STAGED, a RENT order and a capable client', () => {
    expect(planForNewOrder({ shop: staged, orderType: 'RENT', capable: true, canEditItems: true, input: {} })).not.toBeNull();
    expect(planForNewOrder({ shop: oneTime, orderType: 'RENT', capable: true, canEditItems: true, input: {} })).toBeNull();
    expect(planForNewOrder({ shop: staged, orderType: 'RENT', capable: false, canEditItems: true, input: {} })).toBeNull();
    expect(planForNewOrder({ shop: staged, orderType: 'SALE', capable: true, canEditItems: true, input: {} })).toBeNull();
  });
});

describe('old-client money never counts stage rows', () => {
  it('computeOrderBalance: stage rows are not PICKUP, balance follows depositAmount', () => {
    const balance = computeOrderBalance({
      orderType: 'RENT', status: 'RESERVED', totalAmount: 12_000_000, depositAmount: 3_600_000, securityDeposit: 0,
      payments: [{ amount: 3_600_000, status: 'COMPLETED', notes: 'INSTALLMENT' }],
    });
    expect(balance.amountDue).toBe(8_400_000);
  });
});

describe('loadInstallmentReminders', () => {
  const makeClient = (orders: any[]) => ({
    outlet: { findFirst: jest.fn(async () => ({ merchantId: 2 })) },
    merchant: { findUnique: jest.fn(async () => ({ currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', settings: null })) },
    $queryRaw: jest.fn(async () => orders.map((o) => ({ id: o.id }))),
    order: { findMany: jest.fn(async () => orders) },
  });
  const row = (id: number, plan: any, payments: any[] = [], extra: any = {}) =>
    ({ ...planOrder({ id, orderNumber: String(100000 + id), depositPlan: plan }), payments, customer: { firstName: 'An', lastName: 'Nguyễn' }, ...extra });

  it('groups unpaid explicit stages by due day (Vietnam days) and counts late days; rest and paid stages are not listed', async () => {
    const plan = planOrder().depositPlan;
    const orders = [
      row(1, plan, [], { createdAt: new Date('2026-10-20T03:00:00Z') }), // i1 due 20/10 (late 5), i2 due 13/11
      row(2, plan, [stagePayment('i1', 3_600_000)], { id: 2, createdAt: new Date('2026-10-25T03:00:00Z'), pickupPlanAt: new Date('2026-10-26T03:00:00Z') }), // i2 due 25/10 = today
      row(3, plan, [stagePayment('i1', 3_600_000)], { id: 3, pickupPlanAt: new Date('2026-10-27T03:00:00Z') }), // i2 due 26/10 = tomorrow
    ];
    const out = await loadInstallmentReminders(makeClient(orders), [1], '2026-10-25');
    expect(out.installmentsOverdue.orders.map((r) => [r.orderId, r.key, r.lateDays])).toEqual([[1, 'i1', 5]]);
    expect(out.installmentsDue.orders.map((r) => [r.orderId, r.key, r.dueDateKey])).toEqual([[2, 'i2', '2026-10-25']]);
    expect(out.installmentsDueTomorrow.orders.map((r) => [r.orderId, r.key])).toEqual([[3, 'i2']]);
    expect(out.installmentsDue.orders[0]).toMatchObject({ customerName: 'An Nguyễn', amount: 4_800_000, remaining: 4_800_000 });
  });

  it('no outlets: empty groups, no query', async () => {
    const client = makeClient([]);
    const out = await loadInstallmentReminders(client, [], '2026-10-25');
    expect(out.installmentsDue.count).toBe(0);
    expect(client.order.findMany).not.toHaveBeenCalled();
  });
});
