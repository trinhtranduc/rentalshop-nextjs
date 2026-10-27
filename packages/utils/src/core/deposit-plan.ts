/**
 * Staged deposits ("Thu cọc theo giai đoạn", #1199).
 *
 * One place decides how an order's money is split in stages: `effectivePlan(order, shop)`.
 * Nothing here looks at the shop's deposit mode; the mode only decides whether a NEW order gets a plan.
 * Everything is pure (no database, no clock unless `now` is passed) so web, API and tests share it.
 *
 * - `Order.depositPlan` (JSON, versioned) holds only the explicit stages. The last stage `rest` is never stored:
 *   it is always `total - sum(other stages)`, so the stages always add up to the total.
 * - A stage collected (a COMPLETED `Payment` with notes `INSTALLMENT` and the stage `installmentKey`) is locked
 *   to the amount that was collected; the other stages and `rest` absorb any difference.
 * - Days are Vietnam (shop time zone) civil days `YYYY-MM-DD`, never midnight `Date`s.
 */
import { z } from 'zod';
import { addDaysToDateKey, formatDateKeyInTimeZone } from './date-range';
import { DEFAULT_SHOP_TIMEZONE, resolveShopTimeZone } from './timezone';

export const DEPOSIT_PLAN_VERSION = 1;
export const REST_KEY = 'rest';
/** Fixed Vietnamese label of the automatic last stage (clients may translate by `key`). */
export const REST_LABEL = 'Phần còn lại, thu khi giao';
export const INSTALLMENT_PAYMENT_NOTE = 'INSTALLMENT';
export const MAX_PLAN_ITEMS = 3;
export const MAX_TEMPLATES = 10;
export const MAX_CANCELLATION_POLICY_LENGTH = 1000;

export type DepositMode = 'ONE_TIME' | 'STAGED';
export const DEFAULT_DEPOSIT_MODE: DepositMode = 'ONE_TIME';

export type DueRule =
  | { kind: 'ON_CREATE' }
  | { kind: 'BEFORE_PICKUP'; days: number }
  | { kind: 'AFTER_CREATE'; days: number };

export interface DepositPlanItem {
  key: string;
  label: string;
  type: 'PERCENT';
  value: number;
  dueRule?: DueRule;
  /** `YYYY-MM-DD`; wins over `dueRule` (the MERCHANT picked a day) */
  dueDateKey?: string;
  /** Amount in currency units that replaces the percentage (MERCHANT edit) */
  amountOverride?: number;
}

export interface DepositPlan {
  v: number;
  policy?: string;
  items: DepositPlanItem[];
}

// ---------------------------------------------------------------------------
// zod
// ---------------------------------------------------------------------------

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const dueRuleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ON_CREATE') }),
  z.object({ kind: z.literal('BEFORE_PICKUP'), days: z.number().int().min(0).max(365) }),
  z.object({ kind: z.literal('AFTER_CREATE'), days: z.number().int().min(0).max(365) }),
]);

const labelSchema = z.string().trim().min(1).max(60);

/** MVP: only PERCENT is accepted when writing; FIXED / BY_PRODUCT can be added later without a schema change. */
export const depositPlanItemSchema = z
  .object({
    key: z.string().regex(/^i[1-9]$/, 'key must be i1..i9'),
    label: labelSchema,
    type: z.literal('PERCENT'),
    value: z.number().gt(0).max(100),
    dueRule: dueRuleSchema.optional(),
    dueDateKey: z.string().regex(DATE_KEY).optional(),
    amountOverride: z.number().min(0).optional(),
  })
  .refine((item) => item.dueRule !== undefined || item.dueDateKey !== undefined, {
    message: 'dueRule or dueDateKey is required',
  });

export const depositPlanSchema = z
  .object({
    v: z.literal(DEPOSIT_PLAN_VERSION),
    policy: z.string().max(MAX_CANCELLATION_POLICY_LENGTH).optional(),
    items: z.array(depositPlanItemSchema).min(1).max(MAX_PLAN_ITEMS),
  })
  .refine((plan) => new Set(plan.items.map((item) => item.key)).size === plan.items.length, {
    message: 'duplicate key',
  })
  .refine((plan) => plan.items.reduce((sum, item) => sum + item.value, 0) <= 100 + 1e-9, {
    message: 'percent over 100',
  });

