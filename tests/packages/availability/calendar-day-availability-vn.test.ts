/**
 * Order Check occupancy calendar — VN civil days (same model as Lịch Thuê).
 *
 * Imports pure helpers only (no @rentalshop/utils barrel) so Jest can run without TSX.
 */

import { describe, expect, it } from '@jest/globals';
import {
  calendarDayAvailability,
  getAvailabilityCivilDayBounds,
  occupiedDateKeysForRange,
  resolveAvailabilityQueryWindow,
  toAvailabilityCivilDateKey,
} from '../../../apps/api/lib/availability-calendar-days';

describe('getAvailabilityCivilDayBounds', () => {
  it('maps VN Aug 31 to UTC [Aug 30 17:00, Aug 31 17:00)', () => {
    const bounds = getAvailabilityCivilDayBounds('2026-08-31');
    expect(bounds?.start.toISOString()).toBe('2026-08-30T17:00:00.000Z');
    expect(bounds?.end.toISOString()).toBe('2026-08-31T17:00:00.000Z');
  });
});

describe('toAvailabilityCivilDateKey', () => {
  it('maps UTC instant at VN midnight to the VN civil day', () => {
    expect(toAvailabilityCivilDateKey(new Date('2026-08-27T17:00:00.000Z'))).toBe('2026-08-28');
  });
});

describe('occupiedDateKeysForRange', () => {
  it('marks inclusive pickup..return civil days (mobile date-picker model)', () => {
    const occupied = occupiedDateKeysForRange(
      [
        {
          pickupPlanAt: new Date('2026-08-09T17:00:00.000Z'), // 10/08 VN
          returnPlanAt: new Date('2026-08-11T17:00:00.000Z'), // 12/08 VN (inclusive last day)
        },
      ],
      '2026-08-01',
      '2026-08-31'
    );
    expect(occupied).toEqual(['2026-08-10', '2026-08-11', '2026-08-12']);
  });
});

describe('calendarDayAvailability', () => {
  it('returns remaining stock per VN civil day after overlapping rental qty', () => {
    const days = calendarDayAvailability({
      stock: 10,
      fromYmd: '2026-08-09',
      toYmd: '2026-08-13',
      orders: [
        {
          pickupPlanAt: new Date('2026-08-09T17:00:00.000Z'), // 10/08 VN
          returnPlanAt: new Date('2026-08-11T17:00:00.000Z'), // 12/08 VN inclusive
          quantity: 3,
        },
      ],
    });

    expect(days).toEqual([
      { date: '2026-08-09', booked: 0, available: 10 },
      { date: '2026-08-10', booked: 3, available: 7 },
      { date: '2026-08-11', booked: 3, available: 7 },
      { date: '2026-08-12', booked: 3, available: 7 },
      { date: '2026-08-13', booked: 0, available: 10 },
    ]);
  });

  it('maps VN Aug 31 pickup to day 31, not UTC day 30 (screenshot regression)', () => {
    const days = calendarDayAvailability({
      stock: 1,
      fromYmd: '2026-08-29',
      toYmd: '2026-09-05',
      orders: [
        {
          pickupPlanAt: new Date('2026-08-30T17:00:00.000Z'), // 31/08 00:00 VN
          returnPlanAt: new Date('2026-09-03T17:00:00.000Z'), // 04/09 00:00 VN inclusive
          quantity: 1,
        },
      ],
    });

    const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
    expect(byDate['2026-08-30']).toEqual({ date: '2026-08-30', booked: 0, available: 1 });
    expect(byDate['2026-08-31']).toEqual({ date: '2026-08-31', booked: 1, available: 0 });
    expect(byDate['2026-09-01']).toEqual({ date: '2026-09-01', booked: 1, available: 0 });
    expect(byDate['2026-09-02']).toEqual({ date: '2026-09-02', booked: 1, available: 0 });
    expect(byDate['2026-09-03']).toEqual({ date: '2026-09-03', booked: 1, available: 0 });
    expect(byDate['2026-09-04']).toEqual({ date: '2026-09-04', booked: 1, available: 0 });
    expect(byDate['2026-09-05']).toEqual({ date: '2026-09-05', booked: 0, available: 1 });
  });

  it('same-day rental (pickup==return VN midnight) books that day — Aug 28 screenshot', () => {
    const days = calendarDayAvailability({
      stock: 1,
      fromYmd: '2026-08-25',
      toYmd: '2026-08-31',
      orders: [
        {
          // Ngày thuê 28/08, Ngày trả 28/08 — mobile stores both as 28 VN 00:00
          pickupPlanAt: new Date('2026-08-27T17:00:00.000Z'),
          returnPlanAt: new Date('2026-08-27T17:00:00.000Z'),
          quantity: 1,
        },
      ],
    });

    const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
    expect(byDate['2026-08-27']).toEqual({ date: '2026-08-27', booked: 0, available: 1 });
    expect(byDate['2026-08-28']).toEqual({ date: '2026-08-28', booked: 1, available: 0 });
    expect(byDate['2026-08-29']).toEqual({ date: '2026-08-29', booked: 0, available: 1 });
  });
});

