/**
 * Thu cọc theo giai đoạn on the web (#1199): pure helpers for the settings screen, the create-order stage list,
 * the order detail card, the collect / edit / cancel dialogs, the dashboard cards and the list badge.
 * Money and due days come from `effectivePlan` (`@rentalshop/utils`), the same function the API uses, so the
 * numbers shown before saving are the numbers the server stores. No React, no fetch.
 */
import {
  MAX_PLAN_ITEMS,
  applyTemplate,
  effectivePlan,
  type DepositMode,
  type DepositPlanItem,
  type DepositTemplate,
  type DueRule,
  type OrderInstallment,
  type ResolvedInstallment,
} from '@rentalshop/utils';

export type { OrderInstallment } from '@rentalshop/utils';

/** A translator already scoped to one namespace (`installments` or `deposit`): keys `due.*`, `restShort` */
type TFn = (key: string, values?: Record<string, string | number>) => string;

export const REST_STAGE_KEY = 'rest';

/** Roles that may change the stages of one order (the API answers 403 to the others) */
const PLAN_EDIT_ROLES = ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'];
/** Roles that may cancel a collection (void) */
const VOID_ROLES = ['ADMIN', 'MERCHANT'];
/** Roles that choose how much the shop keeps when it cancels an order */
const KEEP_ROLES = ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'];

const upper = (role?: string | null) => String(role || '').toUpperCase();

export const canEditPlanRole = (role?: string | null) => PLAN_EDIT_ROLES.includes(upper(role));
export const canVoidRole = (role?: string | null) => VOID_ROLES.includes(upper(role));
export const canChooseKeptRole = (role?: string | null) => KEEP_ROLES.includes(upper(role));
/** Staff (outlet staff / inventory) collect cash or transfer, today only */
export const isStaffRole = (role?: string | null) => ['OUTLET_STAFF', 'OUTLET_INVENTORY'].includes(upper(role));

// ----------------------------------------------------------------------------
// Due rules
// ----------------------------------------------------------------------------

/** Presets of the "Hạn thu" select; a rule outside the list is added by `dueOptionsFor` */
export const DUE_PRESETS: DueRule[] = [
  { kind: 'ON_CREATE' },
  { kind: 'AFTER_CREATE', days: 3 },
  { kind: 'AFTER_CREATE', days: 7 },
  { kind: 'BEFORE_PICKUP', days: 1 },
  { kind: 'BEFORE_PICKUP', days: 3 },
  { kind: 'BEFORE_PICKUP', days: 7 },
  { kind: 'BEFORE_PICKUP', days: 14 },
];

export const dueRuleValue = (rule: DueRule): string => (rule.kind === 'ON_CREATE' ? 'ON_CREATE' : `${rule.kind}:${rule.days}`);

export function parseDueValue(value: string): DueRule {
  const [kind, days] = value.split(':');
  const n = Math.max(0, Math.min(365, Math.round(Number(days) || 0)));
  if (kind === 'BEFORE_PICKUP') return { kind: 'BEFORE_PICKUP', days: n };
  if (kind === 'AFTER_CREATE') return { kind: 'AFTER_CREATE', days: n };
  return { kind: 'ON_CREATE' };
}

export function dueRuleText(rule: DueRule, t: TFn): string {
  if (rule.kind === 'ON_CREATE') return t('due.onCreate');
  return t(rule.kind === 'BEFORE_PICKUP' ? 'due.beforePickup' : 'due.afterCreate', { days: rule.days });
}

export function dueOptionsFor(rule: DueRule | null | undefined): DueRule[] {
  if (!rule) return DUE_PRESETS;
  return DUE_PRESETS.some((p) => dueRuleValue(p) === dueRuleValue(rule)) ? DUE_PRESETS : [...DUE_PRESETS, rule];
}

// ----------------------------------------------------------------------------
// Settings: templates
// ----------------------------------------------------------------------------

export interface DepositSettingsLike {
  depositMode?: DepositMode | string | null;
  cancellationPolicy?: string | null;
  templates?: DepositTemplate[] | null;
  defaultTemplate?: DepositTemplate | null;
}

export const isStagedMode = (settings: DepositSettingsLike | null | undefined) => settings?.depositMode === 'STAGED';

/** The templates shown in the settings list and the create picker: the shop's own, else the built-in default */
export function templatesOf(settings: DepositSettingsLike | null | undefined): DepositTemplate[] {
  const own = settings?.templates ?? [];
  if (own.length > 0) return own;
  return settings?.defaultTemplate ? [settings.defaultTemplate] : [];
}

