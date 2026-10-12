/**
 * #907 Feature modules a merchant can be given one by one (admin switch, optional end date).
 * A module is active when its row is enabled, not past `endsAt`, and every module it requires is active.
 * `payroll` (Tính lương, requires attendance) is not in the catalog yet; add it here when it ships.
 */
export const MODULE_KEY = {
  ATTENDANCE: 'attendance',
} as const;

export type ModuleKey = (typeof MODULE_KEY)[keyof typeof MODULE_KEY];

export interface ModuleDefinition {
  key: string;
  /** Keys that must be active for this module to be active */
  requires: string[];
}

export const MODULES: ModuleDefinition[] = [{ key: MODULE_KEY.ATTENDANCE, requires: [] }];

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