/** What a client sends for the stages of a new order or an edit: no `v`, keys optional (server numbers them). */
export const depositPlanItemInputSchema = z
  .object({
    key: z.string().regex(/^i[1-9]$/).optional(),
    label: labelSchema,
    type: z.literal('PERCENT').default('PERCENT'),
    value: z.number().gt(0).max(100),
    dueRule: dueRuleSchema.optional(),
    dueDateKey: z.string().regex(DATE_KEY).optional(),
    amountOverride: z.number().min(0).optional(),
  })
  .refine((item) => item.dueRule !== undefined || item.dueDateKey !== undefined, {
    message: 'dueRule or dueDateKey is required',
  });

export const depositTemplateSchema = z
  .object({
    id: z.string().trim().min(1).max(40),
    name: z.string().trim().min(1).max(80),
    isDefault: z.boolean().optional(),
    items: z
      .array(
        z.object({
          label: labelSchema,
          type: z.literal('PERCENT'),
          value: z.number().gt(0).max(100),
          dueRule: dueRuleSchema,
        })
      )
      .min(1)
      .max(MAX_PLAN_ITEMS),
  })
  .refine((template) => template.items.reduce((sum, item) => sum + item.value, 0) <= 100 + 1e-9, {
    message: 'percent over 100',
  });

export type DepositTemplate = z.infer<typeof depositTemplateSchema>;

/** `Merchant.settings.payment` */
export const paymentSettingsSchema = z.object({
  v: z.literal(1).default(1),
  depositMode: z.enum(['ONE_TIME', 'STAGED']).default(DEFAULT_DEPOSIT_MODE),
  cancellationPolicy: z.string().trim().max(MAX_CANCELLATION_POLICY_LENGTH).default(''),
  templates: z.array(depositTemplateSchema).max(MAX_TEMPLATES).default([]),
});

export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;

/** Built-in template used while a STAGED shop has none of its own (owner has not fixed the wording yet). */
export const DEFAULT_DEPOSIT_TEMPLATE: DepositTemplate = {
  id: 'default',
  name: 'Cọc giữ chỗ 30% lúc đặt, phần còn lại khi giao',
  isDefault: true,
  items: [{ label: 'Cọc giữ chỗ', type: 'PERCENT', value: 30, dueRule: { kind: 'ON_CREATE' } }],
};

/** Reads `Merchant.settings.payment` leniently: anything unusable falls back to the defaults (ONE_TIME). */
export function readPaymentSettings(settings: unknown): PaymentSettings {
  const raw = (settings as { payment?: unknown } | null | undefined)?.payment;
  const parsed = paymentSettingsSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  const mode = (raw as { depositMode?: unknown } | null | undefined)?.depositMode;
  const policy = (raw as { cancellationPolicy?: unknown } | null | undefined)?.cancellationPolicy;
  return {
    v: 1,
    depositMode: mode === 'STAGED' ? 'STAGED' : DEFAULT_DEPOSIT_MODE,
    cancellationPolicy: typeof policy === 'string' ? policy.slice(0, MAX_CANCELLATION_POLICY_LENGTH) : '',
    templates: [],
  };
}

/** The template a new order uses: the asked one, else the shop default, else the built-in one. */
export function pickTemplate(settings: PaymentSettings, templateId?: string | null): DepositTemplate {
  if (templateId) {
    const asked = settings.templates.find((template) => template.id === templateId);
    if (asked) return asked;
    if (templateId === DEFAULT_DEPOSIT_TEMPLATE.id) return DEFAULT_DEPOSIT_TEMPLATE;
  }
  return settings.templates.find((template) => template.isDefault) ?? settings.templates[0] ?? DEFAULT_DEPOSIT_TEMPLATE;
}

/** Template (or client items) -> the plan that is stored on the order. Keys are numbered i1, i2, ... */
export function applyTemplate(
  items: ReadonlyArray<Omit<DepositPlanItem, 'key'> & { key?: string }>,
  policy?: string | null
): DepositPlan {
  return {
    v: DEPOSIT_PLAN_VERSION,
    ...(policy ? { policy: policy.slice(0, MAX_CANCELLATION_POLICY_LENGTH) } : {}),
    items: items.map((item, index) => ({ ...item, key: item.key ?? `i${index + 1}` })),
  };
}

