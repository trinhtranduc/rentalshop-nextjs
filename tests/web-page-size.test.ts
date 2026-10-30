/**
 * #1362 shop web: rows per page you can type (1 to 3000), next to the quick 10 / 20 / 50 / 100.
 * Pure model, no app imports, so it runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PAGE_SIZE_PRESETS,
  commitPageSize,
  isPresetPageSize,
  parsePageSize,
} from '../apps/client/app/orders/page-size';
import { parsePageSize as ordersParse } from '../apps/client/app/orders/orders-model';
import { parsePageSize as customersParse } from '../apps/client/app/customers/customers-model';
import { parseListQuery, toApiFilters } from '../apps/client/app/products/list/list-model';
import { parseOutletParams } from '../apps/client/app/outlets/outlets-model';
import { parseCategoryParams } from '../apps/client/app/categories/categories-model';
import { parseStaffPageSize } from '../apps/client/app/users/users-model';

describe('constants', () => {
  it('keeps the quick sizes, the default and the cap', () => {
    expect(PAGE_SIZE_PRESETS).toEqual([10, 20, 50, 100]);
    expect(DEFAULT_PAGE_SIZE).toBe(10);
    expect(MAX_PAGE_SIZE).toBe(3000);
  });
  it('knows a quick size', () => {
    expect(isPresetPageSize(50)).toBe(true);
    expect(isPresetPageSize(25)).toBe(false);
  });
});

describe('parsePageSize (URL value)', () => {
  it('accepts any whole number from 1 to 3000', () => {
    expect(parsePageSize('1')).toBe(1);
    expect(parsePageSize('25')).toBe(25);
    expect(parsePageSize('100')).toBe(100);
    expect(parsePageSize('250')).toBe(250);
    expect(parsePageSize('3000')).toBe(3000);
  });
  it('clamps a number above the cap to 3000', () => {
    expect(parsePageSize('3001')).toBe(3000);
    expect(parsePageSize('99999999999999999999')).toBe(3000);
  });
  it('falls back for zero, negative, text, decimals and empty', () => {
    for (const bad of ['0', '-5', 'abc', '', ' ', '2.5', '1e3', 'NaN', null, undefined]) {
      expect(parsePageSize(bad as string | null | undefined)).toBe(10);
    }
  });
  it('uses the page own default when one is given (outlets, categories and staff start at 20)', () => {
    expect(parsePageSize('abc', 20)).toBe(20);
    expect(parsePageSize(null, 20)).toBe(20);
    expect(parsePageSize('7', 20)).toBe(7);
  });
  it('is the same function for orders and customers (old imports keep working)', () => {
    expect(ordersParse('25')).toBe(25);
    expect(customersParse('3001')).toBe(3000);
  });
});

describe('commitPageSize (what the user typed)', () => {
  it('applies a valid number', () => {
    expect(commitPageSize('25', 10)).toEqual({ value: 25, clamped: false });
    expect(commitPageSize(' 3000 ', 10)).toEqual({ value: 3000, clamped: false });
    expect(commitPageSize('1', 10)).toEqual({ value: 1, clamped: false });
  });
  it('clamps to the edges and says so', () => {
    expect(commitPageSize('3001', 10)).toEqual({ value: 3000, clamped: true });
    expect(commitPageSize('0', 25)).toEqual({ value: 1, clamped: true });
  });
  it('keeps the old value for empty or non-numbers', () => {
    for (const bad of ['', '  ', 'abc', '-3', '2.5', '1e3']) {
      expect(commitPageSize(bad, 25)).toEqual({ value: 25, clamped: false });
    }
  });
});

describe('every list reads the typed size from the URL', () => {
  it('products', () => {
    const get = (k: string) => (k === 'limit' ? '25' : null);
    expect(parseListQuery(get).limit).toBe(25);
    expect(toApiFilters(parseListQuery(get)).limit).toBe(25);
    expect(parseListQuery((k) => (k === 'limit' ? '5000' : null)).limit).toBe(3000);
    expect(parseListQuery(() => null).limit).toBe(10);
  });
  it('outlets and categories (default 20)', () => {
    const p = (s: string) => new URLSearchParams(s);
    expect(parseOutletParams(p('limit=250')).limit).toBe(250);
    expect(parseOutletParams(p('limit=x')).limit).toBe(20);
    expect(parseCategoryParams(p('limit=250')).limit).toBe(250);
    expect(parseCategoryParams(p('')).limit).toBe(20);
  });
  it('staff (default 20)', () => {
    expect(parseStaffPageSize('250')).toBe(250);
    expect(parseStaffPageSize('x')).toBe(20);
    expect(parseStaffPageSize(null)).toBe(20);
  });
});
