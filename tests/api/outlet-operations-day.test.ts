/**
 * #350 — "today" for the operations panel is the Vietnam civil day.
 */
import { getOperationsDay, daysBetweenDateKeys } from '../../apps/api/lib/outlet-operations-day';

describe('getOperationsDay (#350)', () => {
  it('16:59:59Z is still the same Vietnam day (23:59:59 +07)', () => {
    const day = getOperationsDay(new Date('2026-10-01T16:59:59.000Z'));
    expect(day.dateKey).toBe('2026-10-01');
    expect(day.start.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(day.end.toISOString()).toBe('2026-10-01T16:59:59.999Z');
  });

  it('17:00:00Z is already the next Vietnam day', () => {
    const day = getOperationsDay(new Date('2026-10-01T17:00:00.000Z'));
    expect(day.dateKey).toBe('2026-10-02');
    expect(day.start.toISOString()).toBe('2026-10-01T17:00:00.000Z');
  });

  it('works across a year end', () => {
    expect(getOperationsDay(new Date('2026-12-31T18:00:00.000Z')).dateKey).toBe('2027-01-01');
  });
});

describe('daysBetweenDateKeys (#350)', () => {
  it('counts civil days between two keys', () => {
    expect(daysBetweenDateKeys('2026-10-01', '2026-10-02')).toBe(1);
    expect(daysBetweenDateKeys('2026-09-28', '2026-10-02')).toBe(4);
    expect(daysBetweenDateKeys('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetweenDateKeys('2026-10-02', '2026-10-02')).toBe(0);
  });
});
