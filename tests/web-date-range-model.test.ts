/**
 * #556 shop web Tạo đơn: one range calendar for the rental days (day keys only, so it holds under
 * TZ=UTC and TZ=Asia/Ho_Chi_Minh).
 */
import { describe, expect, it } from '@jest/globals';
import { dayMark, monthCells, monthOf, pickDay, shiftMonth } from '../apps/client/app/orders/create/calendar-model';

describe('months', () => {
  it('shifts across years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', 0)).toBe('2026-10');
    expect(monthOf('2026-10-08')).toBe('2026-10');
  });

  it('lays out Monday-first weeks', () => {
    // 1 Oct 2026 is a Thursday: three blanks (Mon–Wed)
    const oct = monthCells('2026-10');
    expect(oct.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(oct.filter(Boolean)).toHaveLength(31);
    expect(oct.length % 7).toBe(0);
    // 1 Feb 2027 is a Monday: no blank; 28 days
    const feb = monthCells('2027-02');
    expect(feb[0]).toBe('2027-02-01');
    expect(feb).toHaveLength(28);
    // 1 Nov 2026 is a Sunday: six blanks
    expect(monthCells('2026-11').indexOf('2026-11-01')).toBe(6);
  });
});

describe('picking a range', () => {
  it('first click starts, second click ends', () => {
    let r = pickDay({ from: '', to: '' }, '2026-10-08');
    expect(r).toEqual({ from: '2026-10-08', to: '' });
    r = pickDay(r, '2026-10-16');
    expect(r).toEqual({ from: '2026-10-08', to: '2026-10-16' });
    // A click after a full range starts again
    expect(pickDay(r, '2026-10-20')).toEqual({ from: '2026-10-20', to: '' });
  });

  it('swaps a return before the pickup, and the same day twice is one day', () => {
    expect(pickDay({ from: '2026-10-08', to: '' }, '2026-10-05')).toEqual({ from: '2026-10-05', to: '2026-10-08' });
    expect(pickDay({ from: '2026-10-08', to: '' }, '2026-10-08')).toEqual({ from: '2026-10-08', to: '2026-10-08' });
    expect(pickDay({ from: '', to: '' }, 'bad')).toEqual({ from: '', to: '' });
  });

  it('marks the range, with a hover preview while picking the return day', () => {
    const full = { from: '2026-10-08', to: '2026-10-10' };
    expect(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'].map((k) => dayMark(full, k))).toEqual([
      null,
      'start',
      'inside',
      'end',
      null,
    ]);
    expect(dayMark({ from: '2026-10-08', to: '2026-10-08' }, '2026-10-08')).toBe('single');
    const half = { from: '2026-10-08', to: '' };
    expect(dayMark(half, '2026-10-08')).toBe('single');
    expect(dayMark(half, '2026-10-09', '2026-10-10')).toBe('inside');
    expect(dayMark(half, '2026-10-06', '2026-10-05')).toBe('inside');
    expect(dayMark(half, '2026-10-05', '2026-10-05')).toBe('start');
    expect(dayMark({ from: '', to: '' }, '2026-10-08')).toBeNull();
  });
});
