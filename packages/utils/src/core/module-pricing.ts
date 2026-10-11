import { civilDaysBetween } from './billing-dates';

/**
 * Add-ons (quantity) and modules (feature): price and limit rules, pure (#782).
 * Prices are VND per unit per month; limits are per unit.
 */

export type LimitEntity = 'outlets' | 'users' | 'products' | 'customers' | 'orders';
export type ModuleLimits = Partial<Record<LimitEntity, number>>;

export const LIMIT_ENTITIES: LimitEntity[] = ['outlets', 'users', 'products', 'customers', 'orders'];

export interface ModuleItemLike {
  kind?: string | null;
  isActive?: boolean | null;
  removeAtPeriodEnd?: boolean | null;
  quantity?: number | null;
  unitPrice?: number | null;
  limits?: unknown;
}

export interface ModuleQuote {
  /** Vietnam civil days of the whole subscription period. */
  periodDays: number;
  /** Vietnam civil days from today to the end of the period (0 when it has ended). */
  remainingDays: number;
  /** unitPrice × quantity, per month. */
  monthlyPrice: number;
  /** monthlyPrice × remainingDays / periodDays. */
  amountDue: number;
  /** `amountDue` rounded to whole VND. */
  amountDueRounded: number;
}

/**
 * Price of buying an item in the middle of the current subscription period: the monthly price for the
 * remaining Vietnam days of the period (owner rule, 2026-10-11). The item ends with the period.
 */
export function calculateModuleQuote(params: {
  unitPrice: number;
  quantity: number;
  periodStart: Date | string;
  periodEnd: Date | string;
  now?: Date;
}): ModuleQuote {
  const now = params.now ?? new Date();
  const start = new Date(params.periodStart);
  const end = new Date(params.periodEnd);
  const periodDays = Math.max(1, civilDaysBetween(start, end));
  const remainingDays = Math.max(0, Math.min(periodDays, civilDaysBetween(now, end)));
  const monthlyPrice = Math.max(0, params.unitPrice) * Math.max(0, params.quantity);
  const amountDue = remainingDays > 0 ? (monthlyPrice * remainingDays) / periodDays : 0;
  return { periodDays, remainingDays, monthlyPrice, amountDue, amountDueRounded: Math.round(amountDue) };
}

/** Per-unit limits of an item as numbers (a bad or missing value counts as 0). */
export function readModuleLimits(limits: unknown): Record<LimitEntity, number> {
  const source = (limits && typeof limits === 'object' ? limits : {}) as Record<string, unknown>;
  const out = {} as Record<LimitEntity, number>;
  for (const key of LIMIT_ENTITIES) {
    const n = Number(source[key]);
    out[key] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return out;
}

/** Σ quantity × per-unit limits of the active add-ons (features and ended items add nothing). */
export function sumModuleLimits(items: ModuleItemLike[]): Record<LimitEntity, number> {
  const total = { outlets: 0, users: 0, products: 0, customers: 0, orders: 0 };
  for (const item of items) {
    if (!item || item.isActive === false) continue;
    if ((item.kind ?? 'quantity') !== 'quantity') continue;
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const per = readModuleLimits(item.limits);
    for (const key of LIMIT_ENTITIES) total[key] += qty * per[key];
  }
  return total;
}

/**
 * Monthly price of the items a renewal charges: active and not marked for removal. A feature module counts once,
 * whatever its stored quantity.
 */
export function moduleMonthlyTotal(items: ModuleItemLike[]): number {
  let total = 0;
  for (const item of items) {
    if (!item || item.isActive === false || item.removeAtPeriodEnd) continue;
    const qty = (item.kind ?? 'quantity') === 'feature' ? 1 : Math.max(0, Math.floor(Number(item.quantity) || 0));
    total += Math.max(0, Number(item.unitPrice) || 0) * qty;
  }
  return total;
}

/** True when the item adds branches, so the shop's plan must allow more than one. */
export function addsBranches(items: ModuleItemLike | ModuleItemLike[]): boolean {
  const list = Array.isArray(items) ? items : [items];
  return list.some((i) => (i.kind ?? 'quantity') === 'quantity' && readModuleLimits(i.limits).outlets > 0);
}
