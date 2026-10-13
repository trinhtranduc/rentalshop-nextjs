/**
 * #927 Who must clock in. `User.attendanceRequired` null = role default: OUTLET_STAFF and OUTLET_INVENTORY yes,
 * OUTLET_ADMIN and MERCHANT no. Only chosen people punch IN, can be scheduled, and fill Xếp ca / Bảng công
 * (plus anyone with records in the period).
 */
import { AttendanceHttpError } from './http';

const fullName = (u: { firstName?: string | null; lastName?: string | null }) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ').trim();

export const REQUIRED_BY_DEFAULT_ROLES = ['OUTLET_STAFF', 'OUTLET_INVENTORY'] as const;

export interface MemberRow {
  id: number;
  role?: string | null;
  attendanceRequired?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
}

export const roleDefaultRequired = (role: string | null | undefined) =>
  (REQUIRED_BY_DEFAULT_ROLES as readonly string[]).includes(role ?? '');

export function isRequired(u: Pick<MemberRow, 'role' | 'attendanceRequired'>): boolean {
  return u.attendanceRequired ?? roleDefaultRequired(u.role);
}

export function memberView(u: MemberRow) {
  return {
    userId: u.id,
    name: fullName(u),
    role: u.role ?? null,
    required: isRequired(u),
    isDefault: u.attendanceRequired == null,
  };
}

/** The value to store for a choice: null when it equals the role default (back to "theo vai trò"). */
export const storedRequired = (role: string | null | undefined, required: boolean): boolean | null =>
  required === roleDefaultRequired(role) ? null : required;

/** 409 ATTENDANCE_NOT_REQUIRED naming every target that is not chosen. */
export function assertAllRequired(targets: MemberRow[]) {
  const blocked = targets.filter((t) => !isRequired(t));
  if (blocked.length === 0) return;
  const users = blocked.map((u) => ({ id: u.id, name: fullName(u) || `#${u.id}` }));
  throw new AttendanceHttpError('ATTENDANCE_NOT_REQUIRED', 409, { users, messageParams: { names: users.map((u) => u.name).join(', ') } });
}

/** Chosen members plus anyone else with records in the period (`recordUserIds`), members first. */
export function listedPeople<T extends MemberRow>(members: T[], recordUserIds: Iterable<number>): { listed: T[]; missing: number[] } {
  const withRecords = new Set<number>(recordUserIds);
  const listed = members.filter((m) => isRequired(m) || withRecords.has(m.id));
  const known = new Set<number>(members.map((m) => m.id));
  const missing = [...withRecords].filter((id) => !known.has(id));
  return { listed, missing };
}
