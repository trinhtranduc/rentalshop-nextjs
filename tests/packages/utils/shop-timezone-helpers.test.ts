/**
 * #567 phase 1 — the Vietnam-fixed day helpers take an optional shop zone.
 *
 * - No zone (every caller today), `Asia/Ho_Chi_Minh` or an invalid zone: byte-identical to the code before #567
 *   (compared with a verbatim copy of the old implementations over a sweep of instants).
 * - Another zone: that zone's civil day, incl. DST days (New York 23h/25h, Sydney 23h/25h).
 * Runs the same under TZ=UTC and TZ=Asia/Ho_Chi_Minh (no server-local time is used).
 */
import {
  DEFAULT_SHOP_TIMEZONE,
  isValidTimeZone,
  resolveShopTimeZone,
  usesDefaultShopTimeZone,
} from '../../../packages/utils/src/core/timezone';
import { SHOP_TIMEZONE, getLocalDateKey, convertLocalDateToUTCDatetime } from '../../../packages/utils/src/core/date';
import { countRentalDays } from '../../../packages/utils/src/core/rental-days';
import { shopDayKey } from '../../../packages/utils/src/core/revenue-calculator';

// ---------------------------------------------------------------------------------------------------------------
// Verbatim copies of the pre-#567 implementations (the default path must match them exactly)
// ---------------------------------------------------------------------------------------------------------------
function legacyGetLocalDateKey(date: Date | string | null | undefined): string {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    const localDate = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
    const year = localDate.getUTCFullYear();
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

function legacyConvertLocalDateToUTCDatetime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
    if (month < 1 || month > 12) return '';
    if (day < 1 || day > 31) return '';
    const utcDate = new Date(Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000);
    if (isNaN(utcDate.getTime())) return '';
    return utcDate.toISOString();
  } catch {
    return '';
  }
}

function legacyCountRentalDays(pickup: string | Date | null | undefined, returnDate: string | Date | null | undefined): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const num = (value: string | Date | null | undefined): number => {
    if (!value) return NaN;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return Date.UTC(y, m - 1, d) / DAY_MS;
    }
    const ms = typeof value === 'string' ? Date.parse(value) : value.getTime();
    return Number.isNaN(ms) ? NaN : Math.floor((ms + 7 * 60 * 60 * 1000) / DAY_MS);
  };
  const from = num(pickup);
  const to = num(returnDate);
  if (Number.isNaN(from) || Number.isNaN(to)) return 1;
  return Math.max(1, to - from + 1);
}

/** Every 15 minutes across month, year and VN-midnight boundaries, plus seeded random instants 2020–2030. */
function sweepInstants(): Date[] {
  const out: Date[] = [];
  const windows: Array<[string, string]> = [
    ['2026-02-26T00:00:00Z', '2026-03-03T00:00:00Z'],
    ['2026-09-29T00:00:00Z', '2026-10-03T00:00:00Z'],
    ['2026-12-30T00:00:00Z', '2027-01-02T00:00:00Z'],
    ['2028-02-27T12:00:00Z', '2028-03-01T12:00:00Z'], // leap day
  ];
  for (const [from, to] of windows) {
    for (let t = Date.parse(from); t <= Date.parse(to); t += 15 * 60 * 1000) out.push(new Date(t));
  }
  let seed = 567;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const lo = Date.parse('2020-01-01T00:00:00Z');
  const hi = Date.parse('2030-12-31T23:59:59Z');
  for (let i = 0; i < 2000; i++) out.push(new Date(lo + Math.floor(rand() * (hi - lo))));
  // the exact VN midnight boundary and its neighbours
  for (const iso of ['2026-10-02T16:59:59.999Z', '2026-10-02T17:00:00.000Z', '2026-10-02T16:59:59Z', '2026-12-31T17:00:00Z']) {
    out.push(new Date(iso));
  }
  return out;
}

