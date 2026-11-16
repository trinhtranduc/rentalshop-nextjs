/**
 * #1612 web: the "✦ Tóm tắt tuần" button and side panel on Tổng quan read GET / POST /api/analytics/weekly-summary.
 * Button only when the API has the AI key; red dot until this week's summary is opened; growth badges; day bars.
 */
import {
  countBadge,
  dayBars,
  percentBadge,
  showsNewDot,
  showsSummaryButton,
  weekLabel,
} from '../apps/client/app/dashboard/weekly-summary-model';
import fs from 'fs';
import path from 'path';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const base = { week: { start: '2026-11-09', end: '2026-11-15' }, nextWeekStart: '2026-11-23', branchName: null, summary: null };

describe('button and dot', () => {
  it('hidden without the AI key or without data', () => {
    expect(showsSummaryButton(null)).toBe(false);
    expect(showsSummaryButton({ ...base, available: false, status: 'NONE' })).toBe(false);
    expect(showsSummaryButton({ ...base, available: true, status: 'READY' })).toBe(true);
  });

  it('red dot only while this week is not opened', () => {
    expect(showsNewDot({ ...base, available: true, status: 'NONE' })).toBe(true);
    expect(showsNewDot({ ...base, available: true, status: 'READY' })).toBe(false);
    expect(showsNewDot({ ...base, available: true, status: 'NO_ORDERS' })).toBe(false);
    expect(showsNewDot({ ...base, available: false, status: 'NONE' })).toBe(false);
  });
});

describe('badges', () => {
  it('percent: rounded, up is good, down is bad, zero hidden', () => {
    expect(percentBadge({ current: 18450000, previous: 16470000, growth: 12.02 })).toEqual({ dir: 'up', value: 12, tone: 'good' });
    expect(percentBadge({ current: 1, previous: 2, growth: -50 })).toEqual({ dir: 'down', value: 50, tone: 'bad' });
    expect(percentBadge({ current: 5, previous: 5, growth: 0 })).toBeNull();
    expect(percentBadge(undefined)).toBeNull();
  });

  it('count difference; late returns going up are bad', () => {
    expect(countBadge({ current: 42, previous: 37, growth: 13.5 })).toEqual({ text: '▲ 5', tone: 'good' });
    expect(countBadge({ current: 4, previous: 1, growth: 300 }, true)).toEqual({ text: '▲ 3', tone: 'bad' });
    expect(countBadge({ current: 1, previous: 3, growth: -66 }, true)).toEqual({ text: '▼ 2', tone: 'good' });
    expect(countBadge({ current: 2, previous: 2, growth: 0 })).toBeNull();
  });
});

describe('day bars and labels', () => {
  it('Monday first, weekday names, tallest day marked, zero days still visible', () => {
    const bars = dayBars(
      [
        { date: '2026-11-09', count: 3 },
        { date: '2026-11-10', count: 0 },
        { date: '2026-11-14', count: 14 },
        { date: '2026-11-15', count: 6 },
      ],
      WEEKDAYS
    );
    expect(bars.map((b) => b.label)).toEqual(['T2', 'T3', 'T7', 'CN']);
    expect(bars.map((b) => b.height)).toEqual([21, 6, 100, 43]);
    expect(bars.map((b) => b.top)).toEqual([false, false, true, false]);
    expect(dayBars([{ date: '2026-11-09', count: 0 }], WEEKDAYS)[0]).toMatchObject({ height: 6, top: false });
  });

  it('week label', () => {
    expect(weekLabel({ start: '2026-11-09', end: '2026-11-15' }, WEEKDAYS)).toBe('T2 09/11 – CN 15/11');
  });
});

describe('every web language has the panel strings', () => {
  const KEYS = ['button', 'title', 'wholeShop', 'newDot', 'loading', 'loadingHint', 'actions', 'revenue', 'fees', 'branchOrders',
    'orders', 'newOrders', 'rentSaleCancel', 'outBack', 'lateNotPicked', 'byDay', 'products', 'times', 'customers', 'newReturning',
    'footer', 'written', 'noOrders', 'failed'];
  for (const loc of ['vi', 'en', 'ja', 'ko', 'zh', 'zh-TW', 'th', 'id', 'es', 'fr', 'de', 'ru']) {
    it(loc, () => {
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, `../locales/${loc}/dashboard.json`), 'utf8'));
      const ai = json.home.aiSummary;
      for (const key of KEYS) expect(typeof ai?.[key]).toBe('string');
      expect(ai.branchOrders).toContain('{count}');
      expect(ai.times).toContain('{count}');
      expect(ai.written).toContain('{at}');
      expect(ai.written).toContain('{next}');
    });
  }
});
