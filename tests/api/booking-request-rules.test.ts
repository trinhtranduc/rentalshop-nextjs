/**
 * #1124 Đặt đơn online — rules shared by the public and shop routes (apps/api/lib/booking-requests.ts).
 * Days are Vietnam civil days (timezone-dates); this file runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import {
  BOOKING_CODE_ALPHABET,
  BOOKING_TTL_MS,
  bookingPlanDates,
  effectiveBookingStatus,
  firstShortDay,
  generateBookingCode,
  maskPhone,
  normalizePhone,
  publicDayStatuses,
  splitCustomerName,
  takeRateSlot,
  todayVnKey,
  validateBookingDates,
} from '../../apps/api/lib/booking-requests';

describe('booking code', () => {
  it('is 5 characters from an alphabet without 0, O, 1, I', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateBookingCode();
      expect(code).toMatch(/^[A-Z2-9]{5}$/);
      expect(code).not.toMatch(/[01OI]/);
    }
    expect(BOOKING_CODE_ALPHABET).not.toMatch(/[01OI]/);
  });
});

describe('phone', () => {
  it('keeps digits and a leading +', () => {
    expect(normalizePhone(' 0912 345 678 ')).toBe('0912345678');
    expect(normalizePhone('+84 912-345-678')).toBe('+84912345678');
  });
  it('refuses a number that is too short or too long', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('1234567890123456')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });
  it('masks the middle for the public tracking page', () => {
    expect(maskPhone('0912345678')).toBe('091****678');
    expect(maskPhone('+84912345678')).toBe('+84******678');
  });
});

describe('name', () => {
  it('splits a Vietnamese full name into first and last name for the customer record', () => {
    expect(splitCustomerName('Nguyễn Thị Mai')).toEqual({ firstName: 'Nguyễn Thị', lastName: 'Mai' });
    expect(splitCustomerName('  Mai ')).toEqual({ firstName: 'Mai', lastName: '' });
  });
});

describe('lazy expiry (24 h)', () => {
  const created = new Date('2026-10-20T03:00:00.000Z');
  const expiresAt = new Date(created.getTime() + BOOKING_TTL_MS);
  it('a PENDING request reads as EXPIRED once expiresAt has passed', () => {
    expect(effectiveBookingStatus({ status: 'PENDING', expiresAt }, new Date(expiresAt.getTime() - 1))).toBe('PENDING');
    expect(effectiveBookingStatus({ status: 'PENDING', expiresAt }, new Date(expiresAt.getTime() + 1))).toBe('EXPIRED');
  });
  it('closed requests keep their status', () => {
    expect(effectiveBookingStatus({ status: 'CONFIRMED', expiresAt }, new Date('2027-01-01'))).toBe('CONFIRMED');
    expect(effectiveBookingStatus({ status: 'REJECTED', expiresAt }, new Date('2027-01-01'))).toBe('REJECTED');
  });
});

describe('dates (Vietnam civil day)', () => {
  // 2026-10-20 23:30 in Vietnam = 16:30 UTC: "today" is the 20th in Vietnam even though… it is also the 20th UTC
  // 2026-10-21 00:30 in Vietnam = 2026-10-20 17:30 UTC: today is the 21st in Vietnam, the 20th in UTC
  const lateNightVn = new Date('2026-10-20T17:30:00.000Z');

  it('today is the Vietnam day, not the UTC day', () => {
    expect(todayVnKey(lateNightVn)).toBe('2026-10-21');
  });
  it('pickup today or later; return on or after pickup; same day is fine', () => {
    expect(validateBookingDates('2026-10-21', '2026-10-21', lateNightVn)).toEqual({ ok: true });
    expect(validateBookingDates('2026-10-21', '2026-10-24', lateNightVn)).toEqual({ ok: true });
  });
  it('refuses a past pickup day (yesterday in Vietnam)', () => {
    expect(validateBookingDates('2026-10-20', '2026-10-22', lateNightVn)).toEqual({ ok: false, code: 'INVALID_DATE_RANGE' });
  });
  it('refuses return before pickup, a bad key, and a rental over 60 days', () => {
    expect(validateBookingDates('2026-10-24', '2026-10-22', lateNightVn).ok).toBe(false);
    expect(validateBookingDates('2026-13-01', '2026-13-02', lateNightVn).ok).toBe(false);
    expect(validateBookingDates('2026-10-21', '2026-12-25', lateNightVn).ok).toBe(false);
  });
  it('plan dates are the start of the Vietnam day (17:00 UTC the day before)', () => {
    const { pickupPlanAt, returnPlanAt } = bookingPlanDates('2026-10-21', '2026-10-24');
    expect(pickupPlanAt.toISOString()).toBe('2026-10-20T17:00:00.000Z');
    expect(returnPlanAt.toISOString()).toBe('2026-10-23T17:00:00.000Z');
  });
});

describe('public calendar: only free / full (owner 2026-10-20)', () => {
  it('a day with 1+ free unit is free, 0 is full, a day before today is full', () => {
    const days = [
      { date: '2026-10-20', available: 3, booked: 0 },
      { date: '2026-10-21', available: 1, booked: 2 },
      { date: '2026-10-22', available: 0, booked: 3 },
    ];
    expect(publicDayStatuses(days, '2026-10-21')).toEqual([
      { date: '2026-10-20', status: 'full' },
      { date: '2026-10-21', status: 'free' },
      { date: '2026-10-22', status: 'full' },
    ]);
  });
  it('the first day without enough units for the asked quantity', () => {
    const days = [
      { date: '2026-10-21', available: 2, booked: 0 },
      { date: '2026-10-22', available: 1, booked: 1 },
    ];
    expect(firstShortDay(days, 1)).toBeNull();
    expect(firstShortDay(days, 2)).toBe('2026-10-22');
  });
});

describe('rate window (in memory, per instance)', () => {
  it('allows `limit` hits per window, then refuses until the window passes', () => {
    const t0 = 1_000_000;
    expect(takeRateSlot('test:ip', 2, 60_000, t0)).toBe(true);
    expect(takeRateSlot('test:ip', 2, 60_000, t0 + 1)).toBe(true);
    expect(takeRateSlot('test:ip', 2, 60_000, t0 + 2)).toBe(false);
    expect(takeRateSlot('test:ip', 2, 60_000, t0 + 60_001)).toBe(true);
  });
});