describe('timezone module (#567)', () => {
  it('DEFAULT_SHOP_TIMEZONE is Vietnam and SHOP_TIMEZONE keeps the same value', () => {
    expect(DEFAULT_SHOP_TIMEZONE).toBe('Asia/Ho_Chi_Minh');
    expect(SHOP_TIMEZONE).toBe('Asia/Ho_Chi_Minh');
  });

  it.each(['Asia/Ho_Chi_Minh', 'UTC', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/London', 'Asia/Bangkok'])(
    'isValidTimeZone(%s) is true',
    (tz) => expect(isValidTimeZone(tz)).toBe(true)
  );

  it.each([['Mars/Base'], [''], ['   '], [' Asia/Tokyo'], ['Asia/Tokyo '], [null], [undefined], [7], [{}], ['x'.repeat(65)]])(
    'isValidTimeZone(%p) is false and never throws',
    (tz) => expect(isValidTimeZone(tz as unknown)).toBe(false)
  );

  it('resolveShopTimeZone keeps a valid zone and falls back to Vietnam otherwise', () => {
    expect(resolveShopTimeZone('Asia/Tokyo')).toBe('Asia/Tokyo');
    expect(resolveShopTimeZone('Mars/Base')).toBe('Asia/Ho_Chi_Minh');
    expect(resolveShopTimeZone(undefined)).toBe('Asia/Ho_Chi_Minh');
    expect(resolveShopTimeZone(null)).toBe('Asia/Ho_Chi_Minh');
  });

  it('usesDefaultShopTimeZone: only a valid non-Vietnam zone leaves the historical path', () => {
    expect(usesDefaultShopTimeZone(undefined)).toBe(true);
    expect(usesDefaultShopTimeZone('')).toBe(true);
    expect(usesDefaultShopTimeZone('Asia/Ho_Chi_Minh')).toBe(true);
    expect(usesDefaultShopTimeZone('Mars/Base')).toBe(true);
    expect(usesDefaultShopTimeZone('UTC')).toBe(false);
    expect(usesDefaultShopTimeZone('Asia/Tokyo')).toBe(false);
  });
});

describe('default path is identical to the pre-#567 code', () => {
  const instants = sweepInstants();

  it(`getLocalDateKey over ${instants.length} instants: no zone, Vietnam and an invalid zone`, () => {
    for (const d of instants) {
      const expected = legacyGetLocalDateKey(d);
      expect(getLocalDateKey(d)).toBe(expected);
      expect(getLocalDateKey(d.toISOString())).toBe(expected);
      expect(getLocalDateKey(d, 'Asia/Ho_Chi_Minh')).toBe(expected);
      expect(getLocalDateKey(d, 'Mars/Base')).toBe(expected);
    }
  });

  it('getLocalDateKey edge inputs', () => {
    for (const v of [null, undefined, '', 'not a date']) {
      expect(getLocalDateKey(v as any)).toBe(legacyGetLocalDateKey(v as any));
      expect(getLocalDateKey(v as any, 'Asia/Tokyo')).toBe(legacyGetLocalDateKey(v as any));
    }
    // used as a .map callback by JS callers: the index arrives as the "zone" and must not change anything
    const isos = ['2026-10-02T16:59:59Z', '2026-10-02T17:00:00Z'];
    expect(isos.map(getLocalDateKey as any)).toEqual(isos.map((s) => legacyGetLocalDateKey(s)));
  });

  it('convertLocalDateToUTCDatetime for every day of 2026–2028 plus odd inputs', () => {
    const keys: string[] = [];
    for (let t = Date.UTC(2026, 0, 1); t <= Date.UTC(2028, 11, 31); t += 86400000) {
      keys.push(new Date(t).toISOString().slice(0, 10));
    }
    keys.push('2026-02-30', '2026-02-31', '2026-13-01', '2026-00-10', '2026-01-32', '2026-1-5', 'abc', '', '2026-10');
    for (const key of keys) {
      const expected = legacyConvertLocalDateToUTCDatetime(key);
      expect(convertLocalDateToUTCDatetime(key)).toBe(expected);
      expect(convertLocalDateToUTCDatetime(key, 'Asia/Ho_Chi_Minh')).toBe(expected);
      expect(convertLocalDateToUTCDatetime(key, 'Mars/Base')).toBe(expected);
    }
    expect(convertLocalDateToUTCDatetime(null)).toBe('');
  });

  it('countRentalDays for instant pairs across the sweep and for day keys', () => {
    const instants2 = instants.slice(0, 600);
    for (let i = 0; i + 1 < instants2.length; i += 7) {
      const a = instants2[i];
      const b = instants2[Math.min(i + 97, instants2.length - 1)];
      const expected = legacyCountRentalDays(a, b);
      expect(countRentalDays(a, b)).toBe(expected);
      expect(countRentalDays(a.toISOString(), b.toISOString(), 'Asia/Ho_Chi_Minh')).toBe(expected);
      expect(countRentalDays(a, b, 'Mars/Base')).toBe(expected);
    }
    for (const [p, r] of [['2026-10-03', '2026-10-04'], ['2026-10-04', '2026-10-03'], ['', ''], [null, null], ['bad', '2026-10-04']] as const) {
      expect(countRentalDays(p as any, r as any)).toBe(legacyCountRentalDays(p as any, r as any));
    }
  });

  it('shopDayKey with no zone is the Vietnam day (16:59:59Z / 17:00Z boundary)', () => {
    expect(shopDayKey(new Date('2026-10-02T16:59:59Z'))).toBe('2026-10-02');
    expect(shopDayKey(new Date('2026-10-02T17:00:00Z'))).toBe('2026-10-03');
    expect(shopDayKey(new Date('2026-10-02T17:00:00Z'), 'Asia/Ho_Chi_Minh')).toBe('2026-10-03');
    expect(shopDayKey(new Date('2026-10-02T17:00:00Z'), 'Mars/Base')).toBe('2026-10-03');
    for (const d of instants.slice(0, 500)) expect(shopDayKey(d)).toBe(legacyGetLocalDateKey(d));
  });
});

describe('a shop on another zone gets that zone’s civil day', () => {
  describe('getLocalDateKey / shopDayKey', () => {
    it.each([
      // zone, instant, day
      ['UTC', '2026-10-02T16:59:59Z', '2026-10-02'],
      ['UTC', '2026-10-02T17:00:00Z', '2026-10-02'],
      ['UTC', '2026-10-02T23:59:59.999Z', '2026-10-02'],
      ['UTC', '2026-10-03T00:00:00Z', '2026-10-03'],
      ['Asia/Ho_Chi_Minh', '2026-10-02T16:59:59Z', '2026-10-02'],
      ['Asia/Ho_Chi_Minh', '2026-10-02T17:00:00Z', '2026-10-03'],
      ['Asia/Tokyo', '2026-10-02T14:59:59Z', '2026-10-02'],
      ['Asia/Tokyo', '2026-10-02T15:00:00Z', '2026-10-03'],
      // New York spring forward (Sun 2026-03-08 is 23h): midnight 05:00Z, next midnight 04:00Z
      ['America/New_York', '2026-03-08T04:59:59Z', '2026-03-07'],
      ['America/New_York', '2026-03-08T05:00:00Z', '2026-03-08'],
      ['America/New_York', '2026-03-09T03:59:59Z', '2026-03-08'],
      ['America/New_York', '2026-03-09T04:00:00Z', '2026-03-09'],
      // New York fall back (Sun 2026-11-01 is 25h): midnight 04:00Z, next midnight 05:00Z
      ['America/New_York', '2026-11-01T03:59:59Z', '2026-10-31'],
      ['America/New_York', '2026-11-01T04:00:00Z', '2026-11-01'],
      ['America/New_York', '2026-11-02T04:59:59Z', '2026-11-01'],
      ['America/New_York', '2026-11-02T05:00:00Z', '2026-11-02'],
      // Sydney DST start (Sun 2026-10-04 is 23h): midnight 14:00Z the day before, next midnight 13:00Z
      ['Australia/Sydney', '2026-10-03T13:59:59Z', '2026-10-03'],
      ['Australia/Sydney', '2026-10-03T14:00:00Z', '2026-10-04'],
      ['Australia/Sydney', '2026-10-04T12:59:59Z', '2026-10-04'],
      ['Australia/Sydney', '2026-10-04T13:00:00Z', '2026-10-05'],
      // Sydney DST end (Sun 2026-04-05 is 25h): midnight 13:00Z the day before, next midnight 14:00Z
      ['Australia/Sydney', '2026-04-04T12:59:59Z', '2026-04-04'],
      ['Australia/Sydney', '2026-04-04T13:00:00Z', '2026-04-05'],
      ['Australia/Sydney', '2026-04-05T13:59:59Z', '2026-04-05'],
      ['Australia/Sydney', '2026-04-05T14:00:00Z', '2026-04-06'],
    ])('%s: %s is %s', (zone, iso, day) => {
      expect(getLocalDateKey(iso, zone)).toBe(day);
      expect(getLocalDateKey(new Date(iso), zone)).toBe(day);
      expect(shopDayKey(new Date(iso), zone)).toBe(day);
    });
  });

  describe('convertLocalDateToUTCDatetime', () => {
    it.each([
      ['UTC', '2026-09-28', '2026-09-28T00:00:00.000Z'],
      ['Asia/Ho_Chi_Minh', '2026-09-28', '2026-09-27T17:00:00.000Z'],
      ['Asia/Tokyo', '2026-09-28', '2026-09-27T15:00:00.000Z'],
      ['America/New_York', '2026-03-08', '2026-03-08T05:00:00.000Z'],
      ['America/New_York', '2026-03-09', '2026-03-09T04:00:00.000Z'],
      ['America/New_York', '2026-11-01', '2026-11-01T04:00:00.000Z'],
      ['America/New_York', '2026-11-02', '2026-11-02T05:00:00.000Z'],
      ['Australia/Sydney', '2026-10-04', '2026-10-03T14:00:00.000Z'],
      ['Australia/Sydney', '2026-10-05', '2026-10-04T13:00:00.000Z'],
      ['Australia/Sydney', '2026-04-05', '2026-04-04T13:00:00.000Z'],
      ['Australia/Sydney', '2026-04-06', '2026-04-05T14:00:00.000Z'],
      // the calendar date rolls over the same way as the Vietnam path (2026-02-30 → 2026-03-02)
      ['Asia/Tokyo', '2026-02-30', '2026-03-01T15:00:00.000Z'],
    ])('%s: midnight of %s is %s', (zone, key, iso) => {
      expect(convertLocalDateToUTCDatetime(key, zone)).toBe(iso);
    });

    it('invalid keys stay empty in any zone', () => {
      for (const key of ['', 'abc', '2026-13-01', '2026-01-32']) {
        expect(convertLocalDateToUTCDatetime(key, 'America/New_York')).toBe('');
      }
    });

    it('round-trips with getLocalDateKey in every test zone', () => {
      for (const zone of ['UTC', 'Asia/Ho_Chi_Minh', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney']) {
        for (const key of ['2026-01-01', '2026-03-08', '2026-03-09', '2026-04-05', '2026-10-04', '2026-11-01', '2026-12-31']) {
          expect(getLocalDateKey(convertLocalDateToUTCDatetime(key, zone), zone)).toBe(key);
        }
      }
    });
  });

  describe('countRentalDays', () => {
    it('day keys are the same in every zone', () => {
      for (const zone of ['UTC', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney']) {
        expect(countRentalDays('2026-10-03', '2026-10-04', zone)).toBe(2);
        expect(countRentalDays('2026-10-03', '2026-10-03', zone)).toBe(1);
      }
    });

    it('UTC: 17:00Z to 16:59:59Z next day is 2 UTC days (Vietnam would say 1)', () => {
      expect(countRentalDays('2026-10-02T17:00:00Z', '2026-10-03T16:59:59Z')).toBe(1);
      expect(countRentalDays('2026-10-02T17:00:00Z', '2026-10-03T16:59:59Z', 'UTC')).toBe(2);
    });

    it('Tokyo: 15:00Z is the next day', () => {
      expect(countRentalDays('2026-10-02T15:00:00Z', '2026-10-03T14:59:59Z', 'Asia/Tokyo')).toBe(1);
      expect(countRentalDays('2026-10-02T14:59:59Z', '2026-10-02T15:00:00Z', 'Asia/Tokyo')).toBe(2);
    });

    it('New York: a same-day rental on the 23h and the 25h DST days is 1 day', () => {
      // whole Sunday 2026-03-08 in New York (00:00 EST to 23:59:59 EDT)
      expect(countRentalDays('2026-03-08T05:00:00Z', '2026-03-09T03:59:59Z', 'America/New_York')).toBe(1);
      expect(countRentalDays('2026-03-08T05:00:00Z', '2026-03-09T03:59:59Z')).toBe(2); // Vietnam days differ
      // whole Sunday 2026-11-01 in New York (00:00 EDT to 23:59:59 EST)
      expect(countRentalDays('2026-11-01T04:00:00Z', '2026-11-02T04:59:59Z', 'America/New_York')).toBe(1);
      expect(countRentalDays('2026-11-01T04:00:00Z', '2026-11-02T05:00:00Z', 'America/New_York')).toBe(2);
    });

    it('Sydney: the 23h DST-start day is 1 day; month end spans correctly', () => {
      expect(countRentalDays('2026-10-03T14:00:00Z', '2026-10-04T12:59:59Z', 'Australia/Sydney')).toBe(1);
      expect(countRentalDays('2026-09-29T14:00:00Z', '2026-10-01T14:00:00Z', 'Australia/Sydney')).toBe(3);
    });
  });
});
