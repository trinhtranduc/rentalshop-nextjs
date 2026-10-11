/**
 * #744: when must a `useAuth()` instance take the user from storage?
 *
 * Every component that calls `useAuth()` keeps its own state, and they are tied together only by localStorage
 * (`storeAuthData` fires `auth-storage-change`). The sync used to run only when the user id changed, so a saved name
 * or phone reached the instance that saved it (through `refreshUser`) but never the sidebar. These are the fields the
 * shell shows; when one of them differs, the instance takes the stored user. The instance that just refreshed holds
 * the same values, so it keeps its richer state.
 */
export interface SyncedUser {
  id?: number | string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  isActive?: boolean | null;
  updatedAt?: string | Date | null;
}

export function userSyncSignature(user: SyncedUser | null | undefined): string {
  if (!user) return '';
  const updatedAt = user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt ?? '';
  return [user.id, user.firstName, user.lastName, user.name, user.phone, user.email, user.role, user.isActive, updatedAt]
    .map((v) => (v === null || v === undefined ? '' : String(v)))
    .join('|');
}

/** True when the state should take `stored` (a different user, or the same user with other shown fields) */
export function storedUserDiffers(current: SyncedUser | null | undefined, stored: SyncedUser | null | undefined): boolean {
  if (!stored) return false;
  return userSyncSignature(current) !== userSyncSignature(stored);
}