describe('resolveAvailabilityQueryWindow (store app UTC day to VN civil day)', () => {
  // Same overlap used by GET /availability after window resolve.
  const overlaps = (orderPickup, orderReturn, rentalStart, rentalEnd) =>
    orderPickup < rentalEnd && orderReturn >= rentalStart;

  it('maps store Order Check T00:00Z-T23:59Z on 27/08 to VN day 27 bounds', () => {
    const window = resolveAvailabilityQueryWindow({
      startDate: '2026-08-27T00:00:00.000Z',
      endDate: '2026-08-27T23:59:59.999Z',
    });
    expect(window?.civilDayYmd).toBe('2026-08-27');
    expect(window?.start.toISOString()).toBe('2026-08-26T17:00:00.000Z');
    expect(window?.end.toISOString()).toBe('2026-08-27T17:00:00.000Z');
  });

  it('screenshot regression: tap 27 must NOT conflict same-day order on 28', () => {
    // Store app still sends UTC civil day for the tapped calendar cell
    const window = resolveAvailabilityQueryWindow({
      startDate: '2026-08-27T00:00:00.000Z',
      endDate: '2026-08-27T23:59:59.999Z',
    });

    const orderOn28Pickup = new Date('2026-08-27T17:00:00.000Z'); // 28/08 00:00 VN
    const orderOn28Return = new Date('2026-08-27T17:00:00.000Z');

    // Old UTC window wrongly overlapped this order; VN window must not.
    expect(overlaps(orderOn28Pickup, orderOn28Return, window.start, window.end)).toBe(false);

    const orderOn27Pickup = new Date('2026-08-26T17:00:00.000Z'); // 27/08 00:00 VN
    const orderOn27Return = new Date('2026-08-26T17:00:00.000Z');
    expect(overlaps(orderOn27Pickup, orderOn27Return, window.start, window.end)).toBe(true);
  });

  it('passes through real multi-day cart ISO ranges unchanged', () => {
    const window = resolveAvailabilityQueryWindow({
      startDate: '2026-08-26T17:00:00.000Z',
      endDate: '2026-08-28T17:00:00.000Z',
    });
    expect(window?.civilDayYmd).toBeNull();
    expect(window?.start.toISOString()).toBe('2026-08-26T17:00:00.000Z');
    expect(window?.end.toISOString()).toBe('2026-08-28T17:00:00.000Z');
  });

  it('date=YYYY-MM-DD uses VN civil bounds (Lich Thue model)', () => {
    const window = resolveAvailabilityQueryWindow({ date: '2026-08-28' });
    expect(window?.start.toISOString()).toBe('2026-08-27T17:00:00.000Z');
    expect(window?.end.toISOString()).toBe('2026-08-28T17:00:00.000Z');
  });

  it('Order Check: tap 20 includes an active 20-to-20 order in the sheet', () => {
    const window = resolveAvailabilityQueryWindow({ date: '2026-09-20' });
    const pickup = new Date('2026-09-19T17:00:00.000Z'); // 20/09 00:00 VN
    const returned = new Date('2026-09-19T17:00:00.000Z'); // same-day return

    expect(overlaps(pickup, returned, window.start, window.end)).toBe(true);
  });
});

describe('Order Check selected-day/calendar synchronization', () => {
  it('marks only day 20 for a 20-to-20 order', () => {
    const days = calendarDayAvailability({
      stock: 2,
      fromYmd: '2026-09-19',
      toYmd: '2026-09-21',
      orders: [
        {
          pickupPlanAt: new Date('2026-09-19T17:00:00.000Z'), // 20/09 00:00 VN
          returnPlanAt: new Date('2026-09-19T17:00:00.000Z'),
          quantity: 1,
        },
      ],
    });

    expect(days).toEqual([
      { date: '2026-09-19', booked: 0, available: 2 },
      { date: '2026-09-20', booked: 1, available: 1 },
      { date: '2026-09-21', booked: 0, available: 2 },
    ]);
  });

  it('Sep 28: correct mobile encoding books day 28; legacy web encoding books day 29', () => {
    const correct = calendarDayAvailability({
      stock: 1,
      fromYmd: '2026-09-26',
      toYmd: '2026-09-30',
      orders: [
        {
          pickupPlanAt: new Date('2026-09-27T17:00:00.000Z'),
          returnPlanAt: new Date('2026-09-27T17:00:00.000Z'),
          quantity: 1,
        },
      ],
    });
    const correctMap = Object.fromEntries(correct.map((d) => [d.date, d.available]));
    expect(correctMap['2026-09-28']).toBe(0);

    const legacyWeb = calendarDayAvailability({
      stock: 1,
      fromYmd: '2026-09-26',
      toYmd: '2026-09-30',
      orders: [
        {
          pickupPlanAt: new Date('2026-09-28T17:00:00.000Z'),
          returnPlanAt: new Date('2026-09-28T17:00:00.000Z'),
          quantity: 1,
        },
      ],
    });
    const legacyMap = Object.fromEntries(legacyWeb.map((d) => [d.date, d.available]));
    expect(legacyMap['2026-09-28']).toBe(1);
    expect(legacyMap['2026-09-29']).toBe(0);
  });
});
