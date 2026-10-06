/**
 * #543 shop web Danh mục: pure model. Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  categoryPayload,
  formatCreatedAt,
  matchesCategory,
  nextSort,
  pageCategories,
  parseCategoryParams,
  rowActions,
  validateCategory,
} from '../apps/client/app/categories/categories-model';

const params = (q: string) => new URLSearchParams(q);

describe('parseCategoryParams', () => {
  it('defaults: name ascending, page 1, 20 rows', () => {
    expect(parseCategoryParams(params(''))).toEqual({ q: '', page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' });
  });
  it('reads valid values and trims the search', () => {
    expect(parseCategoryParams(params('q=%20ao%20dai%20&page=3&limit=50&sortBy=createdAt&sortOrder=desc'))).toEqual({
      q: 'ao dai',
      page: 3,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });
  it('falls back on broken values (old limit=25, page 0, unknown sort)', () => {
    expect(parseCategoryParams(params('page=0&limit=25&sortBy=price&sortOrder=up'))).toEqual({
      q: '',
      page: 1,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    expect(parseCategoryParams(params('page=abc')).page).toBe(1);
  });
});

describe('nextSort', () => {
  it('flips the same column and starts a new column ascending', () => {
    expect(nextSort({ sortBy: 'name', sortOrder: 'asc' }, 'name')).toEqual({ sortBy: 'name', sortOrder: 'desc' });
    expect(nextSort({ sortBy: 'name', sortOrder: 'desc' }, 'name')).toEqual({ sortBy: 'name', sortOrder: 'asc' });
    expect(nextSort({ sortBy: 'name', sortOrder: 'desc' }, 'createdAt')).toEqual({ sortBy: 'createdAt', sortOrder: 'asc' });
  });
});

describe('validateCategory', () => {
  it('accepts a normal category', () => {
    expect(validateCategory({ name: 'Áo dài', description: '' })).toEqual({});
  });
  it('name: required, 2–50 characters after trim', () => {
    expect(validateCategory({ name: '   ', description: '' }).name).toBe('nameRequired');
    expect(validateCategory({ name: ' A ', description: '' }).name).toBe('nameMinLength');
    expect(validateCategory({ name: 'x'.repeat(50), description: '' }).name).toBeUndefined();
    expect(validateCategory({ name: 'x'.repeat(51), description: '' }).name).toBe('nameMaxLength');
  });
  it('description: at most 200 characters', () => {
    expect(validateCategory({ name: 'Váy', description: 'd'.repeat(200) }).description).toBeUndefined();
    expect(validateCategory({ name: 'Váy', description: 'd'.repeat(201) }).description).toBe('descriptionMaxLength');
  });
});

describe('categoryPayload', () => {
  it('trims both fields', () => {
    expect(categoryPayload({ name: '  Vest ', description: ' cưới ' })).toEqual({ name: 'Vest', description: 'cưới' });
  });
});

describe('formatCreatedAt', () => {
  it('shows the Vietnam day and time whatever the process zone', () => {
    // 2026-10-05T18:30Z is 06/10/2026 01:30 in Vietnam (UTC+7): the day must not be the UTC day.
    expect(formatCreatedAt('2026-10-05T18:30:00.000Z')).toBe('06/10/2026 01:30');
    expect(formatCreatedAt(new Date('2026-10-06T14:14:00.000Z'))).toBe('06/10/2026 21:14');
  });
  it('dash for missing or broken values', () => {
    expect(formatCreatedAt(undefined)).toBe('—');
    expect(formatCreatedAt('not a date')).toBe('—');
  });
});

describe('matchesCategory', () => {
  it('matches word prefixes, accent-insensitively', () => {
    expect(matchesCategory('Áo dài cưới', 'ao')).toBe(true);
    expect(matchesCategory('Áo dài cưới', 'DAI cu')).toBe(true);
    expect(matchesCategory('Đầm dạ hội', 'dam')).toBe(true);
    expect(matchesCategory('Art Supplies', 'supp')).toBe(true);
  });
  it('does not match inside a word', () => {
    expect(matchesCategory('Art Supplies', 'pplies')).toBe(false);
    expect(matchesCategory('Áo dài', 'vest')).toBe(false);
  });
  it('an empty query matches everything', () => {
    expect(matchesCategory('Anything', '   ')).toBe(true);
  });
});

describe('pageCategories', () => {
  const rows = [
    { id: 1, name: 'Váy', createdAt: '2026-10-01T00:00:00.000Z' },
    { id: 2, name: 'Áo dài', createdAt: '2026-10-03T00:00:00.000Z' },
    { id: 3, name: 'Vest', createdAt: '2026-10-02T00:00:00.000Z' },
    { id: 4, name: 'Bàn ghế', createdAt: null },
  ];
  const base = { q: '', page: 1, limit: 2, sortBy: 'name' as const, sortOrder: 'asc' as const };

  it('sorts by name (Vietnamese order, accents ignored) and slices pages', () => {
    expect(pageCategories(rows, base)).toEqual({ rows: [rows[1], rows[3]], total: 4, totalPages: 2, page: 1 });
    expect(pageCategories(rows, { ...base, page: 2 }).rows.map((r) => r.id)).toEqual([1, 3]);
  });
  it('sorts by created date both ways; missing dates sort first ascending', () => {
    expect(pageCategories(rows, { ...base, limit: 10, sortBy: 'createdAt' }).rows.map((r) => r.id)).toEqual([4, 1, 3, 2]);
    expect(pageCategories(rows, { ...base, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }).rows.map((r) => r.id)).toEqual([2, 3, 1, 4]);
  });
  it('searches before paging and clamps a page past the end', () => {
    expect(pageCategories(rows, { ...base, q: 'v', page: 5 })).toEqual({ rows: [rows[0], rows[2]], total: 2, totalPages: 1, page: 1 });
  });
  it('no rows: one empty page', () => {
    expect(pageCategories([], base)).toEqual({ rows: [], total: 0, totalPages: 1, page: 1 });
  });
});

describe('rowActions', () => {
  it('managers edit and delete, but never delete the default category', () => {
    expect(rowActions({ isDefault: false }, true)).toEqual(['view', 'edit', 'delete']);
    expect(rowActions({ isDefault: true }, true)).toEqual(['view', 'edit']);
  });
  it('without products.manage only view', () => {
    expect(rowActions({ isDefault: false }, false)).toEqual(['view']);
  });
});
