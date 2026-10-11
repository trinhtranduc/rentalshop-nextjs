/**
 * Plan limit add-on rules (#826, owner decision 5 of #823).
 *
 * A branch add-on (a PlanLimitAddon with `outlets > 0`) is only for a multi-branch plan: the plan's
 * `limits.outlets` is greater than 1, or -1 (unlimited). `limits` may be stored as a JSON string.
 *
 * `outlets: 0` counts as single-branch here. The plan form only accepts -1 (unlimited) or a positive number, and
 * the "0 = unlimited" fallback in plan-limits.ts only exists so legacy rows never block; it does not make a plan
 * a multi-branch plan. A missing `outlets` (or unreadable limits) is not a multi-branch plan either.
 */

export const ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN = 'ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN' as const;

function readOutletsLimit(limits: unknown): number | null {
  let value: unknown = limits;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const outlets = Number((value as { outlets?: unknown }).outlets);
  return Number.isFinite(outlets) ? outlets : null;
}

/** The plan allows more than one branch: `limits.outlets` > 1 or -1 (unlimited). */
export function isMultiBranchPlan(limits: unknown): boolean {
  const outlets = readOutletsLimit(limits);
  return outlets !== null && (outlets === -1 || outlets > 1);
}

interface AddonOutletsState {
  outlets?: number | null;
  isActive?: boolean | null;
}

/**
 * The add-on would add branches after this write: it ends with `outlets > 0` while active, and either the
 * outlets go up (a new add-on starts at 0) or an inactive add-on is turned back on. Lowering, unchanged
 * outlets, notes, or turning it off never count.
 */
export function addonAddsBranches(before: AddonOutletsState | null, after: AddonOutletsState): boolean {
  const oldOutlets = Number(before?.outlets ?? 0);
  const newOutlets = Number(after.outlets ?? oldOutlets);
  const wasActive = before ? before.isActive !== false : false;
  const isActive = after.isActive ?? (before ? before.isActive !== false : true);
  if (!isActive || newOutlets <= 0) return false;
  return newOutlets > oldOutlets || !wasActive;
}

interface AddonForPlanSwitch {
  outlets?: number | null;
  isActive?: boolean | null;
  removeAtPeriodEnd?: boolean | null;
  endsAt?: Date | string | null;
}

/**
 * #870: a plan without multi-branch cannot be chosen while the shop has a branch add-on that still counts and is not
 * marked for removal (the admin removes the branch add-ons first).
 */
export function outletAddonsBlockPlan(items: AddonForPlanSwitch[], newPlanLimits: unknown, now: Date = new Date()): boolean {
  if (isMultiBranchPlan(newPlanLimits)) return false;
  return items.some((item) => {
    if (!item || item.isActive === false || item.removeAtPeriodEnd) return false;
    if (item.endsAt && new Date(item.endsAt).getTime() <= now.getTime()) return false;
    return Number(item.outlets ?? 0) > 0;
  });
}