/** Reads the stored JSON. Unknown stage types are skipped (never break reading); unusable JSON gives null. */
export function parseDepositPlan(value: unknown): DepositPlan | null {
  if (value == null) return null;
  let raw: unknown = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw !== 'object' || raw === null || !Array.isArray((raw as { items?: unknown }).items)) return null;
  const source = raw as { v?: unknown; policy?: unknown; items: unknown[] };
  const items: DepositPlanItem[] = [];
  for (const entry of source.items) {
    const item = entry as Partial<DepositPlanItem> | null;
    if (!item || item.type !== 'PERCENT' || typeof item.key !== 'string' || typeof item.value !== 'number') continue;
    if (item.key === REST_KEY) continue;
    items.push({
      key: item.key,
      label: typeof item.label === 'string' ? item.label : item.key,
      type: 'PERCENT',
      value: item.value,
      ...(item.dueRule ? { dueRule: item.dueRule } : {}),
      ...(typeof item.dueDateKey === 'string' ? { dueDateKey: item.dueDateKey } : {}),
      ...(typeof item.amountOverride === 'number' ? { amountOverride: item.amountOverride } : {}),
    });
  }
  return {
    v: typeof source.v === 'number' ? source.v : DEPOSIT_PLAN_VERSION,
    ...(typeof source.policy === 'string' && source.policy ? { policy: source.policy } : {}),
    items,
  };
}

// ---------------------------------------------------------------------------
// money
// ---------------------------------------------------------------------------

/** Fraction digits of the smallest unit of a currency: VND 0, JPY 0, USD 2. */
export function minorUnitDigits(currency?: string | null): number {
  try {
    const digits = new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'VND' }).resolvedOptions()
      .maximumFractionDigits;
    return typeof digits === 'number' ? digits : 0;
  } catch {
    return 0;
  }
}

/** Round to the currency's smallest unit (VND 1, USD 0.01). */
export function roundMoney(amount: number, currency?: string | null): number {
  const factor = Math.pow(10, minorUnitDigits(currency));
  return Math.round(Math.round((amount + Number.EPSILON) * factor)) / factor;
}

/** `percent` of `total` in the currency's smallest unit. */
export function percentOf(total: number, percent: number, currency?: string | null): number {
  const factor = Math.pow(10, minorUnitDigits(currency));
  const totalMinor = Math.round(total * factor);
  return Math.round((totalMinor * percent) / 100) / factor;
}

// ---------------------------------------------------------------------------
// effectivePlan
// ---------------------------------------------------------------------------

export type InstallmentStatus = 'PAID' | 'PARTIAL' | 'DUE_TODAY' | 'OVERDUE' | 'UPCOMING' | 'VOID';

export interface PlanPaymentLike {
  amount?: number | null;
  status?: string | null;
  notes?: string | null;
  installmentKey?: string | null;
  /** JSON text (or object) the collect route wrote; `plannedAmount` is the stage amount at the moment of collection (#1219) */
  metadata?: unknown;
  processedAt?: Date | string | null;
  createdAt?: Date | string | null;
}

export interface PlanOrderLike {
  status?: string | null;
  orderType?: string | null;
  totalAmount?: number | null;
  pickupTotalAmount?: number | null;
  depositAmount?: number | null;
  depositPlan?: unknown;
  createdAt?: Date | string | null;
  pickupPlanAt?: Date | string | null;
  returnPlanAt?: Date | string | null;
  pickedUpAt?: Date | string | null;
  payments?: PlanPaymentLike[] | null;
}

export interface PlanShop {
  currency?: string | null;
  timezone?: string | null;
}

export interface ResolvedInstallment {
  key: string;
  label: string;
  /** Share of the order total, 2 decimals */
  percent: number;
  /** What the stage is worth now: the collected amount once collected, else the planned amount */
  amount: number;
  /** Planned amount from the percentage (or the MERCHANT override) */
  plannedAmount: number;
  dueDateKey: string | null;
  status: InstallmentStatus;
  paidAmount: number;
  remaining: number;
  collectedAt: string | null;
  isRest: boolean;
}

export function installmentStatus(dueDateKey: string | null, todayKey: string): 'DUE_TODAY' | 'OVERDUE' | 'UPCOMING' {
  if (!dueDateKey) return 'UPCOMING';
  if (dueDateKey < todayKey) return 'OVERDUE';
  if (dueDateKey === todayKey) return 'DUE_TODAY';
  return 'UPCOMING';
}

const CLOSED_AFTER_PICKUP = new Set(['PICKUPED', 'RETURNED', 'COMPLETED']);

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: Date | string | null | undefined): string | null {
  return toDate(value)?.toISOString() ?? null;
}

/** The total the stages are measured against: after hand-over the total collected then (#505 extensions stay outside). */
export function planBaseTotal(order: PlanOrderLike): number {
  const total = order.totalAmount || 0;
  if (order.pickedUpAt && order.pickupTotalAmount != null) return order.pickupTotalAmount;
  return total;
}

