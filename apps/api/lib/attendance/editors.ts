import { db } from '@rentalshop/database';
import { fullName } from './timesheet';

/**
 * #924 Names of the users who made `edits`. `known` holds names already loaded (timesheet users, the person);
 * the rest (the shop owner, an admin of another outlet) come from one user lookup. A user that no longer exists
 * has no entry.
 */
export async function editorNames(
  edits: Array<{ editedById: number }>,
  known: Map<number, string> = new Map()
): Promise<Map<number, string>> {
  const names = new Map<number, string>();
  const missing: number[] = [];
  for (const id of new Set(edits.map((e) => e.editedById))) {
    const name = known.get(id);
    if (name) names.set(id, name);
    else missing.push(id);
  }
  if (missing.length > 0) {
    const users = await db.attendance.findUsersByIds(missing);
    for (const u of users as Array<{ id: number; firstName?: string | null; lastName?: string | null }>) {
      const name = fullName(u);
      if (name) names.set(u.id, name);
    }
  }
  return names;
}

/** `before` of an edit that added the record: no times. */
export function isAddedRecordEdit(before: unknown): boolean {
  const b = (before ?? null) as { checkInAt?: unknown; checkOutAt?: unknown } | null;
  return !b || (!b.checkInAt && !b.checkOutAt);
}
