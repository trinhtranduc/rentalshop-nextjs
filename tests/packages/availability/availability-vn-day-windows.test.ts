/**
 * #590 (timezone batch A of #578, also #575 / #576): every availability request window is read as a range of
 * Vietnam civil days, whatever shape the installed app sends, and an order is on day D iff its VN pickup day
 * ≤ D ≤ its VN return day.
 *
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh: results must be the same.
 */

import { describe, expect, it } from '@jest/globals';
import {
  orderOverlapsAvailabilityBounds,
  resolveAvailabilityQueryWindow,
} from '../../../apps/api/lib/availability-calendar-days';

const iso = (d: Date | undefined) => d?.toISOString();

/** VN day key → [00:00 VN, next 00:00 VN) as ISO strings. */
const vnBounds = (prevUtcDay: string, utcDay: string) => ({
  start: `${prevUtcDay}T17:00:00.000Z`,
  end: `${utcDay}T17:00:00.000Z`,
});

function resolved(input: Parameters<typeof resolveAvailabilityQueryWindow>[0]) {
  const w = resolveAvailabilityQueryWindow(input);
  if (!w) throw new Error(`no window for ${JSON.stringify(input)}`);
  return {
    fromYmd: w.fromYmd,
    toYmd: w.toYmd,
    bounds: { start: iso(w.bounds.start), end: iso(w.bounds.end) },
  };
}

describe('resolveAvailabilityQueryWindow: VN day range for every client shape', () => {
  it('date=D (iOS Order Check, web availability) is D', () => {
    expect(resolved({ date: '2026-11-20' })).toEqual({
      fromYmd: '2026-11-20',
      toYmd: '2026-11-20',
      bounds: vnBounds('2026-11-19', '2026-11-20'),
    });
  });

  it('App Store iOS UTC-day window T00:00:00.000Z…T23:59:59.999Z is that VN day (#575)', () => {
    expect(resolved({ startDate: '2026-11-19T00:00:00.000Z', endDate: '2026-11-19T23:59:59.999Z' })).toEqual({
      fromYmd: '2026-11-19',
      toYmd: '2026-11-19',
      bounds: vnBounds('2026-11-18', '2026-11-19'),
    });
  });

  it('old Android UTC-day window T00:00:00Z…T23:59:59Z (no ms) is that VN day (#576)', () => {
    expect(resolved({ startDate: '2026-11-19T00:00:00Z', endDate: '2026-11-19T23:59:59Z' })).toEqual({
      fromYmd: '2026-11-19',
      toYmd: '2026-11-19',
      bounds: vnBounds('2026-11-18', '2026-11-19'),
    });
  });

  it('admin create order in a UTC browser (T23:59:59.000Z) is that VN day (#576)', () => {
    expect(resolved({ startDate: '2026-11-19T00:00:00.000Z', endDate: '2026-11-19T23:59:59.000Z' })).toEqual({
      fromYmd: '2026-11-19',
      toYmd: '2026-11-19',
      bounds: vnBounds('2026-11-18', '2026-11-19'),
    });
  });

  it('old Android cart P T00:00:00Z … R T23:59:59Z (multi-day UTC-day window) is P..R', () => {
    expect(resolved({ startDate: '2026-11-20T00:00:00Z', endDate: '2026-11-22T23:59:59Z' })).toEqual({
      fromYmd: '2026-11-20',
      toYmd: '2026-11-22',
      bounds: { start: '2026-11-19T17:00:00.000Z', end: '2026-11-22T17:00:00.000Z' },
    });
  });

  it('multi-day UTC-day window across a month and a year end', () => {
    expect(resolved({ startDate: '2027-09-30T00:00:00Z', endDate: '2027-10-02T23:59:59Z' })).toEqual({
      fromYmd: '2027-09-30',
      toYmd: '2027-10-02',
      bounds: { start: '2027-09-29T17:00:00.000Z', end: '2027-10-02T17:00:00.000Z' },
    });
    expect(resolved({ startDate: '2026-12-31T00:00:00.000Z', endDate: '2027-01-01T23:59:59.999Z' })).toEqual({
      fromYmd: '2026-12-31',
      toYmd: '2027-01-01',
      bounds: { start: '2026-12-30T17:00:00.000Z', end: '2027-01-01T17:00:00.000Z' },
    });
  });

  it('web Tạo đơn dayRangeIso (00:00 VN … last ms of R in VN) is P..R and the echo is unchanged', () => {
    const w = resolveAvailabilityQueryWindow({ startDate: '2026-11-19T17:00:00.000Z', endDate: '2026-11-21T16:59:59.999Z' })!;
    expect([w.fromYmd, w.toYmd]).toEqual(['2026-11-20', '2026-11-21']);
    expect([iso(w.bounds.start), iso(w.bounds.end)]).toEqual(['2026-11-19T17:00:00.000Z', '2026-11-21T17:00:00.000Z']);
    expect([iso(w.start), iso(w.end)]).toEqual(['2026-11-19T17:00:00.000Z', '2026-11-21T16:59:59.999Z']);
  });

  it('current iOS / Android carts (00:00 VN … 23:59:59.000 VN) are P..R', () => {
    expect(resolved({ startDate: '2026-11-19T17:00:00.000Z', endDate: '2026-11-21T16:59:59.000Z' })).toEqual({
      fromYmd: '2026-11-20',
      toYmd: '2026-11-21',
      bounds: { start: '2026-11-19T17:00:00.000Z', end: '2026-11-21T17:00:00.000Z' },
    });
  });

  it('the 17:00Z boundary: 16:59:59.999Z is the VN day before, 17:00:00.000Z the next VN day', () => {
    expect(resolved({ startDate: '2026-11-19T16:59:59.999Z', endDate: '2026-11-19T17:00:00.000Z' })).toEqual({
      fromYmd: '2026-11-19',
      toYmd: '2026-11-20',
      bounds: { start: '2026-11-18T17:00:00.000Z', end: '2026-11-20T17:00:00.000Z' },
    });
  });

  it('a window that is not a UTC-day window is read by the VN days of its instants', () => {
    // starts at 00:00Z but ends before 23:59:59Z: 07:00 VN on 19/11 … 17:00 VN on 19/11
    expect(resolved({ startDate: '2026-11-19T00:00:00Z', endDate: '2026-11-19T10:00:00Z' })).toEqual({
      fromYmd: '2026-11-19',
      toYmd: '2026-11-19',
      bounds: vnBounds('2026-11-18', '2026-11-19'),
    });
  });
});

