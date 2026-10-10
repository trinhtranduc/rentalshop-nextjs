/**
 * #577: the Android cart before #413 sends `P T00:00:00Z` / `R T23:59:00Z`. The API stores the chosen Vietnam days.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh: results must be identical (Vietnam has no DST).
 */
import { normalizeLegacyPlanDays } from '../../../packages/utils/src/core/legacy-plan-days';
import { countRentalDays } from '../../../packages/utils/src/core/rental-days';
import { toDateKeyInTimeZone } from '../../../packages/utils/src/core/date-range';

const vnDay = (iso: string) => toDateKeyInTimeZone(new Date(iso), 'Asia/Ho_Chi_Minh');

describe('normalizeLegacyPlanDays (#577)', () => {
  test('old Android return becomes the last second of R, Vietnam time; the pickup is kept', () => {
    const r = normalizeLegacyPlanDays({ pickupPlanAt: '2026-11-16T00:00:00Z', returnPlanAt: '2026-11-16T23:59:00Z' });
    expect(r).toEqual({
      pickupPlanAt: '2026-11-16T00:00:00Z',
      returnPlanAt: '2026-11-16T16:59:59.000Z',
      legacy: true
    });
    // pickup 07:00 VN and return 23:59:59 VN are both on the chosen day, in UTC too (the old app reads the UTC date)
    expect(vnDay(r.pickupPlanAt as string)).toBe('2026-11-16');
    expect(vnDay(r.returnPlanAt as string)).toBe('2026-11-16');
    expect((r.returnPlanAt as string).slice(0, 10)).toBe('2026-11-16');
    expect(countRentalDays(r.pickupPlanAt, r.returnPlanAt)).toBe(1);
  });

  test('same return instant as the current apps send for the same day, with .000Z too', () => {
    const r = normalizeLegacyPlanDays({ pickupPlanAt: '2027-09-30T00:00:00.000Z', returnPlanAt: '2027-10-02T23:59:00.000Z' });
    expect(r.returnPlanAt).toBe('2027-10-02T16:59:59.000Z');
    expect(countRentalDays(r.pickupPlanAt, r.returnPlanAt)).toBe(3);
  });

  test('cross-year', () => {
    const r = normalizeLegacyPlanDays({ pickupPlanAt: '2026-12-31T00:00:00Z', returnPlanAt: '2027-01-01T23:59:00Z' });
    expect(vnDay(r.pickupPlanAt as string)).toBe('2026-12-31');
    expect(vnDay(r.returnPlanAt as string)).toBe('2027-01-01');
  });

  test('return alone (edit) is rewritten, a missing pickup stays missing', () => {
    const r = normalizeLegacyPlanDays({ returnPlanAt: '2026-11-16T23:59:00Z' });
    expect(r.legacy).toBe(true);
    expect(r.returnPlanAt).toBe('2026-11-16T16:59:59.000Z');
    expect(r.pickupPlanAt).toBeUndefined();
  });

  test.each([
    ['iOS / Android return 23:59:59 VN', '2026-11-16T16:59:59.000Z'],
    ['web return (00:00 VN)', '2026-11-15T17:00:00.000Z'],
    ['old UTC-day window end', '2026-11-16T23:59:59.999Z'],
    ['seconds 59 without ms', '2026-11-16T23:59:59Z'],
    ['23:59:01', '2026-11-16T23:59:01Z'],
    ['23:59:00.500', '2026-11-16T23:59:00.500Z'],
    ['23:58:00', '2026-11-16T23:58:00Z'],
    ['00:00:00', '2026-11-16T00:00:00Z'],
    ['other offset', '2026-11-16T23:59:00+07:00'],
    ['date key only', '2026-11-16'],
    ['not a date', 'tomorrow'],
    ['impossible day', '2026-02-30T23:59:00Z']
  ])('near miss is untouched: %s', (_name, ret) => {
    const r = normalizeLegacyPlanDays({ pickupPlanAt: '2026-11-16T00:00:00Z', returnPlanAt: ret });
    expect(r).toEqual({ pickupPlanAt: '2026-11-16T00:00:00Z', returnPlanAt: ret, legacy: false });
  });

  test('a pickup T00:00:00Z alone (iOS device set to UTC) is not rewritten', () => {
    const r = normalizeLegacyPlanDays({ pickupPlanAt: '2026-11-16T00:00:00.000Z', returnPlanAt: '2026-11-17T23:59:59.000Z' });
    expect(r.legacy).toBe(false);
    expect(r.pickupPlanAt).toBe('2026-11-16T00:00:00.000Z');
  });

  test('null and undefined pass through', () => {
    expect(normalizeLegacyPlanDays({})).toEqual({ pickupPlanAt: undefined, returnPlanAt: undefined, legacy: false });
    expect(normalizeLegacyPlanDays({ pickupPlanAt: null, returnPlanAt: null }).legacy).toBe(false);
  });

  test('idempotent: the output is not a legacy pattern', () => {
    const once = normalizeLegacyPlanDays({ pickupPlanAt: '2026-11-16T00:00:00Z', returnPlanAt: '2026-11-18T23:59:00Z' });
    const twice = normalizeLegacyPlanDays(once);
    expect(twice.legacy).toBe(false);
    expect(twice.returnPlanAt).toBe(once.returnPlanAt);
  });
});
