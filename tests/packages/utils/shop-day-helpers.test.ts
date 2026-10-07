/**
 * #578 batch C (PKG-3, PKG-8, ADM-5/6, ADM-9): browser-safe shop-day helpers in `packages/utils/src/core/shop-day.ts`.
 * Run under TZ=UTC, TZ=Asia/Ho_Chi_Minh, TZ=America/Los_Angeles and TZ=Asia/Tokyo (the process zone stands in for
 * the browser zone); the results must be identical.
 */
import {
  formatInShopZone,
  getShopTodayKey,
  addMonthsToDateKey,
  startOfWeekKey,
  startOfQuarterKey,
  endOfMonthKey,
  diffDateKeys,
  dateKeyToPickerDate,
  pickerDateToDateKey,
  toShopDateTimeLocalValue,
  fromShopDateTimeLocalValue,
  shopDayRangesOverlap,
} from '../../../packages/utils/src/core/shop-day';

const AFTER_VN_MIDNIGHT = '2026-10-06T17:30:00.000Z'; // 00:30, 7 Oct (VN)
const LAST_SECOND = '2026-10-06T16:59:59.000Z'; // 23:59:59, 6 Oct (VN)
const VN_MIDNIGHT = '2026-10-06T17:00:00.000Z'; // 00:00, 7 Oct (VN)

describe('formatInShopZone', () => {
  it('formatInShopZone: instants in Vietnam time, day/month keys as written', () => {
    const dmY: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    expect(formatInShopZone(AFTER_VN_MIDNIGHT, 'vi', dmY)).toBe('07/10/2026');
    expect(formatInShopZone(LAST_SECOND, 'vi', dmY)).toBe('06/10/2026');
    expect(formatInShopZone(new Date(VN_MIDNIGHT).getTime(), 'vi', dmY)).toBe('07/10/2026');
    expect(formatInShopZone('2026-10-07', 'vi', dmY)).toBe('07/10/2026');
    expect(formatInShopZone('2026-10', 'en', { month: 'short', year: 'numeric' })).toBe('Oct 2026');
    expect(formatInShopZone(AFTER_VN_MIDNIGHT)).toBe('Oct 7, 2026');
    expect(formatInShopZone(null)).toBe('');
    expect(formatInShopZone('not a date')).toBe('');
  });
});

describe('shop-day helpers', () => {
  it('today is the Vietnam day at the 16:59:59Z / 17:00:00Z boundary', () => {
    expect(getShopTodayKey(new Date('2026-10-06T16:59:59.999Z'))).toBe('2026-10-06');
    expect(getShopTodayKey(new Date('2026-10-06T17:00:00.000Z'))).toBe('2026-10-07');
    expect(getShopTodayKey(new Date('2026-12-31T17:00:00.000Z'))).toBe('2027-01-01');
  });

  it('a picker cell maps to the key the user tapped, and a key/instant to that cell', () => {
    expect(pickerDateToDateKey(new Date(2026, 9, 7))).toBe('2026-10-07');
    expect(pickerDateToDateKey(new Date(2026, 9, 7, 9, 0))).toBe('2026-10-07'); // hourly picker keeps the day
    const fromKey = dateKeyToPickerDate('2026-10-07')!;
    expect([fromKey.getFullYear(), fromKey.getMonth(), fromKey.getDate(), fromKey.getHours()]).toEqual([2026, 9, 7, 0]);
    const fromInstant = dateKeyToPickerDate(AFTER_VN_MIDNIGHT)!;
    expect(pickerDateToDateKey(fromInstant)).toBe('2026-10-07');
    expect(pickerDateToDateKey(dateKeyToPickerDate(LAST_SECOND)!)).toBe('2026-10-06');
    expect(dateKeyToPickerDate('')).toBeUndefined();
  });

  it('datetime-local shows and reads Vietnam wall time: no shift on save without edits', () => {
    expect(toShopDateTimeLocalValue(AFTER_VN_MIDNIGHT)).toBe('2026-10-07T00:30');
    expect(toShopDateTimeLocalValue(LAST_SECOND)).toBe('2026-10-06T23:59');
    expect(fromShopDateTimeLocalValue('2026-10-07T00:30')!.toISOString()).toBe(AFTER_VN_MIDNIGHT);
    expect(fromShopDateTimeLocalValue('2026-10-07T00:00')!.toISOString()).toBe(VN_MIDNIGHT);
    for (const iso of [AFTER_VN_MIDNIGHT, VN_MIDNIGHT, '2026-02-28T17:00:00.000Z', '2026-12-31T16:59:00.000Z']) {
      expect(fromShopDateTimeLocalValue(toShopDateTimeLocalValue(iso))!.toISOString()).toBe(iso);
    }
    expect(fromShopDateTimeLocalValue('')).toBeNull();
    expect(toShopDateTimeLocalValue(undefined)).toBe('');
  });
});

describe('calendar key arithmetic (no time zone involved)', () => {
  it('adds months with an end-of-month clamp', () => {
    expect(addMonthsToDateKey('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDateKey('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsToDateKey('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonthsToDateKey('2026-11-30', 3)).toBe('2027-02-28');
    expect(addMonthsToDateKey('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonthsToDateKey('2026-01-31', 12)).toBe('2027-01-31');
    expect(addMonthsToDateKey('2026-08-31', 6)).toBe('2027-02-28');
  });

  it('week, quarter and month bounds', () => {
    expect(startOfWeekKey('2026-10-07')).toBe('2026-10-05'); // Wednesday → Monday
    expect(startOfWeekKey('2026-10-11')).toBe('2026-10-05'); // Sunday → previous Monday
    expect(startOfWeekKey('2026-10-05')).toBe('2026-10-05');
    expect(startOfQuarterKey('2026-11-30')).toBe('2026-10-01');
    expect(startOfQuarterKey('2026-01-01')).toBe('2026-01-01');
    expect(endOfMonthKey('2028-02-10')).toBe('2028-02-29');
    expect(diffDateKeys('2026-09-07', '2026-10-07')).toBe(30);
    expect(diffDateKeys('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('rental overlap by Vietnam civil day', () => {
  it('inclusive on both ends, decided at the Vietnam midnight', () => {
    // same-day rental on 7 Oct (10:00-17:00 VN) overlaps a request for 7 Oct
    expect(shopDayRangesOverlap('2026-10-07', '2026-10-07', '2026-10-07T03:00:00.000Z', '2026-10-07T10:00:00.000Z')).toBe(true);
    // returned 23:59:59 on 6 Oct → not on 7 Oct
    expect(shopDayRangesOverlap('2026-10-07', '2026-10-07', '2026-10-05T03:00:00.000Z', LAST_SECOND)).toBe(false);
    // returned at 00:00 on 7 Oct → on 7 Oct
    expect(shopDayRangesOverlap('2026-10-07', '2026-10-07', '2026-10-05T03:00:00.000Z', VN_MIDNIGHT)).toBe(true);
    // picked up at 00:00 on 8 Oct → not on 7 Oct
    expect(shopDayRangesOverlap('2026-10-07', '2026-10-07', '2026-10-07T17:00:00.000Z', '2026-10-09T10:00:00.000Z')).toBe(false);
    // picked up at 23:59:59 on 7 Oct → on 7 Oct
    expect(shopDayRangesOverlap('2026-10-07', '2026-10-07', '2026-10-07T16:59:59.000Z', '2026-10-09T10:00:00.000Z')).toBe(true);
  });
});
