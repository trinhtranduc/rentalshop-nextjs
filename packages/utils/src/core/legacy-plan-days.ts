/**
 * Orders from the Android cart before #413 (still installed on shop phones) send the Vietnam days P..R as UTC
 * boundaries: `pickupPlanAt = P T00:00:00Z`, `returnPlanAt = R T23:59:00Z` (`isoPickup` / `isoReturn`, the
 * seconds are always 00 because the app formats `atTime(23, 59)`). R 23:59Z is R+1 06:59 in Vietnam, so every
 * reader showed the return one day late (#577).
 *
 * `normalizeLegacyPlanDays` recognises that return instant and rewrites it to the instant the current apps send
 * for the same chosen day: the last second of the Vietnam day R (`R T16:59:59.000Z`, as iOS / Android since
 * #413). The pickup is NOT touched: `P T00:00:00Z` is P 07:00 in Vietnam, already the right civil day, and the
 * old app reads the first 10 characters of the stored instant back as its day (UTC day P), so moving it to
 * `P-1 T17:00Z` would show P-1 on that phone. The new return keeps the same UTC date R for that reason too.
 *
 * Why the return instant is the discriminator: every current client sends a return whose UTC seconds are not 00
 * (iOS and Android `...:59.000Z`: 23:59:59 in the device zone, whatever the zone; web / admin send
 * `T17:00:00.000Z`, a Vietnam midnight, with minutes 00 and hour 17). `T23:59:00` is only produced by the
 * old `atTime(23, 59)` formatting.
 */
import { getUtcRangeForDateKeys } from './date-range';

/** `YYYY-MM-DDT23:59:00Z` or `...T23:59:00.000Z`, exactly (not 23:59:59, not another offset). */
const LEGACY_RETURN = /^(\d{4}-\d{2}-\d{2})T23:59:00(?:\.0{1,3})?Z$/;

export interface PlanDaysInput {
  pickupPlanAt?: string | null;
  returnPlanAt?: string | null;
}

export interface NormalizedPlanDays {
  pickupPlanAt: string | null | undefined;
  returnPlanAt: string | null | undefined;
  /** true when the old Android return pattern was found and rewritten */
  legacy: boolean;
}

function validKey(key: string): boolean {
  const d = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key;
}

export function normalizeLegacyPlanDays(input: PlanDaysInput): NormalizedPlanDays {
  const { pickupPlanAt, returnPlanAt } = input;
  const ret = typeof returnPlanAt === 'string' ? LEGACY_RETURN.exec(returnPlanAt) : null;
  if (!ret || !validKey(ret[1])) {
    return { pickupPlanAt, returnPlanAt, legacy: false };
  }
  // 23:59:59.000 Vietnam time of R, the form the current apps send
  const end = getUtcRangeForDateKeys({ from: ret[1] }).end;
  return { pickupPlanAt, returnPlanAt: new Date(end.getTime() - 999).toISOString(), legacy: true };
}
