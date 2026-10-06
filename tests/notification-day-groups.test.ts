/**
 * #509 notification panel groups by Vietnam civil day (UTC+7), whatever the machine TZ.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import { dayMonthFromKey, groupByShopDay as group } from '../apps/client/app/components/shell/notification-groups';
import { getLocalDateKey } from '../packages/utils/src/core/date';

const groupByShopDay = <T extends { createdAt: string }>(items: T[], now: Date) => group(items, now, getLocalDateKey);

const n = (id: number, createdAt: string) => ({ id, createdAt });

describe('groupByShopDay', () => {
  // 2026-10-06 09:00 in Vietnam
  const now = new Date('2026-10-06T02:00:00.000Z');

  it('puts 16:59:59Z and 17:00:00Z on different Vietnam days', () => {
    const groups = groupByShopDay([n(1, '2026-10-05T17:00:00.000Z'), n(2, '2026-10-05T16:59:59.000Z')], now);
    expect(groups.map((g) => [g.dateKey, g.label.kind, g.items.map((i) => i.id)])).toEqual([
      ['2026-10-06', 'today', [1]],
      ['2026-10-05', 'yesterday', [2]],
    ]);
  });

  it('labels older days dd/MM, newest first, across a month end', () => {
    const groups = groupByShopDay([n(3, '2026-09-30T10:00:00.000Z'), n(4, '2026-10-03T10:00:00.000Z')], now);
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-10-03', '2026-09-30']);
    expect(groups[1].label).toEqual({ kind: 'date', text: '30/09' });
  });

  it('just after Vietnam midnight, "today" is the new Vietnam day', () => {
    const justAfterMidnight = new Date('2026-10-05T17:00:30.000Z'); // 00:00:30 on 06/10 in Vietnam
    const groups = groupByShopDay([n(5, '2026-10-05T17:00:10.000Z'), n(6, '2026-10-05T12:00:00.000Z')], justAfterMidnight);
    expect(groups.map((g) => g.label.kind)).toEqual(['today', 'yesterday']);
  });

  it('skips items with an unreadable date', () => {
    expect(groupByShopDay([n(7, 'not a date')], now)).toEqual([]);
  });
});

describe('dayMonthFromKey', () => {
  it('formats without a Date object', () => {
    expect(dayMonthFromKey('2026-01-09')).toBe('09/01');
  });
});