describe('orderOverlapsAvailabilityBounds: an order is on D iff VN pickup day ≤ D ≤ VN return day', () => {
  const day = (key: string) => resolveAvailabilityQueryWindow({ date: key })!.bounds;
  // web order 20/11 → 21/11: pickup 00:00 VN of 20/11, return 00:00 VN of 21/11
  const web = { pickupPlanAt: new Date('2026-11-19T17:00:00.000Z'), returnPlanAt: new Date('2026-11-20T17:00:00.000Z') };
  // iOS / Android order 20/11 → 21/11: return 23:59:59 VN of 21/11
  const app = { pickupPlanAt: new Date('2026-11-19T17:00:00.000Z'), returnPlanAt: new Date('2026-11-21T16:59:59.000Z') };

  it.each([
    ['2026-11-19', false],
    ['2026-11-20', true],
    ['2026-11-21', true],
    ['2026-11-22', false],
  ])('web and app orders 20/11 → 21/11 on %s: %s', (key, want) => {
    expect(orderOverlapsAvailabilityBounds(web, day(key))).toBe(want);
    expect(orderOverlapsAvailabilityBounds(app, day(key))).toBe(want);
  });

  it('a pickup at the next VN midnight (17:00:00.000Z) is not on D (#575)', () => {
    const o = { pickupPlanAt: new Date('2026-11-20T17:00:00.000Z'), returnPlanAt: new Date('2026-11-21T17:00:00.000Z') };
    expect(orderOverlapsAvailabilityBounds(o, day('2026-11-20'))).toBe(false);
    expect(orderOverlapsAvailabilityBounds(o, day('2026-11-21'))).toBe(true);
  });

  it('a pickup at 16:59:59.999Z is on that VN day', () => {
    const o = { pickupPlanAt: new Date('2026-11-20T16:59:59.999Z'), returnPlanAt: new Date('2026-11-20T16:59:59.999Z') };
    expect(orderOverlapsAvailabilityBounds(o, day('2026-11-20'))).toBe(true);
    expect(orderOverlapsAvailabilityBounds(o, day('2026-11-21'))).toBe(false);
  });

  it('a return at D 00:00 VN is on D', () => {
    const o = { pickupPlanAt: new Date('2026-11-17T17:00:00.000Z'), returnPlanAt: new Date('2026-11-19T17:00:00.000Z') };
    expect(orderOverlapsAvailabilityBounds(o, day('2026-11-20'))).toBe(true);
    expect(orderOverlapsAvailabilityBounds(o, day('2026-11-21'))).toBe(false);
  });

  it('same-day pickup and return (one instant) holds that day only', () => {
    const o = { pickupPlanAt: new Date('2026-11-19T17:00:00.000Z'), returnPlanAt: new Date('2026-11-19T17:00:00.000Z') };
    expect(['2026-11-19', '2026-11-20', '2026-11-21'].map((k) => orderOverlapsAvailabilityBounds(o, day(k)))).toEqual([false, true, false]);
  });

  it('an order without a return is held from its pickup day on', () => {
    const o = { pickupPlanAt: new Date('2026-11-19T17:00:00.000Z'), returnPlanAt: null };
    expect(['2026-11-19', '2026-11-20', '2026-12-25'].map((k) => orderOverlapsAvailabilityBounds(o, day(k)))).toEqual([false, true, true]);
  });

  it('an order without a pickup is never held', () => {
    expect(orderOverlapsAvailabilityBounds({ pickupPlanAt: null, returnPlanAt: new Date('2026-11-20T17:00:00.000Z') }, day('2026-11-20'))).toBe(false);
  });
});
