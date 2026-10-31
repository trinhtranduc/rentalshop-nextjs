/**
 * Plan limit add-on helpers.
 *
 * #826 used to sell extra outlets only on a multi-branch plan (`limits.outlets` > 1 or -1). #1187 sells extra
 * outlets on any plan, same as extra users. `isMultiBranchPlan` remains for display (`GET …/addons` `multiBranchPlan`).
 *
 * `outlets: 0` is still not multi-branch. The plan form only accepts -1 (unlimited) or a positive number, and
 * the "0 = unlimited" fallback in plan-limits.ts only exists so legacy rows never block.
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

/**
 * #782: the plan is Basic. `Plan` has no tier column and `limits.allowWebAccess` does not separate Basic (true in
 * production, `apps/client/lib/pricing-format.ts`), so the name decides, by the same rule as the RevenueCat webhook:
 * contains "basic", any case. A plan renamed without that word is not recognised.
 */
export function isBasicPlanName(name: string | null | undefined): boolean {
  return (name || '').toLowerCase().includes('basic');
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
 * #1187: extra outlets are a paid add-on on any plan, so a plan switch is never blocked by them.
 * Arguments kept so callers (`changePlan`) stay the same.
 */
export function outletAddonsBlockPlan(_items: AddonForPlanSwitch[], _newPlanLimits: unknown, _now: Date = new Date()): boolean {
  return false;
}
