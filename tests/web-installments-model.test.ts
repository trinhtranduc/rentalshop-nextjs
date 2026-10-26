/**
 * #1199 web: deposit stages ("Thu cọc theo giai đoạn"). The pure model behind the settings screen, the create-order
 * stage list, the order detail card and dialogs, the dashboard cards and the list badge.
 * Golden: an order of 12.000.000 split 30 / 40 / rest gives 3.600.000 / 4.800.000 / 3.600.000.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/deposit-plan') as object),
}));
import { describe, expect, it } from '@jest/globals';
import {
  buildPaymentPlan,
  cancelView,
  canEditPlan,
  canVoidStage,
  chipTone,
  collectProblem,
  defaultTemplateOf,
  draftsFromTemplate,
  dueOptionsFor,
  dueRuleText,
  dueRuleValue,
  dueSoonRows,
  dueTodayRows,
  editPayload,
  editProblem,
  editRowsOf,
  firstStageToCollect,
  hasPlan,
  isStagedMode,
  isStaffRole,
  newReference,
  nextStageToCollect,
  paidBadgePercent,
  parseDueValue,
  percentCollected,
  percentSum,
  previewEdit,
  previewStages,
  removeTemplate,
  restPercent,
  setDefaultTemplate,
  shortDay,
  showsReminders,
  stageNumberOfKey,
  templateProblem,
  templateSummary,
  templatesOf,
  unpaidAtPickup,
  type OrderInstallment,
  type PlanOrderLike,
} from '../apps/client/app/installments/installments-model';
import { DEFAULT_DEPOSIT_TEMPLATE } from '../packages/utils/src/core/deposit-plan';

const t = (key: string, v?: Record<string, string | number>) => (v ? `${key}:${JSON.stringify(v)}` : key);

const THREE = [
  { label: 'Cọc giữ chỗ', value: 30, dueRule: { kind: 'ON_CREATE' as const } },
  { label: 'Cọc trước ngày lấy áo', value: 40, dueRule: { kind: 'BEFORE_PICKUP' as const, days: 1 } },
];
// Created 25/10 (Vietnam), pick-up 14/11
const NOW = new Date('2026-10-25T03:00:00Z');
const PICKUP = '2026-11-13T17:00:00.000Z';
const RETURN = '2026-11-16T17:00:00.000Z';

describe('settings: mode and templates', () => {
  it('only an explicit STAGED is staged mode; no answer, ONE_TIME or garbage is not', () => {
    expect(isStagedMode({ depositMode: 'STAGED' })).toBe(true);
    expect(isStagedMode({ depositMode: 'ONE_TIME' })).toBe(false);
    expect(isStagedMode(null)).toBe(false);
    expect(isStagedMode({})).toBe(false);
    expect(isStagedMode({ depositMode: 'staged' })).toBe(false);
  });

  it('shows the built-in template while the shop has none, and the shop templates once it has', () => {
    expect(templatesOf({ templates: [], defaultTemplate: DEFAULT_DEPOSIT_TEMPLATE })).toEqual([DEFAULT_DEPOSIT_TEMPLATE]);
    const own = [{ id: 'a', name: 'A', items: THREE.map((i) => ({ ...i, type: 'PERCENT' as const })) }];
    expect(templatesOf({ templates: own as never, defaultTemplate: DEFAULT_DEPOSIT_TEMPLATE })).toEqual(own);
    expect(defaultTemplateOf({ templates: own as never })?.id).toBe('a');
    expect(defaultTemplateOf({ templates: [], defaultTemplate: DEFAULT_DEPOSIT_TEMPLATE })?.id).toBe('default');
    expect(templatesOf(null)).toEqual([]);
  });

  it('percent sum, the automatic rest and the template problems', () => {
    expect(percentSum(THREE)).toBe(70);
    expect(restPercent(THREE)).toBe(30);
    expect(restPercent([{ value: 100 }])).toBe(0);
    const ok = { id: 'a', name: 'A', items: THREE.map((i) => ({ ...i, type: 'PERCENT' as const })) };
    expect(templateProblem(ok)).toBeNull();
    expect(templateProblem({ ...ok, name: ' ' })).toBe('name');
    expect(templateProblem({ ...ok, items: [] })).toBe('items');
    expect(templateProblem({ ...ok, items: ok.items.map((i) => ({ ...i, label: '' })) })).toBe('label');
    expect(templateProblem({ ...ok, items: [{ ...ok.items[0], value: 0 }] })).toBe('percent');
    expect(templateProblem({ ...ok, items: [{ ...ok.items[0], value: 60 }, { ...ok.items[1], value: 50 }] })).toBe('over');
  });

  it('one default at a time; deleting the default hands it to the first', () => {
    const a = { id: 'a', name: 'A', isDefault: true, items: [] as never[] };
    const b = { id: 'b', name: 'B', items: [] as never[] };
    const c = { id: 'c', name: 'C', items: [] as never[] };
    const next = setDefaultTemplate([a, b, c] as never, 'b');
    expect(next.filter((x) => x.isDefault).map((x) => x.id)).toEqual(['b']);
    const left = removeTemplate(next, 'b');
    expect(left.map((x) => x.id)).toEqual(['a', 'c']);
    expect(left.filter((x) => x.isDefault).map((x) => x.id)).toEqual(['a']);
    expect(removeTemplate([a] as never, 'a')).toEqual([]);
  });

  it('due rules round-trip through the select value and read as text', () => {
    expect(dueRuleValue({ kind: 'ON_CREATE' })).toBe('ON_CREATE');
    expect(parseDueValue('BEFORE_PICKUP:3')).toEqual({ kind: 'BEFORE_PICKUP', days: 3 });
    expect(parseDueValue('AFTER_CREATE:7')).toEqual({ kind: 'AFTER_CREATE', days: 7 });
    expect(parseDueValue('ON_CREATE')).toEqual({ kind: 'ON_CREATE' });
    expect(parseDueValue('BEFORE_PICKUP:9999')).toEqual({ kind: 'BEFORE_PICKUP', days: 365 });
    expect(dueRuleText({ kind: 'BEFORE_PICKUP', days: 1 }, t)).toBe('due.beforePickup:{"days":1}');
    // A rule outside the presets stays selectable
    expect(dueOptionsFor({ kind: 'BEFORE_PICKUP', days: 5 }).map(dueRuleValue)).toContain('BEFORE_PICKUP:5');
    expect(dueOptionsFor({ kind: 'BEFORE_PICKUP', days: 3 }).length).toBe(dueOptionsFor(null).length);
    expect(templateSummary({ id: 'a', name: 'A', items: THREE.map((i) => ({ ...i, type: 'PERCENT' as const })) }, t)).toContain('restShort');
  });
});

describe('create order: stage list and the paymentPlan body', () => {
  const items = draftsFromTemplate({ id: 'a', name: 'A', items: THREE.map((i) => ({ ...i, type: 'PERCENT' as const })) });

  it('golden: 12.000.000 with 30 / 40 / rest', () => {
    const stages = previewStages({ total: 12_000_000, items, pickupPlanAt: PICKUP, returnPlanAt: RETURN, currency: 'VND', now: NOW });
    expect(stages.map((s) => s.amount)).toEqual([3_600_000, 4_800_000, 3_600_000]);
    expect(stages.map((s) => s.percent)).toEqual([30, 40, 30]);
    expect(stages.map((s) => s.dueDateKey)).toEqual(['2026-10-25', '2026-11-13', '2026-11-14']);
    expect(stages[2].isRest).toBe(true);
    expect(stages.reduce((s, x) => s + x.amount, 0)).toBe(12_000_000);
  });

  it('changing a percentage recomputes the amounts and the rest', () => {
    const edited = items.map((i, n) => (n === 0 ? { ...i, value: 50 } : i));
    const stages = previewStages({ total: 12_000_000, items: edited, pickupPlanAt: PICKUP, currency: 'VND', now: NOW });
    expect(stages.map((s) => s.amount)).toEqual([6_000_000, 4_800_000, 1_200_000]);
  });

  it('the built-in template (30% then the rest) works for a shop that set none', () => {
    const only = draftsFromTemplate(DEFAULT_DEPOSIT_TEMPLATE);
    const stages = previewStages({ total: 700_000, items: only, pickupPlanAt: PICKUP, currency: 'VND', now: NOW });
    expect(stages.map((s) => s.amount)).toEqual([210_000, 490_000]);
    expect(firstStageToCollect(stages)?.plannedAmount).toBe(210_000);
  });

  it('nothing to collect now when the first stage is the rest or worth nothing', () => {
    expect(firstStageToCollect([])).toBeNull();
    const stages = previewStages({ total: 0, items, pickupPlanAt: PICKUP, currency: 'VND', now: NOW });
    expect(firstStageToCollect(stages)).toBeNull();
  });

  it('paymentPlan: the template id alone, edited items, collect first or not', () => {
    expect(buildPaymentPlan({ templateId: 'a', items, edited: false, collectNow: null })).toEqual({ templateId: 'a' });
    expect(buildPaymentPlan({ templateId: 'a', items, edited: false, collectNow: { method: 'CASH', reference: 'stage-12345678' } })).toEqual({
      templateId: 'a',
      collectFirstNow: { method: 'CASH', reference: 'stage-12345678' },
    });
    const withItems = buildPaymentPlan({ templateId: 'a', items, edited: true, collectNow: null });
    expect(withItems.templateId).toBeUndefined();
    expect(withItems.items?.map((i) => i.value)).toEqual([30, 40]);
    expect(withItems.items?.every((i) => i.type === 'PERCENT')).toBe(true);
    expect(buildPaymentPlan({ templateId: null, items: [], edited: false, collectNow: null })).toEqual({});
  });

  it('a reference is long enough for the API (8 to 100 chars) and different every time', () => {
    const a = newReference();
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(a.length).toBeLessThanOrEqual(100);
    expect(newReference()).not.toBe(a);
  });
});

const stage = (patch: Partial<OrderInstallment>): OrderInstallment => ({
  key: 'i1',
  label: 'Cọc giữ chỗ',
  percent: 30,
  amount: 3_600_000,
  plannedAmount: 3_600_000,
  remaining: 0,
  dueDateKey: '2026-10-25',
  status: 'PAID',
  collectedAt: '2026-10-25T03:00:00.000Z',
  paidAmount: 3_600_000,
  ...patch,
});

const order = (patch: Partial<PlanOrderLike> = {}): PlanOrderLike & { id: number } => ({
  id: 1,
  orderType: 'RENT',
  status: 'RESERVED',
  totalAmount: 12_000_000,
  depositAmount: 3_600_000,
  hasDepositPlan: true,
  createdAt: '2026-10-25T03:00:00.000Z',
  pickupPlanAt: PICKUP,
  returnPlanAt: RETURN,
  installments: [
    stage({}),
    stage({ key: 'i2', label: 'Cọc trước ngày lấy áo', percent: 40, amount: 4_800_000, plannedAmount: 4_800_000, remaining: 4_800_000, dueDateKey: '2026-11-13', status: 'UPCOMING', collectedAt: null, paidAmount: 0 }),
    stage({ key: 'rest', label: 'Phần còn lại, thu khi giao', percent: 30, amount: 3_600_000, plannedAmount: 3_600_000, remaining: 3_600_000, dueDateKey: '2026-11-14', status: 'UPCOMING', collectedAt: null, paidAmount: 0 }),
  ],
  installmentSummary: { percentCollected: 30, collected: 3_600_000, remaining: 8_400_000 },
  ...patch,
});

describe('order detail', () => {
  it('shows the card only for an order with a plan', () => {
    expect(hasPlan(order())).toBe(true);
    expect(hasPlan(order({ hasDepositPlan: false }))).toBe(false);
    expect(hasPlan(order({ orderType: 'SALE' }))).toBe(false);
    expect(hasPlan(order({ installments: [] }))).toBe(false);
    // an order of a ONE_TIME shop comes with installments[] (deposit + rest) but no plan: no card
    expect(hasPlan({ ...order(), hasDepositPlan: false })).toBe(false);
    expect(hasPlan(null)).toBe(false);
    expect(percentCollected(order())).toBe(30);
  });

  it('the next stage to collect is the first explicit one owing money; never the rest, never when closed', () => {
    expect(nextStageToCollect(order())?.key).toBe('i2');
    expect(nextStageToCollect(order({ status: 'PICKUPED' }))).toBeNull();
    expect(nextStageToCollect(order({ status: 'CANCELLED' }))).toBeNull();
    const paid = order();
    paid.installments = paid.installments!.map((s) => (s.key === 'i2' ? { ...s, status: 'PAID', paidAmount: 4_800_000, remaining: 0 } : s));
    expect(nextStageToCollect(paid)).toBeNull();
  });

  it('chip tones', () => {
    expect(chipTone('PAID')).toBe('good');
    expect(chipTone('OVERDUE')).toBe('bad');
    expect(chipTone('DUE_TODAY')).toBe('warn');
    expect(chipTone('PARTIAL')).toBe('warn');
    expect(chipTone('UPCOMING')).toBe('info');
    expect(chipTone('VOID')).toBe('muted');
  });

  it('hand-over: stages nobody collected block it, the rest does not', () => {
    expect(unpaidAtPickup(order()).map((s) => s.key)).toEqual(['i2']);
    expect(unpaidAtPickup(order({ status: 'PICKUPED' }))).toEqual([]);
    expect(unpaidAtPickup(order({ hasDepositPlan: false }))).toEqual([]);
    const allPaid = order();
    allPaid.installments = allPaid.installments!.map((s) => (s.key === 'i2' ? { ...s, paidAmount: 4_800_000, status: 'PAID', remaining: 0 } : s));
    expect(unpaidAtPickup(allPaid)).toEqual([]);
  });

  it('who edits the plan and who cancels a collection', () => {
    expect(canEditPlan(order(), 'MERCHANT')).toBe(true);
    expect(canEditPlan(order(), 'OUTLET_ADMIN')).toBe(true);
    expect(canEditPlan(order(), 'OUTLET_STAFF')).toBe(false);
    expect(canEditPlan(order(), 'OUTLET_INVENTORY')).toBe(false);
    expect(canEditPlan(order({ status: 'PICKUPED' }), 'MERCHANT')).toBe(false);
    const o = order();
    const [paidStage, openStage, rest] = o.installments!;
    expect(canVoidStage(o, paidStage, 'MERCHANT')).toBe(true);
    expect(canVoidStage(o, paidStage, 'OUTLET_ADMIN')).toBe(false);
    expect(canVoidStage(o, paidStage, 'OUTLET_STAFF')).toBe(false);
    expect(canVoidStage(o, openStage, 'MERCHANT')).toBe(false);
    expect(canVoidStage(o, rest, 'MERCHANT')).toBe(false);
    expect(isStaffRole('OUTLET_STAFF')).toBe(true);
    expect(isStaffRole('MERCHANT')).toBe(false);
  });

  it('collect: more than the stage is refused, less is allowed', () => {
    expect(collectProblem({ amount: 4_800_000, max: 4_800_000 })).toBeNull();
    expect(collectProblem({ amount: 1_000_000, max: 4_800_000 })).toBeNull();
    expect(collectProblem({ amount: 4_800_001, max: 4_800_000 })).toBe('over');
    expect(collectProblem({ amount: 0, max: 4_800_000 })).toBe('amount');
  });

  it('short day from a Vietnam day key', () => {
    expect(shortDay('2026-11-13')).toBe('13/11');
    expect(shortDay(null)).toBe('');
    expect(shortDay('nonsense')).toBe('');
  });
});

describe('edit the plan of one order', () => {
  const shop = { currency: 'VND' };

  it('rows keep the collected stage locked and leave the rest out', () => {
    const rows = editRowsOf(order());
    expect(rows.map((r) => [r.key, r.locked, r.value])).toEqual([
      ['i1', true, 30],
      ['i2', false, 40],
    ]);
  });

  it('golden: 40% -> 50% moves 1.200.000 out of the rest; the collected stage stays', () => {
    const rows = editRowsOf(order()).map((r) => (r.key === 'i2' ? { ...r, value: 50 } : r));
    const stages = previewEdit(order(), rows, shop, NOW);
    expect(stages.map((s) => s.amount)).toEqual([3_600_000, 6_000_000, 2_400_000]);
    expect(editProblem(rows, stages, 12_000_000)).toBeNull();
  });

  it('stages above the order total are refused; an empty label and a 0% too', () => {
    const rows = editRowsOf(order()).map((r) => (r.key === 'i2' ? { ...r, value: 80 } : r));
    const stages = previewEdit(order(), rows, shop, NOW);
    expect(editProblem(rows, stages, 12_000_000)).toBe('over');
    const zero = editRowsOf(order()).map((r) => (r.key === 'i2' ? { ...r, value: 0 } : r));
    expect(editProblem(zero, previewEdit(order(), zero, shop, NOW), 12_000_000)).toBe('percent');
    const blank = editRowsOf(order()).map((r) => (r.key === 'i2' ? { ...r, label: ' ' } : r));
    expect(editProblem(blank, previewEdit(order(), blank, shop, NOW), 12_000_000)).toBe('label');
  });

  it('the body: keeps keys, a chosen preset becomes a rule, an untouched stage keeps its day', () => {
    const rows = editRowsOf(order()).map((r) => (r.key === 'i2' ? { ...r, due: 'BEFORE_PICKUP:3' } : r));
    const body = editPayload(rows);
    expect(body[0]).toMatchObject({ key: 'i1', type: 'PERCENT', value: 30, dueDateKey: '2026-10-25' });
    expect(body[1]).toMatchObject({ key: 'i2', value: 40, dueRule: { kind: 'BEFORE_PICKUP', days: 3 } });
    expect(body.every((i) => i.key !== 'rest')).toBe(true);
  });

  it('a due-day change moves the date in the preview', () => {
    const rows = editRowsOf(order()).map((r) => (r.key === 'i2' ? { ...r, due: 'BEFORE_PICKUP:3' } : r));
    const stages = previewEdit(order(), rows, shop, NOW);
    expect(stages.find((s) => s.key === 'i2')?.dueDateKey).toBe('2026-11-11');
  });
});

describe('cancel: customer paid / shop keeps / refund', () => {
  it('owner: kept is typed, clamped to what was paid, refund is the rest', () => {
    expect(cancelView(order(), 'MERCHANT', 0)).toMatchObject({ show: true, paid: 3_600_000, kept: 0, refund: 3_600_000, canEditKept: true });
    expect(cancelView(order(), 'OUTLET_ADMIN', 1_800_000)).toMatchObject({ kept: 1_800_000, refund: 1_800_000 });
    expect(cancelView(order(), 'MERCHANT', 9_000_000)).toMatchObject({ kept: 3_600_000, refund: 0 });
    expect(cancelView(order(), 'MERCHANT', -5)).toMatchObject({ kept: 0, refund: 3_600_000 });
    expect(cancelView(order(), 'MERCHANT', Number.NaN)).toMatchObject({ kept: 0 });
  });

  it('staff refund all and cannot type a kept amount', () => {
    expect(cancelView(order(), 'OUTLET_STAFF', 1_800_000)).toMatchObject({ show: true, kept: 0, refund: 3_600_000, canEditKept: false });
  });

  it('the plain dialog stays for an order without a plan, nothing collected, or one already handed over', () => {
    expect(cancelView(order({ hasDepositPlan: false }), 'MERCHANT', 0).show).toBe(false);
    expect(cancelView(order({ depositAmount: 0 }), 'MERCHANT', 0).show).toBe(false);
    expect(cancelView(order({ status: 'PICKUPED' }), 'MERCHANT', 0).show).toBe(false);
  });
});

describe('dashboard reminders and list badge', () => {
  const row = (patch: Record<string, unknown>) => ({
    orderId: 1,
    orderNumber: '589881',
    customerName: 'Chị My',
    key: 'i2',
    label: 'GĐ 2',
    remaining: 96_000,
    dueDateKey: '2026-10-23',
    lateDays: 2,
    ...patch,
  });
  const groups = {
    installmentsOverdue: { count: 1, orders: [row({})] },
    installmentsDue: { count: 1, orders: [row({ orderId: 2, orderNumber: '589882', customerName: 'Chị Hạnh', remaining: 280_000, dueDateKey: '2026-10-25', lateDays: 0 })] },
    installmentsDueTomorrow: { count: 1, orders: [row({ orderId: 3, orderNumber: '589880', customerName: 'Chị Lan', remaining: 4_800_000, dueDateKey: '2026-10-26', lateDays: 0 })] },
  };

  it('"Cần thu hôm nay" lists late stages first, then today; "Sắp đến hạn" the ones due tomorrow', () => {
    const today = dueTodayRows(groups);
    expect(today.map((r) => [r.orderNumber, r.chip.kind, r.amount])).toEqual([
      ['589881', 'late', 96_000],
      ['589882', 'today', 280_000],
    ]);
    expect(today[0].stage).toBe(2);
    const soon = dueSoonRows(groups);
    expect(soon.map((r) => [r.orderNumber, r.chip])).toEqual([['589880', { kind: 'date', day: '26/10' }]]);
  });

  it('the most days late comes first', () => {
    const rows = dueTodayRows({ installmentsOverdue: { count: 2, orders: [row({ lateDays: 1 }), row({ orderId: 9, orderNumber: '9', lateDays: 5 })] } });
    expect(rows.map((r) => r.orderNumber)).toEqual(['9', '589881']);
  });

  it('cards appear only when something is waiting (a ONE_TIME shop sees nothing new)', () => {
    expect(showsReminders(groups)).toBe(true);
    expect(showsReminders({ installmentsDue: { count: 0, orders: [] }, installmentsDueTomorrow: { count: 0, orders: [] }, installmentsOverdue: { count: 0, orders: [] } })).toBe(false);
    expect(showsReminders({})).toBe(false);
    expect(showsReminders(null)).toBe(false);
  });

  it('stage number from the key', () => {
    expect(stageNumberOfKey('i1')).toBe(1);
    expect(stageNumberOfKey('i3')).toBe(3);
    expect(stageNumberOfKey('rest')).toBeNull();
  });

  it('"Đã thu 30%" only for a rental waiting for pick-up whose order has a deposit plan (#1222)', () => {
    const o = { orderType: 'RENT', status: 'RESERVED', hasDepositPlan: true, installmentSummary: { percentCollected: 30 } };
    expect(paidBadgePercent(o)).toBe(30);
    expect(paidBadgePercent({ ...o, installmentSummary: { percentCollected: 33.33 } })).toBe(33);
    expect(paidBadgePercent({ ...o, installmentSummary: { percentCollected: 250 } })).toBe(100);
  });

  it('no badge for a one-time deposit order, even with money collected (shop STAGED or not)', () => {
    const once = { orderType: 'RENT', status: 'RESERVED', totalAmount: 12_000_000, depositAmount: 4_800_000 };
    expect(paidBadgePercent(once)).toBeNull();
    expect(paidBadgePercent({ ...once, hasDepositPlan: false })).toBeNull();
    expect(paidBadgePercent({ ...once, hasDepositPlan: false, installmentSummary: { percentCollected: 40 } })).toBeNull();
  });

  it('no badge without a collected percent, after pick-up, on a sale, or from an older API', () => {
    const o = { orderType: 'RENT', status: 'RESERVED', hasDepositPlan: true, installmentSummary: { percentCollected: 30 } };
    expect(paidBadgePercent({ ...o, installmentSummary: { percentCollected: 0 } })).toBeNull();
    expect(paidBadgePercent({ ...o, installmentSummary: null })).toBeNull();
    expect(paidBadgePercent({ ...o, status: 'PICKUPED' })).toBeNull();
    expect(paidBadgePercent({ ...o, orderType: 'SALE' })).toBeNull();
    expect(paidBadgePercent({ orderType: 'RENT', status: 'RESERVED' })).toBeNull();
  });
});
