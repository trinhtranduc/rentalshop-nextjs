/**
 * #556 / #559 shop web: the one range calendar used by Tạo đơn, Tổng quan, Kiểm tra còn hàng and Đơn hàng
 * (day keys only, so it holds under TZ=UTC and TZ=Asia/Ho_Chi_Minh).
 */
import { describe, expect, it } from '@jest/globals';
import { dayAllowed, dayMark, monthCells, monthOf, pickDay, rangeDays, rangeProblem, shiftMonth } from '../apps/client/app/components/date-range/range-model';

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

describe('duration and limits', () => {
  it('counts both ends: a same-day range is 1 day', () => {
    expect(rangeDays('2026-10-08', '2026-10-08')).toBe(1);
    expect(rangeDays('2026-10-01', '2026-10-31')).toBe(31);
    expect(rangeDays('2026-12-30', '2027-01-02')).toBe(4);
    // Across the end of February and a whole year
    expect(rangeDays('2028-02-28', '2028-03-01')).toBe(3);
    expect(rangeDays('2026-01-01', '2026-12-31')).toBe(365);
  });

  it('is 0 for an incomplete or reversed range', () => {
    expect(rangeDays('2026-10-08', '')).toBe(0);
    expect(rangeDays('', '')).toBe(0);
    expect(rangeDays('2026-10-08', '2026-10-07')).toBe(0);
  });

  it('allows days inside min / max only', () => {
    expect(dayAllowed('2026-10-07', { max: '2026-10-06' })).toBe(false);
    expect(dayAllowed('2026-10-06', { max: '2026-10-06' })).toBe(true);
    expect(dayAllowed('2026-10-05', { min: '2026-10-06' })).toBe(false);
    expect(dayAllowed('2026-10-05')).toBe(true);
  });

  it('says why a range cannot be applied', () => {
    expect(rangeProblem('2026-10-08', '')).toBe('missing');
    expect(rangeProblem('2026-10-08', '2026-10-08')).toBeNull();
    expect(rangeProblem('2026-10-01', '2026-10-31', 30)).toBe('tooLong');
    expect(rangeProblem('2026-10-01', '2026-10-30', 30)).toBeNull();
  });
});