/** The template a new order starts from (the shop default, else the first, else the built-in one) */
export function defaultTemplateOf(settings: DepositSettingsLike | null | undefined): DepositTemplate | null {
  const list = templatesOf(settings);
  return list.find((x) => x.isDefault) ?? list[0] ?? null;
}

export const percentSum = (items: Array<{ value: number }>) => Math.round(items.reduce((s, i) => s + (Number(i.value) || 0), 0) * 100) / 100;

/** The automatic last stage: whatever the other stages leave of the 100% */
export const restPercent = (items: Array<{ value: number }>) => Math.max(0, Math.round((100 - percentSum(items)) * 100) / 100);

export function templateProblem(template: DepositTemplate): 'name' | 'items' | 'label' | 'percent' | 'over' | null {
  if (!template.name.trim()) return 'name';
  if (template.items.length < 1 || template.items.length > MAX_PLAN_ITEMS) return 'items';
  if (template.items.some((i) => !i.label.trim())) return 'label';
  if (template.items.some((i) => !(i.value > 0) || i.value > 100)) return 'percent';
  if (percentSum(template.items) > 100) return 'over';
  return null;
}

/** "30% khi đặt · 40% trước ngày lấy 1 ngày · Phần còn lại khi giao" */
export function templateSummary(template: DepositTemplate, t: TFn): string {
  const parts = template.items.map((i) => `${i.value}% ${dueRuleText(i.dueRule, t)}`);
  parts.push(t('restShort'));
  return parts.join(' · ');
}

export function newTemplate(name: string, label: string, id = `t${Date.now().toString(36)}`): DepositTemplate {
  return { id, name, items: [{ label, type: 'PERCENT', value: 30, dueRule: { kind: 'ON_CREATE' } }] };
}

/** One template becomes the default; at most one has `isDefault` (the API refuses two) */
export function setDefaultTemplate(templates: DepositTemplate[], id: string): DepositTemplate[] {
  return templates.map((x) => {
    const copy = { ...x };
    delete copy.isDefault;
    return x.id === id ? { ...copy, isDefault: true } : copy;
  });
}

export function removeTemplate(templates: DepositTemplate[], id: string): DepositTemplate[] {
  const left = templates.filter((x) => x.id !== id);
  // Deleting the default leaves the first as default, so a new order always has one
  if (left.length > 0 && !left.some((x) => x.isDefault)) return setDefaultTemplate(left, left[0].id);
  return left;
}

// ----------------------------------------------------------------------------
// Create order
// ----------------------------------------------------------------------------

export interface PlanItemDraft {
  label: string;
  value: number;
  dueRule: DueRule;
}

export const draftsFromTemplate = (template: DepositTemplate | null | undefined): PlanItemDraft[] =>
  (template?.items ?? []).map((i) => ({ label: i.label, value: i.value, dueRule: i.dueRule }));

export interface PreviewInput {
  total: number;
  items: PlanItemDraft[];
  /** ISO instants of the payload (`pickupPlanAt` / `returnPlanAt`) */
  pickupPlanAt?: string | null;
  returnPlanAt?: string | null;
  currency?: string | null;
  timezone?: string | null;
  now?: Date;
}

/** The stages of an order that is about to be created, as the server will compute them */
export function previewStages(input: PreviewInput): ResolvedInstallment[] {
  const now = input.now ?? new Date();
  const plan = applyTemplate(input.items.map((i) => ({ label: i.label, type: 'PERCENT' as const, value: i.value, dueRule: i.dueRule })));
  return effectivePlan(
    {
      totalAmount: input.total,
      depositPlan: plan,
      createdAt: now,
      pickupPlanAt: input.pickupPlanAt ?? null,
      returnPlanAt: input.returnPlanAt ?? null,
      payments: [],
    },
    { currency: input.currency ?? undefined, timezone: input.timezone ?? undefined },
    { now }
  );
}

/** What can be collected on the spot: the first explicit stage, when it is worth money */
export function firstStageToCollect(stages: ResolvedInstallment[]): ResolvedInstallment | null {
  const first = stages[0];
  return first && !first.isRest && first.plannedAmount > 0 ? first : null;
}

export type CollectMethod = 'CASH' | 'TRANSFER';

export interface PaymentPlanBody {
  templateId?: string;
  items?: Array<{ label: string; type: 'PERCENT'; value: number; dueRule: DueRule }>;
  collectFirstNow?: { method: CollectMethod; reference: string };
}

