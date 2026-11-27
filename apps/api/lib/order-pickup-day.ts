/**
 * #1684 no rental order for a day before today. The day is the Vietnam civil day (`timezone-dates`): today is always
 * allowed, even when the hour of the pickup has passed, because a same-day pickup and return still occupies today.
 *
 * Only a client that sends the `no-past-orders` capability is held to it. The iOS / Android builds installed on
 * `main-real` never send it, so for them nothing changes. Import-light on purpose: unit tests do not need the utils barrel.
 */
import { hasCapability } from './client-capabilities';
import { toAvailabilityCivilDateKey } from './availability-calendar-days';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** The Vietnam day key of a pickup sent as an instant or as a `YYYY-MM-DD` day; null when it is missing or unreadable. */
function pickupDayKey(pickupPlanAt: string | Date | null | undefined): string | null {
  if (pickupPlanAt == null || pickupPlanAt === '') return null;
  if (typeof pickupPlanAt === 'string' && DAY_KEY.test(pickupPlanAt.trim())) return pickupPlanAt.trim();
  const at = pickupPlanAt instanceof Date ? pickupPlanAt : new Date(pickupPlanAt);
  return Number.isFinite(at.getTime()) ? toAvailabilityCivilDateKey(at) : null;
}

/** True when the pickup day is before today (both Vietnam days). A missing or unreadable pickup is not "in the past". */
export function isPickupBeforeToday(pickupPlanAt: string | Date | null | undefined, now: Date = new Date()): boolean {
  const pickup = pickupDayKey(pickupPlanAt);
  return pickup !== null && pickup < toAvailabilityCivilDateKey(now);
}

/** What `POST /api/orders` asks: a capable client, a rental, a pickup day before today. */
export function rejectsPastPickup(
  request: { headers?: { get(name: string): string | null } | null },
  orderType: string | undefined,
  pickupPlanAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  return hasCapability(request, 'no-past-orders') && orderType === 'RENT' && isPickupBeforeToday(pickupPlanAt, now);
}
