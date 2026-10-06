/**
 * Phân quyền / Quyền theo vai trò model (#542). Pure: no @rentalshop/* import, so Jest can load it.
 * Labels live in `users.web.permissions.keys.*` (keys with the dot replaced by `_`).
 */

export interface PermissionGroup {
  id: string;
  keys: readonly string[];
}

/** Extra permissions an owner or outlet admin can switch per staff (same 7 keys as the old page). */
export const EXTRA_PERMISSION_GROUPS: readonly PermissionGroup[] = [
  { id: 'orders', keys: ['orders.export', 'orders.delete'] },
  { id: 'products', keys: ['products.export'] },
  { id: 'customers', keys: ['customers.export'] },
  { id: 'users', keys: ['users.view', 'users.manage'] },
  { id: 'dashboard', keys: ['analytics.view'] },
];

/** Default permissions of a role, grouped like the old shared PermissionRoleView. */
export const ROLE_PERMISSION_GROUPS: readonly PermissionGroup[] = [
  { id: 'outlet', keys: ['outlet.view', 'outlet.manage'] },
  { id: 'users', keys: ['users.view', 'users.manage'] },
  { id: 'products', keys: ['products.view', 'products.create', 'products.update', 'products.manage', 'products.export'] },
  { id: 'orders', keys: ['orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage'] },
  { id: 'customers', keys: ['customers.view', 'customers.manage', 'customers.export'] },
  { id: 'dashboard', keys: ['analytics.view'] },
];

export const VIEWABLE_ROLES = ['OUTLET_ADMIN', 'OUTLET_STAFF'] as const;
export type ViewableRole = (typeof VIEWABLE_ROLES)[number];

export type Switches = Record<string, boolean>;

/** i18n key for a permission ("orders.export" → "orders_export"; next-intl treats dots as nesting). */
export function permissionLabelKey(key: string): string {
  return key.replace(/\./g, '_');
}

/** Same roles as the old page: ADMIN, MERCHANT, OUTLET_ADMIN. The API checks `users.manage` anyway. */
export function canManagePermissions(role?: string | null): boolean {
  const r = String(role || '').toUpperCase();
  return r === 'ADMIN' || r === 'MERCHANT' || r === 'OUTLET_ADMIN';
}

export function extraPermissionKeys(): string[] {
  return EXTRA_PERMISSION_GROUPS.flatMap((g) => [...g.keys]);
}

/**
 * Body rows for POST /api/users/permissions/bulk: every key on the page with its value, so a switch
 * turned off is saved as off (the old page filtered those out).
 */
export function permissionPayload(switches: Switches): Array<{ permission: string; enabled: boolean }> {
  return extraPermissionKeys().map((permission) => ({ permission, enabled: switches[permission] === true }));
}

/** GET /api/users/{id}/permissions `data` → switches (unknown keys ignored, missing = off). */
export function permissionsFromRows(data: unknown): Switches {
  const rows = data && typeof data === 'object' ? (data as { permissions?: unknown }).permissions : null;
  const on = new Set<string>();
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (row && typeof row === 'object' && (row as { enabled?: unknown }).enabled === true) {
        on.add(String((row as { permission?: unknown }).permission));
      }
    }
  }
  return Object.fromEntries(extraPermissionKeys().map((k) => [k, on.has(k)]));
}

export function groupState(switches: Switches, groupId: string): 'all' | 'some' | 'none' {
  const group = EXTRA_PERMISSION_GROUPS.find((g) => g.id === groupId);
  if (!group) return 'none';
  const n = group.keys.filter((k) => switches[k] === true).length;
  return n === 0 ? 'none' : n === group.keys.length ? 'all' : 'some';
}

/** "Bật hết" / "Tắt hết" for one module: all on unless all are already on. */
export function toggleGroup(switches: Switches, groupId: string): Switches {
  const group = EXTRA_PERMISSION_GROUPS.find((g) => g.id === groupId);
  if (!group) return switches;
  const value = groupState(switches, groupId) !== 'all';
  const next = { ...switches };
  for (const k of group.keys) next[k] = value;
  return next;
}

export interface RoleGrantGroup {
  id: string;
  items: Array<{ key: string; granted: boolean }>;
}

/** Read-only view: which permission of each module a role gets by default (`ROLE_PERMISSIONS`). */
export function roleGrants(defaults: Partial<Record<string, readonly string[]>>, role: string): RoleGrantGroup[] {
  const granted = new Set(defaults[role] || []);
  return ROLE_PERMISSION_GROUPS.map((g) => ({ id: g.id, items: g.keys.map((key) => ({ key, granted: granted.has(key) })) }));
}
