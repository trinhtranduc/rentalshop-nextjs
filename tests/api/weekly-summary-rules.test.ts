/**
 * #1612 pure rules of the AI weekly summary: which week, which language, what the model must return, and that the
 * prompt carries figures and names of products and branches but never customer names or phones.
 */
jest.mock('@rentalshop/utils', () => jest.requireActual('../../packages/utils/src/core/date-range'));

import { lastFullWeek, mondayOf, nextWeekStart, daysOf } from '../../apps/api/lib/weekly-summary/week';
import {
  parseSummaryContent,
  resolveSummaryLanguage,
  summarySystemPrompt,
  summaryUserMessage,
} from '../../apps/api/lib/weekly-summary/prompt';

describe('week keys (Monday..Sunday)', () => {
  it.each([
    ['2026-11-16', '2026-11-09', '2026-11-15'], // Monday
    ['2026-11-18', '2026-11-09', '2026-11-15'], // Wednesday
    ['2026-11-22', '2026-11-09', '2026-11-15'], // Sunday
    ['2026-11-23', '2026-11-16', '2026-11-22'], // next Monday
    ['2027-01-01', '2026-12-21', '2026-12-27'], // across the year
  ])('today %s → last full week %s..%s', (today, start, end) => {
    expect(lastFullWeek(today)).toEqual({ start, end });
  });

  it('Monday of a week and the next writing day', () => {
    expect(mondayOf('2026-11-22')).toBe('2026-11-16');
    expect(nextWeekStart('2026-11-16')).toBe('2026-11-23');
    expect(nextWeekStart('2026-11-22')).toBe('2026-11-23');
    expect(daysOf({ start: '2026-11-09', end: '2026-11-15' })).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ]);
  });
});

describe('summary language from Accept-Language', () => {
  it.each([
    ['vi', 'vi'],
    ['vi-VN,vi;q=0.9', 'vi'],
    ['en-US', 'en'],
    ['ja;q=0.9', 'ja'],
    ['zh-TW', 'zh-TW'],
    ['zh-Hant-TW', 'zh-TW'],
    ['zh-Hans', 'zh'],
    ['ru', 'ru'],
    ['pt-BR', 'vi'],
    ['', 'vi'],
    [null, 'vi'],
  ])('%s → %s', (header, expected) => {
    expect(resolveSummaryLanguage(header as any)).toBe(expected);
  });

  it('the system prompt names the language', () => {
    expect(summarySystemPrompt('ja')).toContain('Write in Japanese');
    expect(summarySystemPrompt('zz')).toContain('Write in Vietnamese');
  });
});

describe('model output', () => {
  it('keeps three actions and trims text', () => {
    const parsed = parseSummaryContent(
      JSON.stringify({ summary: '  Tốt hơn. ', actions: ['a', 'b', 'c', 'd'], revenueNote: 'r', ordersNote: 'o', productsNote: 'p' })
    );
    expect(parsed).toEqual({ summary: 'Tốt hơn.', actions: ['a', 'b', 'c'], revenueNote: 'r', ordersNote: 'o', productsNote: 'p' });
  });

  it.each([
    ['not json', 'nope'],
    ['missing field', JSON.stringify({ summary: 'x', actions: ['a'], revenueNote: 'r', ordersNote: 'o' })],
    ['no action', JSON.stringify({ summary: 'x', actions: [], revenueNote: 'r', ordersNote: 'o', productsNote: 'p' })],
    ['empty summary', JSON.stringify({ summary: ' ', actions: ['a'], revenueNote: 'r', ordersNote: 'o', productsNote: 'p' })],
  ])('rejects %s', (_label, text) => {
    expect(parseSummaryContent(text)).toBeNull();
  });
});

describe('prompt figures', () => {
  const change = (current: number, previous: number, growth = 0) => ({ current, previous, growth });
  const numbers: any = {
    week: { start: '2026-11-09', end: '2026-11-15' },
    previousWeek: { start: '2026-11-02', end: '2026-11-08' },
    revenue: { orderValue: change(18450000, 16470000, 12.02), collected: change(15200000, 14000000, 8.57), outstanding: 3250000, fees: 600000 },
    branches: [
      { outletId: 3, name: 'Lê Lợi', orderValue: change(10200000, 8640000, 18.06), collected: 8400000, newOrders: 21 },
      { outletId: 4, name: 'Võ Văn Tần', orderValue: change(8250000, 7860000, 4.96), collected: 6800000, newOrders: 21 },
    ],
    orders: { new: change(42, 37, 13.51), rent: 38, sale: 4, cancelled: 2, byDay: [{ date: '2026-11-14', count: 14 }] },
    rentals: { pickedUp: 36, returned: 31, late: change(4, 1, 300), notPickedUp: 2 },
    products: { hot: [{ productId: 7, name: 'Áo dài cưới đỏ', rentals: 9, sales: 0, revenue: 3600000 }], notRented: 12 },
    customers: { total: 30, new: 18, returning: 12, returningShare: 55 },
  };

  it('has the figures, product and branch names, the scope and the shop, without database ids', () => {
    const text = summaryUserMessage(numbers, { businessType: 'CLOTHING', country: 'VN', city: 'HCM', currency: 'VND', branchName: null }, '2026-11-16');
    const payload = JSON.parse(text.slice(text.indexOf('{')));
    expect(payload.shop).toEqual({ type: 'CLOTHING', country: 'VN', city: 'HCM', currency: 'VND', scope: 'whole shop' });
    expect(payload.branches.map((b: any) => b.name)).toEqual(['Lê Lợi', 'Võ Văn Tần']);
    expect(payload.products.hot[0]).toEqual({ name: 'Áo dài cưới đỏ', rentals: 9, sales: 0, revenue: 3600000 });
    expect(payload.rentals.late).toEqual({ current: 4, previous: 1, growth: 300 });
    expect(text).not.toMatch(/outletId|productId|customerId|phone/i);
  });

  it('a branch summary says which branch', () => {
    const text = summaryUserMessage({ ...numbers, branches: [] }, { branchName: 'Lê Lợi' }, '2026-11-16');
    expect(text).toContain('"scope":"one branch: Lê Lợi"');
  });
});
