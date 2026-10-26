/**
 * #1199 staged deposits: effectivePlan golden numbers. Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import {
  applyTemplate,
  collectedInStages,
  depositPlanSchema,
  effectivePlan,
  installmentStatus,
  installmentSummary,
  parseDepositPlan,
  percentOf,
  pickTemplate,
  planBaseTotal,
  planOverflow,
  readPaymentSettings,
  recalcAfterTotalChange,
  roundMoney,
  unpaidExplicitStages,
  DEFAULT_DEPOSIT_TEMPLATE,
} from '../packages/utils/src/core/deposit-plan';

const VND = { currency: 'VND', timezone: 'Asia/Ho_Chi_Minh' };
const NOW = new Date('2026-10-25T05:00:00Z'); // 25/10 12:00 in Vietnam

const plan3040 = {
  v: 1,
  items: [
    { key: 'i1', label: 'Cọc giữ chỗ', type: 'PERCENT', value: 30, dueRule: { kind: 'ON_CREATE' } },
    { key: 'i2', label: 'Cọc lần 2', type: 'PERCENT', value: 40, dueRule: { kind: 'BEFORE_PICKUP', days: 1 } },
  ],
};

const order = (extra: Record<string, unknown> = {}) => ({
  status: 'RESERVED',
  totalAmount: 12_000_000,
  depositAmount: 0,
  depositPlan: plan3040,
  createdAt: '2026-10-25T03:00:00Z',
  pickupPlanAt: '2026-11-14T03:00:00Z',
  payments: [],
  ...extra,
});

const pay = (key: string, amount: number, at = '2026-10-25T03:00:00Z', extra = {}) => ({
  amount,
  status: 'COMPLETED',
  notes: 'INSTALLMENT',
  installmentKey: key,
  processedAt: at,
  ...extra,
});

describe('effectivePlan golden (12.000.000, 30% / 40% / rest)', () => {
  it('splits 3.600.000 / 4.800.000 / 3.600.000 and always adds up to the total', () => {
    const stages = effectivePlan(order(), VND, { now: NOW });
    expect(stages.map((s) => [s.key, s.amount])).toEqual([
      ['i1', 3_600_000],
      ['i2', 4_800_000],
      ['rest', 3_600_000],
    ]);
    expect(stages.reduce((s, x) => s + x.amount, 0)).toBe(12_000_000);
    expect(stages.map((s) => s.percent)).toEqual([30, 40, 30]);
  });

  it('due days are Vietnam civil days (stage 2 is the day before pickup)', () => {
    const stages = effectivePlan(order(), VND, { now: NOW });
    expect(stages.map((s) => s.dueDateKey)).toEqual(['2026-10-25', '2026-11-13', '2026-11-14']);
    expect(stages.map((s) => s.status)).toEqual(['DUE_TODAY', 'UPCOMING', 'UPCOMING']);
  });

  it('a collected stage is locked to the collected amount and rest absorbs the difference', () => {
    const stages = effectivePlan(order({ payments: [pay('i1', 3_000_000)] }), VND, { now: NOW });
    expect(stages[0]).toMatchObject({ amount: 3_000_000, plannedAmount: 3_600_000, paidAmount: 3_000_000, status: 'PARTIAL', remaining: 0 });
    expect(stages[2].amount).toBe(4_200_000);
    expect(stages.reduce((s, x) => s + x.amount, 0)).toBe(12_000_000);
  });

  it('full collection is PAID with collectedAt', () => {
    const stages = effectivePlan(order({ payments: [pay('i1', 3_600_000)] }), VND, { now: NOW });
    expect(stages[0]).toMatchObject({ status: 'PAID', paidAmount: 3_600_000, collectedAt: '2026-10-25T03:00:00.000Z' });
  });

  it('ignores refunded / cancelled rows and rows of other kinds', () => {
    const stages = effectivePlan(
      order({
        payments: [
          pay('i1', 3_600_000, undefined, { status: 'CANCELLED' }),
          { amount: 5, status: 'COMPLETED', notes: 'PICKUP' },
        ],
      }),
      VND,
      { now: NOW }
    );
    expect(stages[0].paidAmount).toBe(0);
  });

  it('OVERDUE the day after the due day; cancelled order voids unpaid stages but keeps paid ones', () => {
    const later = new Date('2026-11-16T05:00:00Z');
    expect(effectivePlan(order(), VND, { now: later }).map((s) => s.status)).toEqual(['OVERDUE', 'OVERDUE', 'OVERDUE']);
    const cancelled = effectivePlan(order({ status: 'CANCELLED', payments: [pay('i1', 3_600_000)] }), VND, { now: later });
    expect(cancelled.map((s) => s.status)).toEqual(['PAID', 'VOID', 'VOID']);
  });

  it('after hand-over rest counts as taken at pickup and the plan is measured on pickupTotalAmount (#505)', () => {
    const stages = effectivePlan(
      order({ status: 'PICKUPED', pickedUpAt: '2026-11-14T03:00:00Z', totalAmount: 12_600_000, pickupTotalAmount: 12_000_000 }),
      VND,
      { now: NOW }
    );
    expect(stages.map((s) => s.amount)).toEqual([3_600_000, 4_800_000, 3_600_000]);
    expect(stages[2]).toMatchObject({ status: 'PAID', paidAmount: 3_600_000 });
  });

  it('amountOverride replaces the percentage and the others recompute', () => {
    const edited = { ...plan3040, items: [{ ...plan3040.items[0], amountOverride: 1_000_000 }, plan3040.items[1]] };
    const stages = effectivePlan(order({ depositPlan: edited }), VND, { now: NOW });
    expect(stages.map((s) => s.amount)).toEqual([1_000_000, 4_800_000, 6_200_000]);
  });

  it('dueDateKey wins over dueRule', () => {
    const edited = { ...plan3040, items: [{ ...plan3040.items[0], dueDateKey: '2026-10-30' }, plan3040.items[1]] };
    expect(effectivePlan(order({ depositPlan: edited }), VND, { now: NOW })[0].dueDateKey).toBe('2026-10-30');
  });

  it('100% explicit leaves rest at 0; over 100% is reported as overflow', () => {
    const full = { v: 1, items: [{ key: 'i1', label: 'Full', type: 'PERCENT', value: 100, dueRule: { kind: 'ON_CREATE' } }] };
    expect(effectivePlan(order({ depositPlan: full }), VND, { now: NOW }).map((s) => s.amount)).toEqual([12_000_000, 0]);
    const over = { v: 1, items: [{ ...full.items[0], value: 60, amountOverride: 13_000_000 }] };
    expect(planOverflow(order({ depositPlan: over }), VND, { now: NOW })).toBe(1_000_000);
  });
});

describe('rounding by currency minor unit', () => {
  it('VND rounds to 1 dong and the stages still add up', () => {
    const stages = effectivePlan(order({ totalAmount: 10_000_001, depositPlan: { v: 1, items: [plan3040.items[0], plan3040.items[1]] } }), VND, { now: NOW });
    expect(stages.map((s) => s.amount)).toEqual([3_000_000, 4_000_000, 3_000_001]);
    expect(stages.reduce((s, x) => s + x.amount, 0)).toBe(10_000_001);
  });

  it('USD rounds to 0.01', () => {
    const stages = effectivePlan(order({ totalAmount: 100.01 }), { currency: 'USD', timezone: 'Asia/Ho_Chi_Minh' }, { now: NOW });
    expect(stages.map((s) => s.amount)).toEqual([30, 40, 30.01]);
    expect(percentOf(100.01, 33.33, 'USD')).toBe(33.33);
    expect(roundMoney(0.005 + 1, 'USD')).toBe(1.01);
  });
});

describe('legacy order (no plan) = today', () => {
  it('has deposit and rest stages', () => {
    const stages = effectivePlan(order({ depositPlan: null, depositAmount: 2_000_000 }), VND, { now: NOW });
    expect(stages.map((s) => [s.key, s.amount, s.status])).toEqual([
      ['deposit', 2_000_000, 'PAID'],
      ['rest', 10_000_000, 'UPCOMING'],
    ]);
  });
  it('no deposit gives just rest', () => {
    expect(effectivePlan(order({ depositPlan: null }), VND, { now: NOW }).map((s) => s.key)).toEqual(['rest']);
  });
});

describe('date boundaries', () => {
  it('16:59:59Z and 17:00:00Z fall on different Vietnam days', () => {
    const a = effectivePlan(order({ createdAt: '2026-10-25T16:59:59Z' }), VND, { now: NOW })[0].dueDateKey;
    const b = effectivePlan(order({ createdAt: '2026-10-25T17:00:00Z' }), VND, { now: NOW })[0].dueDateKey;
    expect([a, b]).toEqual(['2026-10-25', '2026-10-26']);
  });
  it('BEFORE_PICKUP crosses the month end', () => {
    const plan = { v: 1, items: [{ key: 'i1', label: 'x', type: 'PERCENT', value: 10, dueRule: { kind: 'BEFORE_PICKUP', days: 3 } }] };
    const stages = effectivePlan(order({ depositPlan: plan, pickupPlanAt: '2026-12-01T03:00:00Z' }), VND, { now: NOW });
    expect(stages[0].dueDateKey).toBe('2026-11-28');
  });
  it('00:30 Vietnam time (17:30Z) is the next day', () => {
    expect(installmentStatus('2026-11-13', '2026-11-13')).toBe('DUE_TODAY');
    const at = new Date('2026-11-12T17:30:00Z');
    expect(effectivePlan(order(), VND, { now: at })[1].status).toBe('DUE_TODAY');
  });
  it('created and picked up the same day: rest is due the same day', () => {
    const stages = effectivePlan(order({ pickupPlanAt: '2026-10-25T03:00:00Z' }), VND, { now: NOW });
    expect(stages[2].dueDateKey).toBe('2026-10-25');
  });
});

describe('total changes', () => {
  it('unpaid stages follow the percentage, collected stages keep their amount', () => {
    const o = order({ payments: [pay('i1', 3_600_000)] });
    const { stages, overpaid } = recalcAfterTotalChange(o, 10_000_000, VND, { now: NOW });
    expect(overpaid).toBe(false);
    expect(stages.map((s) => s.amount)).toEqual([3_600_000, 4_000_000, 2_400_000]);
  });
  it('a total below what is collected is overpaid', () => {
    const o = order({ payments: [pay('i1', 3_600_000)] });
    expect(recalcAfterTotalChange(o, 3_000_000, VND, { now: NOW }).overpaid).toBe(true);
    expect(collectedInStages(o)).toBe(3_600_000);
  });
});

describe('delivery check and summary', () => {
  it('explicit unpaid stages block; rest does not; collected clears', () => {
    const none = unpaidExplicitStages(effectivePlan(order(), VND, { now: NOW }));
    expect(none.map((s) => s.key)).toEqual(['i1', 'i2']);
    const paid = unpaidExplicitStages(effectivePlan(order({ payments: [pay('i1', 3_600_000), pay('i2', 4_800_000)] }), VND, { now: NOW }));
    expect(paid).toEqual([]);
  });
  it('summary', () => {
    const stages = effectivePlan(order({ payments: [pay('i1', 3_600_000)] }), VND, { now: NOW });
    expect(installmentSummary(stages, 12_000_000)).toMatchObject({ planned: 12_000_000, collected: 3_600_000, remaining: 8_400_000, percentCollected: 30 });
  });
});

describe('plan JSON', () => {
  it('zod accepts the template plan and rejects >100%, unknown type, rest key', () => {
    expect(depositPlanSchema.safeParse(plan3040).success).toBe(true);
    expect(depositPlanSchema.safeParse({ ...plan3040, items: [{ ...plan3040.items[0], value: 70 }, { ...plan3040.items[1], value: 40 }] }).success).toBe(false);
    expect(depositPlanSchema.safeParse({ v: 1, items: [{ ...plan3040.items[0], type: 'FIXED' }] }).success).toBe(false);
    expect(depositPlanSchema.safeParse({ v: 1, items: [{ ...plan3040.items[0], key: 'rest' }] }).success).toBe(false);
  });
  it('reading skips unknown types and never throws', () => {
    expect(parseDepositPlan({ v: 2, items: [{ key: 'i1', type: 'FIXED', value: 5 }, plan3040.items[0]] })?.items).toHaveLength(1);
    expect(parseDepositPlan('not json')).toBeNull();
    expect(parseDepositPlan(null)).toBeNull();
  });
  it('settings default to ONE_TIME for everyone', () => {
    expect(readPaymentSettings(null).depositMode).toBe('ONE_TIME');
    expect(readPaymentSettings({ blockPricing: { oldApps: 'block' } }).depositMode).toBe('ONE_TIME');
    expect(readPaymentSettings({ payment: { depositMode: 'STAGED' } }).depositMode).toBe('STAGED');
    expect(readPaymentSettings({ payment: { depositMode: 'WAT' } }).depositMode).toBe('ONE_TIME');
  });
  it('template numbering and default pick', () => {
    const settings = readPaymentSettings({ payment: { depositMode: 'STAGED' } });
    const template = pickTemplate(settings, null);
    expect(template).toBe(DEFAULT_DEPOSIT_TEMPLATE);
    expect(applyTemplate(template.items, 'policy').items.map((i) => i.key)).toEqual(['i1']);
  });
});

describe('#1219 locked stage status after the total changes', () => {
  // The collect route records the stage amount at the moment of collection in the payment metadata
  const metaAt = (plannedAmount: number) => ({ metadata: JSON.stringify({ kind: 'COLLECT', plannedAmount }) });

  it('12M -> 13M after stage 1 was collected in full: stage 1 stays PAID (locked, nothing left to collect)', () => {
    const o = order({ totalAmount: 13_000_000, payments: [pay('i1', 3_600_000, undefined, metaAt(3_600_000))] });
    const stages = effectivePlan(o, VND, { now: NOW });
    expect(stages[0]).toMatchObject({ amount: 3_600_000, plannedAmount: 3_900_000, paidAmount: 3_600_000, remaining: 0, status: 'PAID' });
    expect(stages.map((s) => s.amount)).toEqual([3_600_000, 5_200_000, 4_200_000]);
    expect(stages.reduce((s, x) => s + x.amount, 0)).toBe(13_000_000);
  });

  it('12M -> 11M after stage 1 was collected in full: still PAID', () => {
    const o = order({ totalAmount: 11_000_000, payments: [pay('i1', 3_600_000, undefined, metaAt(3_600_000))] });
    expect(effectivePlan(o, VND, { now: NOW })[0]).toMatchObject({ amount: 3_600_000, remaining: 0, status: 'PAID' });
  });

  it('a stage collected short stays PARTIAL, also after the total changed (spec: thu thiếu -> PARTIAL)', () => {
    const o = order({ totalAmount: 13_000_000, payments: [pay('i1', 3_000_000, undefined, metaAt(3_600_000))] });
    expect(effectivePlan(o, VND, { now: NOW })[0]).toMatchObject({ amount: 3_000_000, remaining: 0, status: 'PARTIAL' });
  });

  it('nothing collected: the stage follows the new total and keeps its due status', () => {
    const stages = effectivePlan(order({ totalAmount: 13_000_000 }), VND, { now: NOW });
    expect(stages[0]).toMatchObject({ amount: 3_900_000, paidAmount: 0, status: 'DUE_TODAY' });
    expect(stages[1].status).toBe('UPCOMING');
  });

  it('a payment row without the recorded amount (taken before the fix) keeps comparing with the current stage amount', () => {
    const o = order({ totalAmount: 13_000_000, payments: [pay('i1', 3_600_000)] });
    expect(effectivePlan(o, VND, { now: NOW })[0].status).toBe('PARTIAL');
  });

  it('metadata that is not JSON or has no usable number is ignored', () => {
    for (const metadata of ['not json', '{}', JSON.stringify({ plannedAmount: 'x' }), JSON.stringify({ plannedAmount: -5 }), null]) {
      const o = order({ totalAmount: 13_000_000, payments: [pay('i1', 3_600_000, undefined, { metadata })] });
      expect(effectivePlan(o, VND, { now: NOW })[0].status).toBe('PARTIAL');
    }
  });
});

describe('#1219 revert to RESERVED then edit the total', () => {
  // revert restores status RESERVED and pickedUpAt = null but leaves the old pickupTotalAmount in the row
  it('planBaseTotal measures the new total when the order is RESERVED again (pickedUpAt null, stale pickupTotalAmount)', () => {
    const o = order({ totalAmount: 15_000_000, pickupTotalAmount: 12_000_000, pickedUpAt: null });
    expect(planBaseTotal(o)).toBe(15_000_000);
    const stages = effectivePlan(o, VND, { now: NOW });
    expect(stages.map((s) => s.amount)).toEqual([4_500_000, 6_000_000, 4_500_000]);
    expect(installmentSummary(stages, 15_000_000).planned).toBe(15_000_000);
  });

  it('after hand-over the stages are still measured against what was collected then', () => {
    const o = order({ status: 'PICKUPED', totalAmount: 15_000_000, pickupTotalAmount: 12_000_000, pickedUpAt: '2026-11-14T03:00:00Z' });
    expect(planBaseTotal(o)).toBe(12_000_000);
  });
});
