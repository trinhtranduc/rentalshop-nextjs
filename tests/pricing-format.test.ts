/**
 * #733 #734 #735 /pricing: formatting uses the page language, never the runtime default,
 * so server and browser render the same text. Must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  COMPARISON_NAME_KEYS,
  formatComparisonValue,
  formatPlanLimit,
  formatPricingCount,
  formatPricingPrice,
  planTextKeys,
  pricingIntlLocale,
} from '../apps/client/lib/pricing-format';
import { getPlanComparison } from '../packages/constants/src/subscription';
import vi from '../locales/vi/plans.json';
import en from '../locales/en/plans.json';
import ja from '../locales/ja/plans.json';
import ko from '../locales/ko/plans.json';
import zh from '../locales/zh/plans.json';

const norm = (s: string) => s.replace(/[  ]/g, ' ');

describe('pricing number formatting', () => {
  it('uses the given locale, not the runtime default', () => {
    expect(formatPricingCount(2000, 'vi')).toBe('2.000');
    expect(formatPricingCount(2000, 'en')).toBe('2,000');
    expect(formatPricingCount(50000, 'vi')).toBe('50.000');
  });
  it('falls back to vi-VN for an unknown language', () => {
    expect(pricingIntlLocale('xx')).toBe('vi-VN');
    expect(pricingIntlLocale('ja')).toBe('ja-JP');
  });
  it('formats plan prices in VND per language', () => {
    expect(norm(formatPricingPrice(99000, 'vi'))).toBe('99.000 ₫');
    expect(norm(formatPricingPrice(99000, 'en'))).toContain('99,000');
  });
  it('shows the unlimited label for -1', () => {
    expect(formatPlanLimit(-1, 'vi', 'Không giới hạn')).toBe('Không giới hạn');
    expect(formatPlanLimit(5000, 'vi', 'x')).toBe('5.000');
  });
  it('re-formats numeric comparison cells and leaves other text', () => {
    expect(formatComparisonValue('5,000', 'vi')).toBe('5.000');
    expect(formatComparisonValue('3', 'en')).toBe('3');
    expect(formatComparisonValue('Unlimited', 'vi')).toBe('Unlimited');
  });
});

describe('pricing texts', () => {
  const locales = { vi, en, ja, ko, zh } as Record<string, any>;
  const enKeys = Object.keys(en.pricingPage).sort();

  it('every language has the same pricingPage keys, all non-empty', () => {
    for (const l of Object.values(locales)) {
      expect(Object.keys(l.pricingPage).sort()).toEqual(enKeys);
      for (const v of Object.values(l.pricingPage)) expect(String(v).trim()).not.toBe('');
    }
  });
  it('has the loyalty plan feature label in every language (#733)', () => {
    for (const l of Object.values(locales)) expect(String(l.features.loyalty).trim()).not.toBe('');
  });
  it('every comparison row, plan and badge has a key', () => {
    for (const f of getPlanComparison().features) {
      const key = COMPARISON_NAME_KEYS[f.name];
      expect(key).toBeDefined();
      expect(enKeys).toContain(key);
    }
    for (const id of ['trial', 'basic', 'professional', 'enterprise']) {
      const k = planTextKeys(id);
      expect(enKeys).toContain(k.name);
      expect(enKeys).toContain(k.description);
    }
    for (const b of ['Free Trial', 'Most Popular', 'Premium']) {
      expect(enKeys).toContain(planTextKeys('basic', b).badge);
    }
  });
});
