import { hasLoyaltyFeature } from './subscription';

/**
 * #907 Feature modules a merchant can be given one by one (admin switch, optional end date).
 * A module is active when its row is enabled, not past `endsAt`, and every module it requires is active.
 * `payroll` (Tính lương, requires attendance) is not in the catalog yet; add it here when it ships.
 * #967 `loyalty` (Khách thân thiết): on through the plan `features` or a feature add-on.
 */
export const MODULE_KEY = {
  ATTENDANCE: 'attendance',
  LOYALTY: 'loyalty',
} as const;

export type ModuleKey = (typeof MODULE_KEY)[keyof typeof MODULE_KEY];

export interface ModuleDefinition {
  key: string;
  /** Keys that must be active for this module to be active */
  requires: string[];
}

export const MODULES: ModuleDefinition[] = [
  { key: MODULE_KEY.ATTENDANCE, requires: [] },
  { key: MODULE_KEY.LOYALTY, requires: [] },
];

/** #967 module keys a plan includes through its `features` list (plan with `loyalty` → ['loyalty']). */
export function planModuleKeys(planFeatures: unknown): string[] {
  return hasLoyaltyFeature(planFeatures) ? [MODULE_KEY.LOYALTY] : [];
}

export interface MerchantModuleState {
  key: string;
  enabled: boolean;
  endsAt: Date | string | null;
}

/** Active module keys (catalog order) from the stored rows at `now`. Unknown keys are ignored. */
export function resolveActiveModules(
  rows: MerchantModuleState[],
  now: Date = new Date(),
  catalog: ModuleDefinition[] = MODULES
): string[] {
  const on = new Set(
    rows
      .filter((r) => r.enabled && (r.endsAt == null || new Date(r.endsAt).getTime() > now.getTime()))
      .map((r) => r.key)
  );
  const byKey = new Map(catalog.map((m) => [m.key, m]));
  const active = (key: string, seen: Set<string>): boolean => {
    const def = byKey.get(key);
    if (!def || !on.has(key) || seen.has(key)) return false;
    const next = new Set(seen).add(key);
    return def.requires.every((r) => active(r, next));
  };
  return catalog.filter((m) => active(m.key, new Set())).map((m) => m.key);
}

/** #943 a shop's feature add-on as read for the module rule (PlanLimitAddon with a featureKey). */
export interface FeatureAddonState {
  featureKey: string | null;
  isActive: boolean | null;
  endsAt: Date | string | null;
}

const addonLive = (a: FeatureAddonState, now: Date) =>
  !!a.featureKey && a.isActive !== false && (a.endsAt == null || new Date(a.endsAt).getTime() > now.getTime());

/**
 * #943: module states from both sources: the legacy #907 rows (kept working) and the shop's feature add-ons. An
 * add-on counts as an enabled row while it is switched on and not past `endsAt`. #967: `planKeys` (from
 * `planModuleKeys`) count as rows that never end. Feed the result to `resolveActiveModules` (catalog and `requires`
 * rules unchanged).
 */
export function mergeModuleSources(
  rows: MerchantModuleState[],
  featureAddons: FeatureAddonState[],
  now: Date = new Date(),
  planKeys: string[] = []
): MerchantModuleState[] {
  const fromAddons: MerchantModuleState[] = featureAddons
    .filter((a) => addonLive(a, now))
    .map((a) => ({ key: a.featureKey as string, enabled: true, endsAt: a.endsAt ?? null }));
  const fromPlan: MerchantModuleState[] = planKeys.map((key) => ({ key, enabled: true, endsAt: null }));
  return [...rows, ...fromAddons, ...fromPlan];
}

export interface ModuleSourceView {
  key: string;
  /** On (any source, `requires` met) */
  active: boolean;
  /** Included in the plan (`features`) */
  plan: boolean;
  /** An un-ended feature add-on */
  addon: boolean;
  /** A legacy #907 switch row still on */
  legacy: boolean;
}

/** #967 per catalog module: on or off, and where it comes from (admin "theo gói / theo add-on"). */
export function describeModuleSources(input: {
  rows: MerchantModuleState[];
  featureAddons: FeatureAddonState[];
  planFeatures: unknown;
  now?: Date;
}): ModuleSourceView[] {
  const now = input.now ?? new Date();
  const planKeys = planModuleKeys(input.planFeatures);
  const active = new Set(resolveActiveModules(mergeModuleSources(input.rows, input.featureAddons, now, planKeys), now));
  const live = (r: MerchantModuleState) => r.enabled && (r.endsAt == null || new Date(r.endsAt).getTime() > now.getTime());
  return MODULES.map((m) => ({
    key: m.key,
    active: active.has(m.key),
    plan: planKeys.includes(m.key),
    addon: input.featureAddons.some((a) => a.featureKey === m.key && addonLive(a, now)),
    legacy: input.rows.some((r) => r.key === m.key && live(r)),
  }));
}
