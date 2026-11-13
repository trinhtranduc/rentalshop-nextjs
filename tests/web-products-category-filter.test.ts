/**
 * #1536 Sản phẩm (web): "Danh mục" is one menu where several categories can be ticked. URL `category=3,7`, the old
 * `category=3` still works; one category goes to the API as `categoryId`, several as `categoryIds`.
 * Spec .agent/changes/1536-category-multi-filter (5-8, 10).
 */
jest.mock('../packages/utils/src/core', () => ({ authenticatedFetch: jest.fn(), parseApiResponse: jest.fn(async (r: unknown) => r) }));
jest.mock('../packages/utils/src/config/api', () => ({ apiUrls: { products: { list: 'https://local.example/api/products' } } }));
import { describe, expect, it } from '@jest/globals';
import {
  categoryButtonLabel,
  categoryParam,
  filterKey,
  matchCategories,
  parseCategoryIds,
  parseListQuery,
  singleCategory,
  toApiFilters,
  toggleCategory,
} from '../apps/client/app/products/list/list-model';
import { productsApi } from '../packages/utils/src/api/products';
import { authenticatedFetch } from '../packages/utils/src/core';

const query = (qs = '') => {
  const p = new URLSearchParams(qs);
  return parseListQuery((k) => p.get(k));
};
const CATS = [
  { id: 3, name: 'Áo dài', count: 12 },
  { id: 7, name: 'Vest', count: 4 },
  { id: 9, name: 'Audio Equipment', count: 1 },
];

describe('URL', () => {
  it('category=3,7 → [3, 7]; old category=3 → [3]; none → []', () => {
    expect(query('category=3,7').categoryIds).toEqual([3, 7]);
    expect(query('category=3').categoryIds).toEqual([3]);
    expect(query().categoryIds).toEqual([]);
  });
  it('drops junk, zero and repeats, keeps the order', () => {
    expect(parseCategoryIds('7,abc,0,-2,7, 3,2.5')).toEqual([7, 3]);
    expect(parseCategoryIds(null)).toEqual([]);
  });
  it('categoryParam / toggleCategory', () => {
    expect(categoryParam([])).toBeNull();
    expect(categoryParam([3, 7])).toBe('3,7');
    expect(toggleCategory([3], 7)).toEqual([3, 7]);
    expect(toggleCategory([3, 7], 3)).toEqual([7]);
  });
});

describe('API filters', () => {
  it('none: neither key', () => {
    const f = toApiFilters(query());
    expect(f.categoryId).toBeUndefined();
    expect(f).not.toHaveProperty('categoryIds');
  });
  it('one: categoryId as before (works with an older API)', () => {
    const f = toApiFilters(query('category=7'));
    expect(f.categoryId).toBe(7);
    expect(f).not.toHaveProperty('categoryIds');
  });
  it('several: categoryIds only', () => {
    const f = toApiFilters(query('category=3,7'));
    expect(f.categoryId).toBeUndefined();
    expect(f.categoryIds).toEqual([3, 7]);
  });
  it('filterKey changes with the categories', () => {
    expect(filterKey(query('category=3'))).not.toBe(filterKey(query('category=3,7')));
  });
  it('productsApi.searchProducts sends categoryIds=3,7', async () => {
    await productsApi.searchProducts({ categoryIds: [3, 7], page: 1, limit: 10 });
    const url = new URL((authenticatedFetch as jest.Mock).mock.calls.at(-1)![0] as string);
    expect(url.searchParams.get('categoryIds')).toBe('3,7');
    expect(url.searchParams.has('categoryId')).toBe(false);
  });
});

describe('menu', () => {
  it('button label: all, the name of one, or how many', () => {
    expect(categoryButtonLabel([], CATS)).toEqual({ kind: 'all' });
    expect(categoryButtonLabel([7], CATS)).toEqual({ kind: 'one', name: 'Vest' });
    expect(categoryButtonLabel([3, 7], CATS)).toEqual({ kind: 'many', count: 2 });
    expect(categoryButtonLabel([42], CATS)).toEqual({ kind: 'many', count: 1 });
  });
  it('search ignores accents and case', () => {
    expect(matchCategories(CATS, 'ao').map((c) => c.id)).toEqual([3]);
    expect(matchCategories(CATS, 'ÁO DÀI').map((c) => c.id)).toEqual([3]);
    expect(matchCategories(CATS, ' ').map((c) => c.id)).toEqual([3, 7, 9]);
    expect(matchCategories(CATS, 'equip').map((c) => c.id)).toEqual([9]);
  });
  it('photo search gets the category only when exactly one is picked', () => {
    expect(singleCategory([7])).toBe(7);
    expect(singleCategory([])).toBeUndefined();
    expect(singleCategory([3, 7])).toBeUndefined();
  });
});
