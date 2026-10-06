/**
 * #582 shop web /plans: limits and features from the API's JSON strings, price and cycle estimate.
 * No day logic, but run under TZ=UTC and TZ=Asia/Ho_Chi_Minh like the other web models.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  BILLING_CYCLES,
  cycleDiscount,
  cycleTotal,
  cycleTotalText,
  isCurrentPlan,
  limitText,
  planFeatures,
  planLimits,
  planPriceText,
} from '../apps/client/app/plans/plans-model';

const LOCALES = ['en', 'vi', 'ja', 'ko', 'zh'];
const web = (loc: string) => JSON.parse(fs.readFileSync(path.join(__dirname, `../locales/${loc}/plans.json`), 'utf8')).web;
const vi = web('vi');

/** next-intl-like lookup on the real Vietnamese strings, so a missing key fails the test. */
const t = (key: string, values?: Record<string, string | number>) => {
  const raw = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], vi);
  if (typeof raw !== 'string') throw new Error(`missing key ${key}`);
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(values?.[k] ?? `{${k}}`));
};
const n = (v: number) => new Intl.NumberFormat('vi-VN').format(v);
const nbsp = (s: string) => s.replace(/ /g, ' ');

// Shape returned by GET /api/plans today (seed data)
const basic = {
  id: 2,
  basePrice: 79000,
  currency: 'USD',
  limits: '{"outlets":1,"users":2,"products":3000,"customers":3000,"orders":3000}',
  features: '["Mobile app access","Basic inventory management","loyalty"]',
};

describe('plans-model', () => {
  it('reads limits from the JSON string the API sends (was "Not set")', () => {
    expect(planLimits(basic)).toEqual([
      { key: 'outlets', limit: 1 },
      { key: 'users', limit: 2 },
      { key: 'products', limit: 3000 },
      { key: 'customers', limit: 3000 },
      { key: 'orders', limit: 3000 },
    ]);
  });

  it('reads limits from an object; -1 and null are unlimited; unknown keys and bad values are skipped', () => {
    const rows = planLimits({ limits: { outlets: -1, users: null, products: 0, foo: 3, customers: 'x' } });
    expect(rows).toEqual([
      { key: 'outlets', limit: null },
      { key: 'users', limit: null },
      { key: 'products', limit: 0 },
    ]);
    expect(rows.map((r) => limitText(r, t, n))).toEqual(['Không giới hạn', 'Không giới hạn', '0']);
    expect(limitText({ key: 'products', limit: 15000 }, t, n)).toBe('15.000');
  });

  it('returns no limits or features for missing or broken data', () => {
    expect(planLimits({})).toEqual([]);
    expect(planLimits({ limits: 'not json' })).toEqual([]);
    expect(planLimits({ limits: '[1,2]' })).toEqual([]);
    expect(planFeatures({})).toEqual([]);
    expect(planFeatures({ features: '{"a":1}' })).toEqual([]);
  });

  it('reads features from a JSON string or an array, dropping blanks', () => {
    expect(planFeatures(basic)).toEqual(['Mobile app access', 'Basic inventory management', 'loyalty']);
    expect(planFeatures({ features: [' A ', '', 3, 'B'] })).toEqual(['A', 'B']);
  });

  it('formats the price like Cài đặt → Gói dịch vụ; 0 is "Miễn phí"', () => {
    expect(nbsp(planPriceText({ basePrice: 199000, currency: 'VND' }, t))).toBe('199.000 ₫');
    expect(planPriceText({ basePrice: 9.99, currency: 'USD' }, t)).toBe('$9.99');
    expect(nbsp(planPriceText({ basePrice: 79000, currency: null }, t))).toBe('79.000 ₫');
    expect(planPriceText({ basePrice: 0, currency: 'USD' }, t)).toBe('Miễn phí');
    expect(planPriceText({ basePrice: null }, t)).toBe('Miễn phí');
  });

  it('estimates each cycle the same way the cycle picker shows it: month ×1, quarter ×3, year ×12 −10%', () => {
    expect(BILLING_CYCLES).toEqual(['monthly', 'quarterly', 'yearly']);
    expect(cycleTotal(100000, 'monthly')).toBe(100000);
    expect(cycleTotal(100000, 'quarterly')).toBe(300000);
    expect(cycleTotal(100000, 'yearly')).toBe(1080000);
    expect(cycleTotal(undefined, 'yearly')).toBe(0);
    expect(BILLING_CYCLES.map(cycleDiscount)).toEqual([0, 0, 10]);
    expect(nbsp(cycleTotalText({ basePrice: 100000, currency: 'VND' }, 'yearly', t))).toBe('1.080.000 ₫');
    expect(cycleTotalText({ basePrice: 0, currency: 'VND' }, 'quarterly', t)).toBe('Miễn phí');
  });

  it('marks the current plan by public id only', () => {
    expect(isCurrentPlan({ id: 2 }, 2)).toBe(true);
    expect(isCurrentPlan({ id: 2 }, 3)).toBe(false);
    expect(isCurrentPlan({ id: 2 }, null)).toBe(false);
    expect(isCurrentPlan({ id: null }, null)).toBe(false);
  });

  it('has every plans.web key in all five locales', () => {
    const keys = (o: Record<string, unknown>, p = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
    const viKeys = keys(vi).sort();
    for (const loc of LOCALES) expect(keys(web(loc)).sort()).toEqual(viKeys);
  });
});