function dueKeyOf(
  item: Pick<DepositPlanItem, 'dueRule' | 'dueDateKey'>,
  createdKey: string,
  pickupKey: string
): string {
  if (item.dueDateKey && DATE_KEY.test(item.dueDateKey)) return item.dueDateKey;
  const rule = item.dueRule;
  if (!rule || rule.kind === 'ON_CREATE') return createdKey;
  if (rule.kind === 'BEFORE_PICKUP') return addDaysToDateKey(pickupKey, -rule.days);
  return addDaysToDateKey(createdKey, rule.days);
}

/** The stage amount recorded when the row was collected; null for rows taken before #1219 or with unusable metadata. */
function plannedAtCollection(metadata: unknown): number | null {
  try {
    const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    const value = (parsed as { plannedAmount?: unknown } | null)?.plannedAmount;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

function collectedFor(
  payments: PlanPaymentLike[],
  key: string
): { amount: number; at: string | null; plannedThen: number | null } {
  let amount = 0;
  let plannedThen: number | null = null;
  let at: Date | null = null;
  for (const payment of payments) {
    if (payment.status !== 'COMPLETED' || payment.notes !== INSTALLMENT_PAYMENT_NOTE || payment.installmentKey !== key) {
      continue;
    }
    amount += payment.amount || 0;
    plannedThen = plannedAtCollection(payment.metadata) ?? plannedThen;
    const when = toDate(payment.processedAt) ?? toDate(payment.createdAt);
    if (when && (!at || when > at)) at = when;
  }
  return { amount, at: at ? at.toISOString() : null, plannedThen };
}

/**
 * The stages of an order with their amounts, due days and collected state. Every money screen, the collect route,
 * the delivery check and the reminders call this; none of them reads `depositPlan` or the shop mode directly.
 *
 * - `depositPlan` null (old order / ONE_TIME shop): the stages equal to today's behaviour, `deposit`
 *   (= `depositAmount`, due the day of creation) and `rest` (due the pickup day).
 * - `depositPlan` set: each explicit stage is a percentage of the total rounded to the currency's smallest unit
 *   (or its `amountOverride`); a collected stage is locked to what was collected; `rest` = total - the others.
 */
export function effectivePlan(
  order: PlanOrderLike,
  shop: PlanShop = {},
  options: { now?: Date } = {}
): ResolvedInstallment[] {
  const timezone = resolveShopTimeZone(shop.timezone ?? DEFAULT_SHOP_TIMEZONE);
  const currency = shop.currency;
  const now = options.now ?? new Date();
  const todayKey = formatDateKeyInTimeZone(now, timezone);
  const createdKey = formatDateKeyInTimeZone(toDate(order.createdAt) ?? now, timezone);
  const pickupSource = toDate(order.pickupPlanAt) ?? toDate(order.returnPlanAt);
  const pickupKey = pickupSource ? formatDateKeyInTimeZone(pickupSource, timezone) : createdKey;
  const payments = order.payments ?? [];
  const total = planBaseTotal(order);
  const cancelled = order.status === 'CANCELLED';
  const handedOver = CLOSED_AFTER_PICKUP.has(String(order.status));
  const percentOfTotal = (amount: number) => (total > 0 ? Math.round((amount / total) * 10000) / 100 : 0);

  const plan = parseDepositPlan(order.depositPlan);
  const stages: ResolvedInstallment[] = [];

  const statusOf = (paid: number, planned: number, dueKey: string | null): InstallmentStatus => {
    if (paid > 0) return paid + 1e-9 >= planned ? 'PAID' : 'PARTIAL';
    if (cancelled) return 'VOID';
    return installmentStatus(dueKey, todayKey);
  };

  let explicitSum = 0;
  if (plan) {
    for (const item of plan.items) {
      const planned =
        item.amountOverride !== undefined
          ? roundMoney(item.amountOverride, currency)
          : percentOf(total, item.value, currency);
      const collected = collectedFor(payments, item.key);
      const locked = collected.amount > 0;
      const amount = locked ? roundMoney(collected.amount, currency) : planned;
      const dueKey = dueKeyOf(item, createdKey, pickupKey);
      explicitSum += amount;
      stages.push({
        key: item.key,
        label: item.label,
        percent: percentOfTotal(amount),
        amount,
        plannedAmount: planned,
        dueDateKey: dueKey,
        // A locked stage is judged against what it was worth when collected: a later change of the total moves
        // `planned` but nothing can be collected on the stage any more (#1219). Old rows without it keep `planned`.
        status: statusOf(collected.amount, locked ? (collected.plannedThen ?? planned) : planned, dueKey),
        paidAmount: collected.amount,
        remaining: locked ? 0 : amount,
        collectedAt: collected.at,
        isRest: false,
      });
    }
  } else {
    const deposit = order.depositAmount || 0;
    if (deposit > 0) {
      explicitSum += deposit;
      stages.push({
        key: 'deposit',
        label: 'Cọc',
        percent: percentOfTotal(deposit),
        amount: deposit,
        plannedAmount: deposit,
        dueDateKey: createdKey,
        status: 'PAID',
        paidAmount: deposit,
        remaining: 0,
        collectedAt: toIso(order.createdAt),
        isRest: false,
      });
    }
  }

  const restAmount = Math.max(0, roundMoney(total - explicitSum, currency));
  const restCollected = collectedFor(payments, REST_KEY);
  const restPaid = restCollected.amount > 0 ? restCollected.amount : handedOver ? restAmount : 0;
  const restDue = pickupKey;
  stages.push({
    key: REST_KEY,
    label: REST_LABEL,
    percent: percentOfTotal(restAmount),
    amount: restAmount,
    plannedAmount: restAmount,
    dueDateKey: restDue,
    status: restPaid > 0 ? (restPaid + 1e-9 >= restAmount ? 'PAID' : 'PARTIAL') : cancelled ? 'VOID' : installmentStatus(restDue, todayKey),
    paidAmount: restPaid,
    remaining: Math.max(0, restAmount - restPaid),
    collectedAt: restCollected.at ?? (handedOver ? toIso(order.pickedUpAt) : null),
    isRest: true,
  });
  return stages;
}

/** Sum of the explicit stages when they do not fit in the total (plan edit / total change); 0 when they fit. */
export function planOverflow(order: PlanOrderLike, shop: PlanShop = {}, options: { now?: Date } = {}): number {
  const total = planBaseTotal(order);
  const explicit = effectivePlan(order, shop, options)
    .filter((stage) => !stage.isRest)
    .reduce((sum, stage) => sum + stage.amount, 0);
  const over = roundMoney(explicit - total, shop.currency);
  return over > 0 ? over : 0;
}

/** Money already collected in stages: more than the new total means the total cannot be lowered that far. */
export function collectedInStages(order: PlanOrderLike): number {
  return (order.payments ?? [])
    .filter((p) => p.status === 'COMPLETED' && p.notes === INSTALLMENT_PAYMENT_NOTE && p.installmentKey)
    .reduce((sum, p) => sum + (p.amount || 0), 0);
}

/**
 * The stages after the order total changes (new items, price, days): unpaid stages follow their percentage of
 * the new total, collected stages keep what was collected. `overpaid` when the new total is below what is collected.
 */
export function recalcAfterTotalChange(
  order: PlanOrderLike,
  newTotal: number,
  shop: PlanShop = {},
  options: { now?: Date } = {}
): { stages: ResolvedInstallment[]; overpaid: boolean; overflow: number } {
  const next: PlanOrderLike = { ...order, totalAmount: newTotal, pickupTotalAmount: null };
  return {
    stages: effectivePlan(next, shop, options),
    overpaid: collectedInStages(order) > newTotal + 1e-9,
    overflow: planOverflow(next, shop, options),
  };
}

/** Explicit stages (not `rest`) worth money that nobody collected yet: they block delivery. */
export function unpaidExplicitStages(stages: ResolvedInstallment[]): ResolvedInstallment[] {
  return stages.filter((stage) => !stage.isRest && stage.amount > 0 && stage.paidAmount <= 0 && stage.status !== 'VOID');
}

/** Totals for the progress bar and the summary line. */
export function installmentSummary(stages: ResolvedInstallment[], total: number) {
  // #1253: a stage of a cancelled order that nobody collected (`VOID`) is not planned money any more
  const planned = stages.reduce((sum, stage) => sum + (stage.status === 'VOID' ? 0 : stage.amount), 0);
  const collected = stages.reduce((sum, stage) => sum + stage.paidAmount, 0);
  const next = stages
    .filter((stage) => stage.remaining > 0 && stage.status !== 'VOID' && stage.dueDateKey)
    .sort((a, b) => String(a.dueDateKey).localeCompare(String(b.dueDateKey)))[0];
  return {
    planned,
    collected,
    remaining: Math.max(0, planned - collected),
    percentCollected: total > 0 ? Math.round((collected / total) * 10000) / 100 : 0,
    nextDue: next ? { key: next.key, dueDateKey: next.dueDateKey, amount: next.remaining } : null,
  };
}
