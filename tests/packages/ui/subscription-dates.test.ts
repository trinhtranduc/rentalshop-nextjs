/**
 * #578 batch C (ADM-5, ADM-6): admin subscription extend dialog and edit form.
 * - Extension end day = current end's Vietnam day + N months (end-of-month clamp: 31 Jan + 1 month = 28/29 Feb),
 *   saved as 23:59:59.999 Vietnam time of that day, whatever the browser zone. Before: the UTC day of a local
 *   midnight (VN lost a day) and `new Date(key + 'T23:59:59')` in browser time (LA gained ~15h).
 * - The edit form keeps the instants it was given (it read `currentPeriodStart` while the edit page passes
 *   `startDate`, and showed UTC wall time but read local time back).
 * Run under TZ=UTC, TZ=Asia/Ho_Chi_Minh, TZ=America/Los_Angeles and TZ=Asia/Tokyo (the process zone stands in for
 * the browser zone); the results must be identical.
 */
import {
  extensionBaseKey,
  extensionEndKeyForMonths,
  defaultCustomExtensionKey,
  extensionEndInstant,
  initialSubscriptionFormDates,
} from '../../../packages/ui/src/components/features/Subscriptions/components/subscription-dates';

const NOW = new Date('2026-10-06T17:30:00.000Z'); // 7 Oct 00:30 VN

describe('subscription extension', () => {
  it('base day is the Vietnam day of the current end (or Vietnam today)', () => {
    expect(extensionBaseKey('2026-10-06T16:59:59.999Z', NOW)).toBe('2026-10-06');
    expect(extensionBaseKey('2026-10-06T17:00:00.000Z', NOW)).toBe('2026-10-07');
    expect(extensionBaseKey(null, NOW)).toBe('2026-10-07');
  });

  it('adds billing months with the end-of-month clamp', () => {
    // ends 31 Jan (VN) → 28 Feb
    expect(extensionEndKeyForMonths('2026-01-31T16:59:59.999Z', 1, NOW)).toBe('2026-02-28');
    expect(extensionEndKeyForMonths('2028-01-31T16:59:59.999Z', 1, NOW)).toBe('2028-02-29');
    // stored as VN midnight of 31 Jan
    expect(extensionEndKeyForMonths('2026-01-30T17:00:00.000Z', 1, NOW)).toBe('2026-02-28');
    expect(extensionEndKeyForMonths('2026-11-30T16:59:59.999Z', 3, NOW)).toBe('2027-02-28');
    expect(extensionEndKeyForMonths('2026-10-06T16:59:59.999Z', 12, NOW)).toBe('2027-10-06');
    expect(defaultCustomExtensionKey('2026-10-06T16:59:59.999Z', NOW)).toBe('2026-11-05');
  });

  it('the new end is 23:59:59.999 Vietnam time of the chosen day', () => {
    expect(extensionEndInstant('2026-02-28').toISOString()).toBe('2026-02-28T16:59:59.999Z');
    expect(extensionEndInstant('2026-12-31').toISOString()).toBe('2026-12-31T16:59:59.999Z');
  });
});

describe('subscription edit form initial dates', () => {
  it('keeps the instants the edit page passes', () => {
    const startDate = new Date('2026-09-06T17:00:00.000Z');
    const endDate = new Date('2026-10-06T16:59:59.999Z');
    const nextBillingDate = new Date('2026-10-06T16:59:59.999Z');
    const dates = initialSubscriptionFormDates({ startDate, endDate, nextBillingDate }, NOW);
    expect(dates.startDate.toISOString()).toBe(startDate.toISOString());
    expect(dates.endDate.toISOString()).toBe(endDate.toISOString());
    expect(dates.nextBillingDate.toISOString()).toBe(nextBillingDate.toISOString());
  });

  it('falls back to currentPeriodStart/End, then now', () => {
    const currentPeriodStart = new Date('2026-09-01T00:00:00.000Z');
    const currentPeriodEnd = new Date('2026-10-01T00:00:00.000Z');
    const dates = initialSubscriptionFormDates({ currentPeriodStart, currentPeriodEnd }, NOW);
    expect(dates.startDate.toISOString()).toBe(currentPeriodStart.toISOString());
    expect(dates.endDate.toISOString()).toBe(currentPeriodEnd.toISOString());
    expect(dates.nextBillingDate.toISOString()).toBe(currentPeriodEnd.toISOString());
    const empty = initialSubscriptionFormDates(undefined, NOW);
    expect(empty.startDate.toISOString()).toBe(NOW.toISOString());
  });
});
