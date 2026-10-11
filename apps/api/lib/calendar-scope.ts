import { USER_ROLE, isPlatformOpsRole, isOutletRole } from '@rentalshop/constants';
import { formatDateKeyInTimeZone, getLocalDateKey } from '@rentalshop/utils';

/**
 * Order scope for the calendar routes (#362): a merchant's `outletId` filter stays inside its merchant,
 * outlet roles always see their own outlet, platform roles may filter by any outlet.
 */
export function calendarScopeWhere(
  user: { role: string },
  userScope: { merchantId?: number | null; outletId?: number | null },
  outletId?: number
): Record<string, any> {
  if (isPlatformOpsRole(user.role)) {
    return outletId ? { outletId } : {};
  }
  if (isOutletRole(user.role)) {
    return { outletId: userScope.outletId ?? -1 };
  }
  if (user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
    // One relation filter: db.orders.search drops `outlet` when a top-level `outletId` is present
    return { outlet: { ...(outletId ? { id: outletId } : {}), merchantId: userScope.merchantId } };
  }
  // Any other role sees nothing here
  return { outletId: -1 };
}

/** Day key of an instant: the caller's time zone when sent and valid, the Vietnam day otherwise */
export function calendarDayKey(timeZone?: string): (instant: Date | string) => string {
  if (timeZone) {
    return (instant) => formatDateKeyInTimeZone(new Date(instant), timeZone);
  }
  return (instant) => getLocalDateKey(instant) as string;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
