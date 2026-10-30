/**
 * #1347 (#1335) "Chi nhánh khác còn N" in the cart of the web create-order page: when to ask, what to ask, what to show.
 * Pure module (`other-outlets-model.ts`); runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it, jest } from '@jest/globals';

// The @rentalshop/utils barrel pulls in React files; the model only needs the pure pricing modules
jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/order-line-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/rental-days') as object),
  ...(jest.requireActual('../packages/utils/src/core/block-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/block-line-text') as object),
}));
import {
  asksOtherOutlets,
  canAskOtherOutlets,
  otherOutletsKey,
  otherOutletsRequest,
  otherOutletsText,
  shortProductIds,
} from '../apps/client/app/orders/create/other-outlets-model';

describe('who asks', () => {
  it.each(['MERCHANT', 'OUTLET_ADMIN', 'OUTLET_INVENTORY'])('%s asks', (role) => {
    expect(canAskOtherOutlets(role)).toBe(true);
  });
  it.each(['OUTLET_STAFF', 'ADMIN', 'OPS', '', null, undefined])('%s does not (the cart shows only "Hết hàng")', (role) => {
    expect(canAskOtherOutlets(role as any)).toBe(false);
  });
  it('is case-insensitive like the other role helpers of the page', () => {
    expect(canAskOtherOutlets('merchant')).toBe(true);
    expect(canAskOtherOutlets('outlet_staff')).toBe(false);
  });
});

describe('when the page asks at all', () => {
  it('an owner not tied to a branch asks only when the shop has more than one branch (the page holds the shop list)', () => {
    expect(asksOtherOutlets('MERCHANT', 2, false)).toBe(true);
    expect(asksOtherOutlets('MERCHANT', 1, false)).toBe(false);
    expect(asksOtherOutlets('MERCHANT', 0, false)).toBe(false);
  });
  it('anyone tied to a branch only knows that branch, so the API decides (empty list for a one-branch shop)', () => {
    expect(asksOtherOutlets('OUTLET_ADMIN', 1, true)).toBe(true);
    expect(asksOtherOutlets('OUTLET_INVENTORY', 1, true)).toBe(true);
    expect(asksOtherOutlets('MERCHANT', 1, true)).toBe(true);
  });
  it('staff never asks, whatever the shop', () => {
    expect(asksOtherOutlets('OUTLET_STAFF', 3, true)).toBe(false);
    expect(asksOtherOutlets(undefined, 3, false)).toBe(false);
  });
});

describe('which lines to ask for', () => {
  const lines = [{ productId: 11 }, { productId: 12 }, { productId: 11 }, { productId: 13 }];
  const kinds: Record<number, 'conflict' | 'short' | 'ok' | null> = { 11: 'short', 12: 'ok', 13: 'conflict' };
  it('collects the products whose line is short or in conflict, once, sorted', () => {
    expect(shortProductIds(lines, (id) => kinds[id] ?? null)).toEqual([11, 13]);
  });
  it('is empty when every line fits or nothing is known yet', () => {
    expect(shortProductIds(lines, () => 'ok')).toEqual([]);
    expect(shortProductIds(lines, () => null)).toEqual([]);
    expect(shortProductIds([], () => 'short')).toEqual([]);
  });
});

describe('the request', () => {
  it('RENT sends the Vietnam days as the batch check does (VN midnight to the last ms of the return day)', () => {
    expect(otherOutletsRequest({ productIds: [11, 13], orderType: 'RENT', pickup: '2026-10-30', ret: '2026-10-31', outletId: 7 })).toEqual({
      products: [
        { productId: 11, quantity: 1 },
        { productId: 13, quantity: 1 },
      ],
      orderType: 'RENT',
      startDate: '2026-10-29T17:00:00.000Z',
      endDate: '2026-10-31T16:59:59.999Z',
      outletId: 7,
    });
  });
  it('SALE has no days', () => {
    expect(otherOutletsRequest({ productIds: [11], orderType: 'SALE', pickup: '', ret: '', outletId: 7 })).toEqual({
      products: [{ productId: 11, quantity: 1 }],
      orderType: 'SALE',
      outletId: 7,
    });
  });
  it('is null without products, without a branch, or a rental without days', () => {
    expect(otherOutletsRequest({ productIds: [], orderType: 'RENT', pickup: '2026-10-30', ret: '2026-10-31', outletId: 7 })).toBeNull();
    expect(otherOutletsRequest({ productIds: [11], orderType: 'RENT', pickup: '2026-10-30', ret: '2026-10-31', outletId: null })).toBeNull();
    expect(otherOutletsRequest({ productIds: [11], orderType: 'RENT', pickup: '', ret: '', outletId: 7 })).toBeNull();
  });
  it('a new key whenever the days, branch or products change (an old answer is dropped)', () => {
    const base = { productIds: [11], orderType: 'RENT' as const, pickup: '2026-10-30', ret: '2026-10-31', outletId: 7 };
    const k = otherOutletsKey(base);
    expect(otherOutletsKey({ ...base })).toBe(k);
    expect(otherOutletsKey({ ...base, ret: '2026-11-01' })).not.toBe(k);
    expect(otherOutletsKey({ ...base, outletId: 8 })).not.toBe(k);
    expect(otherOutletsKey({ ...base, productIds: [11, 12] })).not.toBe(k);
    expect(otherOutletsKey({ ...base, productIds: [] })).toBe('');
  });
});

describe('the text', () => {
  it('"Quận 7 (3), Thủ Đức (1)", most first as the API sends them', () => {
    expect(
      otherOutletsText([
        { outletId: 3, outletName: 'Quận 7', available: 3 },
        { outletId: 5, outletName: 'Thủ Đức', available: 1 },
      ]),
    ).toBe('Quận 7 (3), Thủ Đức (1)');
  });
  it('is empty for no branch (nothing to show)', () => {
    expect(otherOutletsText([])).toBe('');
    expect(otherOutletsText(undefined)).toBe('');
  });
});

describe('the cart wires it up (source)', () => {
  const dir = path.resolve(__dirname, '../apps/client/app/orders/create');
  const editor = fs.readFileSync(path.join(dir, 'OrderEditor.tsx'), 'utf8');
  const parts = fs.readFileSync(path.join(dir, 'parts.tsx'), 'utf8');
  it('asks only through the model (role, short lines), never for staff', () => {
    expect(editor).toContain('asksOtherOutlets(');
    expect(editor).toMatch(/productsApi\s*\.checkOtherOutletsAvailability/);
  });
  it('shows the hint under the line status, with the translated key', () => {
    expect(parts).toContain("t('editor.cart.othersHave'");
    expect(parts.indexOf("t('editor.cart.othersHave'")).toBeGreaterThan(parts.indexOf('{status.text}'));
  });
});
