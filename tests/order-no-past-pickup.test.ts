/**
 * #1684 no rental order is created for a day before today (Vietnam civil day), only for a client that sends the
 * `no-past-orders` capability. Installed apps never send it: for them nothing changes. Today (VN) is always allowed,
 * even when the hour has passed. The pure rule is tested here; the route calls it (see the route test below).
 */
import { hasCapability } from '../apps/api/lib/client-capabilities';
import { isPickupBeforeToday, rejectsPastPickup } from '../apps/api/lib/order-pickup-day';

// 2026-11-27 10:00 in Vietnam = 03:00 UTC
const NOW = new Date('2026-11-27T03:00:00.000Z');
const req = (value?: string) => ({ headers: { get: (n: string) => (n.toLowerCase() === 'x-client-capabilities' && value !== undefined ? value : null) } });

describe('isPickupBeforeToday (Vietnam civil day)', () => {
  it.each([
    ['yesterday noon VN (05:00 UTC)', '2026-11-26T05:00:00.000Z', true],
    ['yesterday 23:59 VN (16:59 UTC)', '2026-11-26T16:59:59.000Z', true],
    ['today 00:00 VN (17:00 UTC yesterday): the hour is earlier than now, but it is today', '2026-11-26T17:00:00.000Z', false],
    ['today 00:30 VN (17:30 UTC yesterday): the UTC date is yesterday, the VN day is today', '2026-11-26T17:30:00.000Z', false],
    ['today 23:59 VN', '2026-11-27T16:59:59.000Z', false],
    ['tomorrow', '2026-11-28T03:00:00.000Z', false],
    ['a day key sent as a date', '2026-11-26', true],
    ['today as a date key', '2026-11-27', false],
  ])('%s -> %s', (_name, pickup, expected) => {
    expect(isPickupBeforeToday(pickup, NOW)).toBe(expected);
  });

  it('missing or unreadable pickup is not "in the past" (the schema decides if it is required)', () => {
    expect(isPickupBeforeToday(undefined, NOW)).toBe(false);
    expect(isPickupBeforeToday(null, NOW)).toBe(false);
    expect(isPickupBeforeToday('not a date', NOW)).toBe(false);
  });

  it('the UTC day just before midnight VN is still the same VN day: 16:59 UTC on the 26th is the 26th, 17:00 UTC is the 27th', () => {
    const justBeforeMidnightVn = new Date('2026-11-26T16:59:59.000Z');
    expect(isPickupBeforeToday('2026-11-26T16:59:59.000Z', new Date('2026-11-26T17:00:00.000Z'))).toBe(true);
    expect(isPickupBeforeToday(justBeforeMidnightVn.toISOString(), justBeforeMidnightVn)).toBe(false);
  });
});

describe('rejectsPastPickup (what POST /api/orders asks)', () => {
  const yesterday = '2026-11-26T05:00:00.000Z';

  it('a client with the capability: a RENT order for yesterday is rejected', () => {
    expect(rejectsPastPickup(req('no-past-orders'), 'RENT', yesterday, NOW)).toBe(true);
    expect(rejectsPastPickup(req('installments, No-Past-Orders'), 'RENT', yesterday, NOW)).toBe(true);
  });

  it('a client with the capability: today and the future are fine, and so is a SALE order', () => {
    expect(rejectsPastPickup(req('no-past-orders'), 'RENT', '2026-11-26T17:30:00.000Z', NOW)).toBe(false);
    expect(rejectsPastPickup(req('no-past-orders'), 'RENT', '2026-12-01T03:00:00.000Z', NOW)).toBe(false);
    expect(rejectsPastPickup(req('no-past-orders'), 'SALE', yesterday, NOW)).toBe(false);
  });

  it('an installed app (no capability, empty or junk header) is never rejected', () => {
    expect(rejectsPastPickup(req(), 'RENT', yesterday, NOW)).toBe(false);
    expect(rejectsPastPickup(req(''), 'RENT', yesterday, NOW)).toBe(false);
    expect(rejectsPastPickup(req('installments,block-pricing,branch-listing'), 'RENT', yesterday, NOW)).toBe(false);
    expect(hasCapability(req('installments,block-pricing,branch-listing'), 'no-past-orders' as any)).toBe(false);
  });
});
