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
} from '../../../apps/api/lib/availability-calendar-days';

describe('getAvailabilityCivilDayBounds', () => {
  it('maps VN Aug 31 to UTC [Aug 30 17:00, Aug 31 17:00)', () => {
    const bounds = getAvailabilityCivilDayBounds('2026-08-31');
    expect(bounds?.start.toISOString()).toBe('2026-08-30T17:00:00.000Z');
    expect(bounds?.end.toISOString()).toBe('2026-08-31T17:00:00.000Z');
  });
});

describe('occupiedDateKeysForRange', () => {
  it('marks overlapping rental days and skips empty days', () => {
    const occupied = occupiedDateKeysForRange(
      [
        {
          pickupPlanAt: new Date('2026-08-09T17:00:00.000Z'), // 10/08 VN
          returnPlanAt: new Date('2026-08-12T17:00:00.000Z'), // 13/08 00:00 VN
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
          returnPlanAt: new Date('2026-08-12T17:00:00.000Z'), // 13/08 00:00 VN
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
          returnPlanAt: new Date('2026-09-03T17:00:00.000Z'), // 04/09 00:00 VN
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
    expect(byDate['2026-09-04']).toEqual({ date: '2026-09-04', booked: 0, available: 1 });
  });
});
