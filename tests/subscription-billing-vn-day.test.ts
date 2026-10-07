/**
 * #588 / #578 §E (API-17): proration and extension pricing count VN civil days,
 * and the interval length clamps the month (31 Jan + 1 month = 28 Feb).
 * Same answers under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { calculateProration } from '../packages/utils/src/core/proration';
import { calculateExtensionTotal } from '../packages/utils/src/core/subscription-billing-calculations';

describe('calculateProration daysRemaining = VN civil days', () => {
  it('change at 09:00 VN on 10 Mar, period ends 31 Mar 23:59:59 VN -> 21 days (not ceil 22)', () => {
    const result = calculateProration(
      {
        amount: 100_000,
        currentPeriodStart: new Date('2026-02-28T17:00:00.000Z'), // 1 Mar 00:00 VN
        currentPeriodEnd: new Date('2026-03-31T16:59:59.999Z'), // 31 Mar 23:59:59.999 VN
      },
      200_000,
      new Date('2026-03-10T02:00:00.000Z')
    );
    expect(result.daysRemaining).toBe(21);
    expect(result.daysInPeriod).toBe(30);
  });

  it('same answer at 00:00 VN and 23:59 VN of the change day', () => {
    const sub = {
      amount: 100_000,
      currentPeriodStart: new Date('2026-02-28T17:00:00.000Z'),
      currentPeriodEnd: new Date('2026-03-31T16:59:59.999Z'),
    };
    const atStart = calculateProration(sub, 200_000, new Date('2026-03-09T17:00:00.000Z'));
    const atEnd = calculateProration(sub, 200_000, new Date('2026-03-10T16:59:59.000Z'));
    expect(atStart.daysRemaining).toBe(21);
    expect(atEnd.daysRemaining).toBe(21);
  });
});

describe('calculateExtensionTotal on VN days', () => {
  it('extensionDays counts VN days: 10 Mar 17:00 VN -> 10 Apr 23:59:59 VN = 31 (not ceil 32)', () => {
    const result = calculateExtensionTotal({
      oldEndDate: new Date('2026-03-10T10:00:00.000Z'),
      newEndDate: new Date('2026-04-10T16:59:59.999Z'),
      plan: { basePrice: 310_000 },
      selectedInterval: 'monthly',
    });
    expect(result.extensionDays).toBe(31);
    expect(result.selectedIntervalDays).toBe(31);
    expect(result.totalDue).toBeCloseTo(310_000, 5);
  });

  it('monthly interval from 31 Jan 00:00 VN is 28 days (31 Jan + 1 month = 28 Feb)', () => {
    const result = calculateExtensionTotal({
      oldEndDate: new Date('2026-01-30T17:00:00.000Z'), // 31 Jan 00:00 VN
      newEndDate: new Date('2026-02-27T17:00:00.000Z'), // 28 Feb 00:00 VN
      plan: { basePrice: 280_000 },
      selectedInterval: 'monthly',
    });
    expect(result.extensionDays).toBe(28);
    expect(result.selectedIntervalDays).toBe(28);
    expect(result.totalDue).toBeCloseTo(280_000, 5);
  });
});
