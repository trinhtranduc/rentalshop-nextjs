/**
 * #1230: every Payment written for a deposit stage records `plannedAmount` (the stage amount at collection), also the
 * one taken with the booking (`POST /api/orders` + `collectFirstNow`). Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { recordInstallmentPayment } from '../apps/api/lib/installments';
import { effectivePlan } from '../packages/utils/src/core/deposit-plan';

const VND = { currency: 'VND', timezone: 'Asia/Ho_Chi_Minh' };
const NOW = new Date('2026-10-25T05:00:00Z');
const plan3040 = {
  v: 1,
  items: [
    { key: 'i1', label: 'Cọc giữ chỗ', type: 'PERCENT', value: 30, dueRule: { kind: 'ON_CREATE' } },
    { key: 'i2', label: 'Cọc lần 2', type: 'PERCENT', value: 40, dueRule: { kind: 'BEFORE_PICKUP', days: 1 } },
  ],
};
const draft = (totalAmount: number, payments: any[] = []) => ({
  status: 'RESERVED',
  totalAmount,
  depositAmount: 0,
  depositPlan: plan3040,
  createdAt: '2026-10-25T03:00:00Z',
  pickupPlanAt: '2026-11-14T03:00:00Z',
  payments,
});

/** A fake transaction: keeps what the route would have written, shaped like the rows `effectivePlan` reads */
function fakeTx() {
  const rows: any[] = [];
  return {
    rows,
    tx: { payment: { create: async ({ data }: any) => { rows.push({ ...data }); return rows[rows.length - 1]; } } },
  };
}

/** What the create-order route does: stage 1 of the draft order, planned amount from the plan, one record */
async function createWithFirstStageCollected(source: 'CREATE_ORDER' | 'INSTALLMENT', paid?: number) {
  const first = effectivePlan(draft(12_000_000), VND, { now: NOW })[0];
  const { tx, rows } = fakeTx();
  await recordInstallmentPayment(tx, {
    orderId: 1,
    merchantId: 7,
    stage: { key: first.key, plannedAmount: first.plannedAmount },
    amount: paid ?? first.plannedAmount,
    currency: 'VND',
    method: 'CASH',
    reference: 'ref-12345678',
    userId: 3,
    source,
  });
  return rows;
}

describe('#1230 recordInstallmentPayment', () => {
  it('create-order stage 1 records plannedAmount = the stage 1 amount (3.600.000)', async () => {
    const [row] = await createWithFirstStageCollected('CREATE_ORDER');
    expect(JSON.parse(row.metadata)).toEqual({ kind: 'COLLECT', source: 'CREATE_ORDER', plannedAmount: 3_600_000 });
    expect(row).toMatchObject({ notes: 'INSTALLMENT', installmentKey: 'i1', status: 'COMPLETED', amount: 3_600_000, processedBy: '3' });
  });

  it('collect route keeps collectedOn and plannedAmount', async () => {
    const { tx, rows } = fakeTx();
    await recordInstallmentPayment(tx, {
      orderId: 1, merchantId: 7, stage: { key: 'i2', plannedAmount: 4_800_000 }, amount: 4_800_000, currency: 'VND',
      method: 'TRANSFER', reference: 'ref-87654321', userId: 3, source: 'INSTALLMENT', collectedOn: '2026-10-25', description: 'note',
    });
    expect(JSON.parse(rows[0].metadata)).toEqual({ kind: 'COLLECT', source: 'INSTALLMENT', collectedOn: '2026-10-25', plannedAmount: 4_800_000 });
    expect(rows[0].description).toBe('note');
  });

  it('create with stage 1 collected, then total 12M -> 13M: i1 PAID, i2 / rest follow the new total', async () => {
    const rows = await createWithFirstStageCollected('CREATE_ORDER');
    const stages = effectivePlan(draft(13_000_000, rows), VND, { now: NOW });
    expect(stages[0]).toMatchObject({ amount: 3_600_000, paidAmount: 3_600_000, remaining: 0, status: 'PAID' });
    expect(stages.map((s) => s.amount)).toEqual([3_600_000, 5_200_000, 4_200_000]);
    expect(stages.reduce((s, x) => s + x.amount, 0)).toBe(13_000_000);
  });

  it('create with stage 1 collected, then total 12M -> 11M: still PAID', async () => {
    const rows = await createWithFirstStageCollected('CREATE_ORDER');
    expect(effectivePlan(draft(11_000_000, rows), VND, { now: NOW })[0].status).toBe('PAID');
  });

  it('collected short stays PARTIAL, also after the total changed', async () => {
    const rows = await createWithFirstStageCollected('INSTALLMENT', 3_000_000);
    expect(effectivePlan(draft(12_000_000, rows), VND, { now: NOW })[0].status).toBe('PARTIAL');
    expect(effectivePlan(draft(13_000_000, rows), VND, { now: NOW })[0].status).toBe('PARTIAL');
  });

  it('a row written before the fix (no plannedAmount) keeps the old behaviour', () => {
    const old = { amount: 3_600_000, status: 'COMPLETED', notes: 'INSTALLMENT', installmentKey: 'i1', processedAt: '2026-10-25T03:00:00Z', metadata: JSON.stringify({ kind: 'COLLECT', source: 'CREATE_ORDER' }) };
    expect(effectivePlan(draft(13_000_000, [old]), VND, { now: NOW })[0].status).toBe('PARTIAL');
    expect(effectivePlan(draft(12_000_000, [old]), VND, { now: NOW })[0].status).toBe('PAID');
  });
});
