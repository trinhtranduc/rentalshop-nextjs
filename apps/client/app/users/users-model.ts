/**
 * Nhân viên list model (#528, board Nhan-vien). Pure: no @rentalshop/utils import, so Jest can
 * load it. Day logic takes an injected `toDayKey` (getLocalDateKey, Vietnam civil day).
 */

export type StaffRoleTone = 'owner' | 'admin' | 'staff' | 'other';

export interface StaffLike {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  isActive?: boolean | null;
  lastLoginAt?: string | Date | null;
  outlet?: { id?: number | null; name?: string | null } | null;
  outletId?: number | null;
}

export const STAFF_PAGE_SIZES = [10, 20, 50, 100] as const;

/** OUTLET_STAFF has no `users.view`: the page is not for them (same as the hidden nav item). */
export function canSeeStaffPage(role?: string | null): boolean {
  const r = String(role || '').toUpperCase();
  return !!r && r !== 'OUTLET_STAFF';
}

/** Only merchants pick an outlet; outlet admins are scoped to theirs by the API. */
export function canFilterByOutlet(role?: string | null): boolean {
  const r = String(role || '').toUpperCase();
  return r === 'MERCHANT' || r === 'ADMIN';
}

/** Activate / deactivate / delete: never on a platform ADMIN row (old UserTable rule) or on yourself. */
export function canManageRow(row: StaffLike, viewerId?: number | null): boolean {
  return String(row.role || '').toUpperCase() !== 'ADMIN' && row.id !== viewerId;
}

export function roleTone(role?: string | null): StaffRoleTone {
  switch (String(role || '').toUpperCase()) {
    case 'MERCHANT':
      return 'owner';
    case 'OUTLET_ADMIN':
      return 'admin';
    case 'OUTLET_STAFF':
      return 'staff';
    default:
      return 'other';
  }
}

export function staffName(u: StaffLike): string {
  const full = [u.firstName, u.lastName].filter((s) => s && String(s).trim()).join(' ').trim();
  return full || (u.name || '').trim() || (u.email || '').trim() || `#${u.id}`;
}

/** Board avatars: first letter of the last two words ("Trần Thị Lan" → "TL"). */
export function staffInitials(u: StaffLike): string {
  const words = staffName(u)
    .replace(/^#/, '')
    .split(/[\s@._-]+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  const pick = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return pick
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();
}

/** Phone first (the board), then email. */
export function staffContact(u: StaffLike): string {
  return (u.phone || '').trim() || (u.email || '').trim();
}

export function parseOutletParam(value: string | null | undefined): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function parseStaffPage(value: string | null | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function parseStaffPageSize(value: string | null | undefined): number {
  const n = Number(value);
  return (STAFF_PAGE_SIZES as readonly number[]).includes(n) ? n : 20;
}

export interface StaffPage<T> {
  rows: T[];
  total: number;
  totalPages: number;
}

/**
 * GET /api/users answers `{ data: [...], pagination: { total, totalPages } }`; older shapes nest
 * `{ data: { users, total, totalPages } }`. Both are read here.
 */
export function readStaffPage<T = StaffLike>(res: unknown, limit: number): StaffPage<T> | null {
  if (!res || typeof res !== 'object' || !(res as { success?: unknown }).success) return null;
  const data = (res as { data?: unknown }).data;
  const pagination = ((res as { pagination?: unknown }).pagination || {}) as { total?: number; totalPages?: number };
  if (Array.isArray(data)) {
    const total = Number(pagination.total ?? data.length) || 0;
    const totalPages = Number(pagination.totalPages) || Math.max(1, Math.ceil(total / Math.max(1, limit)));
    return { rows: data as T[], total, totalPages: Math.max(1, totalPages) };
  }
  if (data && typeof data === 'object') {
    const nested = data as { users?: T[]; total?: number; totalPages?: number };
    const rows = Array.isArray(nested.users) ? nested.users : [];
    const total = Number(nested.total ?? rows.length) || 0;
    return { rows, total, totalPages: Math.max(1, Number(nested.totalPages) || Math.ceil(total / Math.max(1, limit))) };
  }
  return null;
}

export type LastSeen =
  | { kind: 'never' }
  | { kind: 'today'; time: string }
  | { kind: 'yesterday'; time: string }
  | { kind: 'day'; dateKey: string };

/**
 * "Đăng nhập gần nhất": today / yesterday with the time, older as a day. `toDayKey` gives the
 * Vietnam civil day, `toTime` the Vietnam HH:mm.
 */
export function lastSeen(
  at: string | Date | null | undefined,
  now: Date,
  toDayKey: (d: Date | string) => string,
  toTime: (d: Date) => string,
): LastSeen {
  if (!at) return { kind: 'never' };
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return { kind: 'never' };
  const key = toDayKey(d);
  if (!key) return { kind: 'never' };
  if (key === toDayKey(now)) return { kind: 'today', time: toTime(d) };
  if (key === toDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return { kind: 'yesterday', time: toTime(d) };
  return { kind: 'day', dateKey: key };
}
