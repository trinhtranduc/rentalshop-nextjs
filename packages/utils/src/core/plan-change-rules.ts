/**
 * Who may change which plan, and when (#785, owner rules of 2026-10-11).
 *
 * A plan is changed only in a new period. In the middle of a period a merchant changes nothing, and an admin may
 * only upgrade (the new plan costs more per month; the credit for the unused days is #779). A downgrade waits for
 * the new period. "New period" = the subscription has ended, or it is a trial being turned into a paid plan.
 */

export type PlanChangeRefusalCode = 'PLAN_CHANGE_ONLY_AT_NEW_PERIOD' | 'DOWNGRADE_ONLY_AT_NEW_PERIOD';

export type PlanChangeDecision =
  | { allowed: true; newPeriod: boolean; isUpgrade: boolean }
  | { allowed: false; code: PlanChangeRefusalCode | 'FORBIDDEN'; status: number };

export interface PlanChangeInput {
  role: string;
  status?: string | null;
  currentPeriodEnd?: Date | string | null;
  currentPlanId?: number | null;
  currentBasePrice: number;
  newPlanId: number;
  newBasePrice: number;
  now?: Date;
}

/** The subscription has ended (or has no end), or it is a trial. */
export function isNewPeriod(input: Pick<PlanChangeInput, 'status' | 'currentPeriodEnd' | 'now'>): boolean {
  const now = input.now ?? new Date();
  if (String(input.status ?? '').toUpperCase() === 'TRIAL') return true;
  if (!input.currentPeriodEnd) return true;
  const end = new Date(input.currentPeriodEnd);
  return Number.isNaN(end.getTime()) || end.getTime() <= now.getTime();
}

export function canChangePlan(input: PlanChangeInput): PlanChangeDecision {
  const role = String(input.role ?? '').toUpperCase();
  const isPlatform = role === 'ADMIN' || role === 'OPS';
  if (!isPlatform && role !== 'MERCHANT') return { allowed: false, code: 'FORBIDDEN', status: 403 };

  const isUpgrade = input.newBasePrice > input.currentBasePrice;
  if (isNewPeriod(input)) return { allowed: true, newPeriod: true, isUpgrade };

  if (!isPlatform) return { allowed: false, code: 'PLAN_CHANGE_ONLY_AT_NEW_PERIOD', status: 403 };
  const samePlan = input.currentPlanId != null && input.currentPlanId === input.newPlanId;
  if (!isUpgrade || samePlan) return { allowed: false, code: 'DOWNGRADE_ONLY_AT_NEW_PERIOD', status: 422 };
  return { allowed: true, newPeriod: false, isUpgrade: true };
}