/**
 * `paymentPlan` of POST /api/orders. Without edits only the template id goes (the server applies it, and staff may do
 * nothing else); edited percentages go as `items`. `collectNow` null creates the order without collecting.
 */
export function buildPaymentPlan(input: {
  templateId: string | null;
  items: PlanItemDraft[];
  edited: boolean;
  collectNow: { method: CollectMethod; reference: string } | null;
}): PaymentPlanBody {
  const body: PaymentPlanBody = {};
  if (input.edited) body.items = input.items.map((i) => ({ label: i.label, type: 'PERCENT' as const, value: i.value, dueRule: i.dueRule }));
  else if (input.templateId) body.templateId = input.templateId;
  if (input.collectNow) body.collectFirstNow = input.collectNow;
  return body;
}

export function newReference(prefix = 'stage'): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${rand}`.slice(0, 100);
}

// ----------------------------------------------------------------------------
// Order detail
// ----------------------------------------------------------------------------

export interface PlanOrderLike {
  orderType?: string | null;
  status?: string | null;
  totalAmount?: number | null;
  depositAmount?: number | null;
  hasDepositPlan?: boolean | null;
  installments?: OrderInstallment[] | null;
  installmentSummary?: { percentCollected?: number; collected?: number; remaining?: number } | null;
  depositPlanPolicy?: string | null;
  createdAt?: string | Date | null;
  pickupPlanAt?: string | Date | null;
  returnPlanAt?: string | Date | null;
  cancelKeptAmount?: number | null;
}

/** The card shows only for an order that has a plan (an old order or a ONE_TIME shop's order has none) */
export const hasPlan = (o: PlanOrderLike | null | undefined): boolean =>
  !!o && o.hasDepositPlan === true && o.orderType !== 'SALE' && Array.isArray(o.installments) && o.installments.length > 0;

export const percentCollected = (o: PlanOrderLike): number => Math.round(o.installmentSummary?.percentCollected ?? 0);

/** #1253: a cancelled order that kept money: what the shop kept and what went back (collected - kept); null otherwise */
export function cancelledOutcome(o: PlanOrderLike): { kept: number; refund: number } | null {
  if (o.status !== 'CANCELLED' || !hasPlan(o)) return null;
  const kept = o.cancelKeptAmount ?? 0;
  if (!(kept > 0)) return null;
  return { kept, refund: Math.max(0, (o.installmentSummary?.collected ?? 0) - kept) };
}

export const isOpenRental = (o: PlanOrderLike) => o.orderType === 'RENT' && o.status === 'RESERVED';

export const stageNumber = (list: OrderInstallment[], key: string): number => list.findIndex((x) => x.key === key) + 1;

export type StageChip = 'PAID' | 'PARTIAL' | 'DUE_TODAY' | 'OVERDUE' | 'UPCOMING' | 'VOID';

export function chipTone(status: string): 'good' | 'info' | 'warn' | 'bad' | 'muted' {
  if (status === 'PAID') return 'good';
  if (status === 'PARTIAL' || status === 'DUE_TODAY') return 'warn';
  if (status === 'OVERDUE') return 'bad';
  if (status === 'VOID') return 'muted';
  return 'info';
}

/** The stage the "Thu giai đoạn N" button collects: the first explicit stage still owing money */
export function nextStageToCollect(o: PlanOrderLike): OrderInstallment | null {
  if (!hasPlan(o) || !isOpenRental(o)) return null;
  return (o.installments ?? []).find((x) => x.key !== REST_STAGE_KEY && x.remaining > 0 && x.paidAmount <= 0 && x.status !== 'VOID') ?? null;
}

/** Explicit stages worth money that nobody collected: they block hand-over (INSTALLMENT_UNPAID_AT_PICKUP) */
export function unpaidAtPickup(o: PlanOrderLike): OrderInstallment[] {
  if (!hasPlan(o) || !isOpenRental(o)) return [];
  return (o.installments ?? []).filter((x) => x.key !== REST_STAGE_KEY && x.amount > 0 && x.paidAmount <= 0 && x.status !== 'VOID');
}

export const canEditPlan = (o: PlanOrderLike, role?: string | null) => hasPlan(o) && isOpenRental(o) && canEditPlanRole(role);

export const canVoidStage = (o: PlanOrderLike, stage: OrderInstallment, role?: string | null) =>
  hasPlan(o) && isOpenRental(o) && canVoidRole(role) && stage.key !== REST_STAGE_KEY && stage.paidAmount > 0;

/** "2026-11-13" -> "13/11" (the key is a Vietnam civil day; no Date, no time zone) */
export function shortDay(key: string | null | undefined): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(key || '');
  return m ? `${m[2]}/${m[1]}` : '';
}

/** The instant a stage was collected, as the Vietnam civil day key */
export function collectedDayKey(iso: string | null | undefined, toDayKey: (v: string | Date) => string | null): string {
  return iso ? toDayKey(iso) || '' : '';
}

export interface CollectInput {
  amount: number;
  max: number;
}

/** Collect dialog: an amount above the stage is refused by the API (INSTALLMENT_OVERPAID); less is allowed */
export function collectProblem(input: CollectInput): 'amount' | 'over' | null {
  if (!(input.amount > 0)) return 'amount';
  if (input.amount > input.max + 1e-9) return 'over';
  return null;
}

// ----------------------------------------------------------------------------
// Edit one order's plan
// ----------------------------------------------------------------------------

export interface EditRow {
  key: string;
  label: string;
  value: number;
  /** A preset rule, or 'KEEP' to leave the day the stage has now */
  due: string;
  dueDateKey: string | null;
  /** Collected: percentage and day cannot change */
  locked: boolean;
  paidAmount: number;
}

export const KEEP_DUE = 'KEEP';

export function editRowsOf(o: PlanOrderLike): EditRow[] {
  return (o.installments ?? [])
    .filter((x) => x.key !== REST_STAGE_KEY)
    .map((x) => ({
      key: x.key,
      label: x.label,
      value: x.percent,
      due: KEEP_DUE,
      dueDateKey: x.dueDateKey,
      locked: x.paidAmount > 0,
      paidAmount: x.paidAmount,
    }));
}

export function editPayload(rows: EditRow[]) {
  return rows.map((r) => {
    const base = { key: r.key, label: r.label, type: 'PERCENT' as const, value: r.value };
    if (r.due !== KEEP_DUE && !r.locked) return { ...base, dueRule: parseDueValue(r.due) };
    if (r.dueDateKey) return { ...base, dueDateKey: r.dueDateKey };
    return { ...base, dueRule: { kind: 'ON_CREATE' as const } };
  });
}

/** Stages after an edit, from the same function the server uses; collected stages stay at what was collected */
export function previewEdit(o: PlanOrderLike, rows: EditRow[], shop: { currency?: string | null; timezone?: string | null }, now = new Date()): ResolvedInstallment[] {
  const items: DepositPlanItem[] = rows.map((r) => {
    const item: DepositPlanItem = { key: r.key, label: r.label, type: 'PERCENT', value: r.value };
    if (r.due !== KEEP_DUE && !r.locked) item.dueRule = parseDueValue(r.due);
    else if (r.dueDateKey) item.dueDateKey = r.dueDateKey;
    else item.dueRule = { kind: 'ON_CREATE' };
    return item;
  });
  return effectivePlan(
    {
      totalAmount: o.totalAmount ?? 0,
      depositPlan: { v: 1, items },
      createdAt: o.createdAt ?? now,
      pickupPlanAt: o.pickupPlanAt ?? null,
      returnPlanAt: o.returnPlanAt ?? null,
      payments: rows
        .filter((r) => r.paidAmount > 0)
        .map((r) => ({ amount: r.paidAmount, status: 'COMPLETED', notes: 'INSTALLMENT', installmentKey: r.key })),
    },
    { currency: shop.currency ?? undefined, timezone: shop.timezone ?? undefined },
    { now }
  );
}

export function editProblem(rows: EditRow[], stages: ResolvedInstallment[], total: number): 'percent' | 'label' | 'over' | null {
  if (rows.some((r) => !r.label.trim())) return 'label';
  if (rows.some((r) => !r.locked && (!(r.value > 0) || r.value > 100))) return 'percent';
  const explicit = stages.filter((s) => !s.isRest).reduce((sum, s) => sum + s.amount, 0);
  if (explicit > total + 1e-9) return 'over';
  return null;
}

// ----------------------------------------------------------------------------
// Cancel
// ----------------------------------------------------------------------------

export interface CancelView {
  /** The three-line dialog applies: an open rental with a plan and money collected */
  show: boolean;
  paid: number;
  kept: number;
  refund: number;
  canEditKept: boolean;
}

/** Khách đã trả / Tiệm giữ lại / Hoàn cho khách. Staff cannot keep anything: the customer gets it all back. */
export function cancelView(o: PlanOrderLike, role: string | null | undefined, keptInput: number): CancelView {
  const paid = Math.max(0, o.depositAmount ?? 0);
  const show = hasPlan(o) && isOpenRental(o) && paid > 0;
  const canEditKept = show && canChooseKeptRole(role);
  const kept = canEditKept ? Math.min(paid, Math.max(0, Number.isFinite(keptInput) ? keptInput : 0)) : 0;
  return { show, paid, kept, refund: Math.max(0, paid - kept), canEditKept };
}

// ----------------------------------------------------------------------------
// Dashboard reminders and list badge
// ----------------------------------------------------------------------------

export interface ReminderRowLike {
  orderId: number;
  orderNumber: string;
  customerName: string | null;
  key: string;
  label: string;
  remaining: number;
  dueDateKey: string;
  lateDays: number;
}

export interface ReminderGroups {
  installmentsDue?: { count: number; orders: ReminderRowLike[] } | null;
  installmentsDueTomorrow?: { count: number; orders: ReminderRowLike[] } | null;
  installmentsOverdue?: { count: number; orders: ReminderRowLike[] } | null;
}

export interface ReminderRow {
  orderId: number;
  orderNumber: string;
  name: string;
  stage: number | null;
  amount: number;
  dueDateKey: string;
  chip: { kind: 'late'; days: number } | { kind: 'today' } | { kind: 'date'; day: string };
}

/** "i2" -> 2 (the number the stage has in the order); `rest` has none */
export const stageNumberOfKey = (key: string): number | null => {
  const m = /^i(\d)$/.exec(key);
  return m ? Number(m[1]) : null;
};

function toRow(r: ReminderRowLike, kind: 'late' | 'today' | 'date'): ReminderRow {
  return {
    orderId: r.orderId,
    orderNumber: r.orderNumber,
    name: r.customerName || '',
    stage: stageNumberOfKey(r.key),
    amount: r.remaining,
    dueDateKey: r.dueDateKey,
    chip: kind === 'late' ? { kind: 'late', days: r.lateDays } : kind === 'today' ? { kind: 'today' } : { kind: 'date', day: shortDay(r.dueDateKey) },
  };
}

/** "Cần thu hôm nay": late ones first (most days late first), then those due today */
export function dueTodayRows(g: ReminderGroups | null | undefined): ReminderRow[] {
  const late = [...(g?.installmentsOverdue?.orders ?? [])].sort((a, b) => b.lateDays - a.lateDays).map((r) => toRow(r, 'late'));
  const today = (g?.installmentsDue?.orders ?? []).map((r) => toRow(r, 'today'));
  return [...late, ...today];
}

export const dueTodayCount = (g: ReminderGroups | null | undefined): number =>
  (g?.installmentsOverdue?.count ?? 0) + (g?.installmentsDue?.count ?? 0);

/** "Sắp đến hạn": the stages due tomorrow */
export const dueSoonRows = (g: ReminderGroups | null | undefined): ReminderRow[] =>
  (g?.installmentsDueTomorrow?.orders ?? []).map((r) => toRow(r, 'date'));

export const dueSoonCount = (g: ReminderGroups | null | undefined): number => g?.installmentsDueTomorrow?.count ?? 0;

/** The cards appear only when the server sent the groups and something is waiting (ONE_TIME shops see nothing new) */
export const showsReminders = (g: ReminderGroups | null | undefined): boolean => dueTodayCount(g) + dueSoonCount(g) > 0;

export interface BadgeOrderLike {
  orderType?: string | null;
  status?: string | null;
  hasDepositPlan?: boolean | null;
  installmentSummary?: { percentCollected?: number | null } | null;
}

/**
 * "Đã thu 30%" on a rental still waiting for pick-up, only for an order that has a multi-stage deposit plan
 * (`hasDepositPlan`, sent by the list API to a client that declares `installments`). A one-time deposit order
 * has no badge, whatever mode the shop is in now (#1222).
 */
export function paidBadgePercent(o: BadgeOrderLike): number | null {
  if (o.hasDepositPlan !== true || o.orderType !== 'RENT' || o.status !== 'RESERVED') return null;
  const percent = o.installmentSummary?.percentCollected ?? 0;
  if (!(percent > 0)) return null;
  return Math.min(100, Math.round(percent));
}

