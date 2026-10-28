/**
 * #1293 several carts on the shop web Tạo đơn: the rules of the apps (iOS CartStore.swift) as pure moves.
 * Names, avatars, the 10-cart limit, closing, the saved copy. Day logic must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it, jest } from '@jest/globals';

// The @rentalshop/utils barrel pulls in React files; the model only needs the pure pricing modules
jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/order-line-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/rental-days') as object),
  ...(jest.requireActual('../packages/utils/src/core/block-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/block-line-text') as object),
}));
import {
  MAX_CARTS,
  activeOf,
  addCart,
  avatarColor,
  avatarText,
  blankCart,
  canAddCart,
  cartTitle,
  cartTotal,
  hasDraftContent,
  initialState,
  itemCountOf,
  nextNumber,
  patchCart,
  removeCart,
  restore,
  serialize,
  storageKey,
  switchCart,
  type CartsState,
} from '../apps/client/app/orders/create/cart-store';
import { lineFromProduct, setQuantity, type ProductLike } from '../apps/client/app/orders/create/create-model';

const AO: ProductLike = {
  id: 11,
  name: 'Áo dài đỏ',
  barcode: 'AD001',
  images: [],
  rentPrice: 50_000,
  salePrice: 900_000,
  deposit: 0,
  pricingType: 'FIXED',
  pricingOptions: [],
};
const title = (n: number) => `Giỏ ${n}`;
const withLines = (qty = 1) => {
  const line = lineFromProduct(AO, 'RENT');
  return setQuantity([line], line.key, qty);
};
const customer = (name: string, id = 5) => ({ id, name, phone: '0900' });

function open(n: number): CartsState {
  let s = initialState();
  for (let i = 1; i < n; i++) s = addCart(s);
  return s;
}

describe.each(['UTC', 'Asia/Ho_Chi_Minh'])('carts (process TZ %s)', () => {
  describe('add and switch', () => {
    it('starts with one empty cart, "Giỏ 1"', () => {
      const s = initialState();
      expect(s.carts).toHaveLength(1);
      expect(activeOf(s).number).toBe(1);
      expect(cartTitle(activeOf(s), title)).toBe('Giỏ 1');
    });

    it('a new cart is empty, used at once, and takes the smallest free number', () => {
      let s = open(3);
      expect(s.carts.map((c) => c.number)).toEqual([1, 2, 3]);
      expect(activeOf(s).id).toBe(s.carts[2].id);
      s = removeCart(s, s.carts[1].id);
      s = addCart(s);
      expect(activeOf(s).number).toBe(2);
      expect(nextNumber(s.carts)).toBe(4);
    });

    it('carries the outlet over to the new cart, nothing else', () => {
      let s = patchCart(initialState(), initialState().activeId, {});
      s = patchCart(s, s.activeId, { outletId: 7, customer: customer('Lan'), lines: withLines() });
      const next = addCart(s);
      expect(activeOf(next).outletId).toBe(7);
      expect(activeOf(next).customer).toBeNull();
      expect(activeOf(next).lines).toEqual([]);
    });

    it('switching asks nothing and leaves the old cart as it was', () => {
      let s = patchCart(initialState(), initialState().activeId, {});
      const first = s.activeId;
      s = patchCart(s, first, { customer: customer('Chị Lan'), lines: withLines(2), notes: 'giao sớm' });
      s = addCart(s);
      const back = switchCart(s, first);
      expect(back.activeId).toBe(first);
      expect(activeOf(back).lines[0].quantity).toBe(2);
      expect(activeOf(back).notes).toBe('giao sớm');
      expect(switchCart(back, 'nope')).toBe(back);
      expect(switchCart(back, first)).toBe(back);
    });

    it('stops at 10 carts', () => {
      const s = open(MAX_CARTS);
      expect(s.carts).toHaveLength(10);
      expect(canAddCart(s)).toBe(false);
      expect(addCart(s)).toBe(s);
      expect(canAddCart(open(9))).toBe(true);
    });
  });

  describe('closing', () => {
    it('removes the cart and uses its neighbour', () => {
      let s = open(3);
      const [a, b, c] = s.carts.map((x) => x.id);
      s = switchCart(s, b);
      const afterB = removeCart(s, b);
      expect(afterB.carts.map((x) => x.id)).toEqual([a, c]);
      expect(afterB.activeId).toBe(c);
      const last = open(3);
      expect(removeCart(last, last.carts[2].id).activeId).toBe(last.carts[1].id);
    });

    it('closing another cart keeps the one in use', () => {
      const s = open(3);
      const next = removeCart(s, s.carts[0].id);
      expect(next.activeId).toBe(s.activeId);
      expect(next.carts).toHaveLength(2);
    });

    it('closing the only cart empties it back to "Giỏ 1", keeping the outlet', () => {
      let s = initialState();
      s = patchCart(s, s.activeId, { outletId: 3, customer: customer('Lan'), lines: withLines(), pickup: '2026-10-27', ret: '2026-10-30' });
      const next = removeCart(s, s.activeId);
      expect(next.carts).toHaveLength(1);
      expect(hasDraftContent(activeOf(next))).toBe(false);
      expect(activeOf(next).number).toBe(1);
      expect(activeOf(next).pickup).toBe('');
      expect(activeOf(next).outletId).toBe(3);
    });

    it('an unknown id changes nothing', () => {
      const s = open(2);
      expect(removeCart(s, 'nope')).toBe(s);
    });
  });

  describe('names and avatars', () => {
    it('is the customer name, else "Giỏ k"', () => {
      const c = blankCart(4);
      expect(cartTitle(c, title)).toBe('Giỏ 4');
      expect(cartTitle({ ...c, customer: customer('Chị Lan') }, title)).toBe('Chị Lan');
      expect(cartTitle({ ...c, customer: customer('   ') }, title)).toBe('Giỏ 4');
    });

    it('avatar: first letters of the first and last word, the number without a customer', () => {
      const c = blankCart(3);
      expect(avatarText(c)).toBe('3');
      expect(avatarText({ ...c, customer: customer('Chị Lan') })).toBe('CL');
      expect(avatarText({ ...c, customer: customer('Nguyễn Thị Minh Anh') })).toBe('NA');
      expect(avatarText({ ...c, customer: customer('anh nam') })).toBe('AN');
      expect(avatarText({ ...c, customer: customer('Lan') })).toBe('L');
      expect(avatarText({ ...c, customer: customer('  Đào   Hà ') })).toBe('ĐH');
    });

    it('grey without a customer, the palette by cart number with one', () => {
      expect(avatarColor(blankCart(2))).toBe('#94A3B8');
      expect(avatarColor({ ...blankCart(1), customer: customer('A B') })).toBe('#1D4ED8');
      expect(avatarColor({ ...blankCart(2), customer: customer('A B') })).toBe('#7C3AED');
      expect(avatarColor({ ...blankCart(5), customer: customer('A B') })).toBe('#1D4ED8');
    });
  });

  describe('tab summary', () => {
    it('counts units and prices the cart with its own discount', () => {
      const c = { ...blankCart(), lines: withLines(2), pickup: '2026-10-27', ret: '2026-10-29' };
      expect(itemCountOf(c)).toBe(2);
      expect(cartTotal(c)).toBe(100_000);
      expect(cartTotal({ ...c, discountType: 'percentage', discountValue: 10 })).toBe(90_000);
      expect(cartTotal({ ...c, discountValue: 30_000 })).toBe(70_000);
      expect(cartTotal(blankCart())).toBe(0);
    });
  });

  describe('saved copy', () => {
    it('keys per user, like the apps', () => {
      expect(storageKey(42)).toBe('anyrent.draftCarts.42');
    });

    it('one empty cart is not saved', () => {
      expect(serialize(initialState())).toBeNull();
      expect(serialize(patchCart(initialState(), initialState().activeId, {}))).toBeNull();
    });

    it('one cart with something in it is saved; so are several empty ones', () => {
      let s = initialState();
      s = patchCart(s, s.activeId, { customer: customer('Lan') });
      expect(serialize(s)).not.toBeNull();
      expect(serialize(open(2))).not.toBeNull();
    });

    it('days alone are not worth saving', () => {
      let s = initialState();
      s = patchCart(s, s.activeId, { pickup: '2026-10-27', ret: '2026-10-28' });
      expect(serialize(s)).toBeNull();
    });

    it('restores the carts, the one in use and the numbers; photos are not kept', () => {
      let s = initialState();
      const first = s.activeId;
      const file = new File(['x'], 'a.jpg');
      s = patchCart(s, first, { customer: customer('Chị Lan'), lines: withLines(2), photos: [file], pickup: '2026-10-27', ret: '2026-10-30', discountType: 'percentage', discountValue: 5, notes: 'n', notesOpen: true, outletId: 9 });
      s = addCart(s);
      s = addCart(s);
      s = switchCart(s, first);
      const text = serialize(s) as string;
      expect(text).not.toContain('a.jpg');
      const back = restore(text) as CartsState;
      expect(back.carts).toHaveLength(3);
      expect(back.activeId).toBe(first);
      expect(back.carts.map((c) => c.number)).toEqual([1, 2, 3]);
      const c = activeOf(back);
      expect(c.customer?.name).toBe('Chị Lan');
      expect(c.lines[0].quantity).toBe(2);
      expect(c.photos).toEqual([]);
      expect([c.pickup, c.ret, c.discountType, c.discountValue, c.notes, c.notesOpen, c.outletId]).toEqual(['2026-10-27', '2026-10-30', 'percentage', 5, 'n', true, 9]);
      expect(cartTotal(c)).toBe(cartTotal(activeOf(s)));
    });

    it('unreadable or empty text gives nothing', () => {
      expect(restore(null)).toBeNull();
      expect(restore('')).toBeNull();
      expect(restore('{not json')).toBeNull();
      expect(restore('{"carts":[]}')).toBeNull();
      expect(restore('{"carts":"x"}')).toBeNull();
      expect(restore('{"carts":[null,3]}')).toBeNull();
    });

    it('repairs what it can: unknown active id, duplicate numbers, junk lines, more than 10 carts', () => {
      const raw = { activeId: 'gone', carts: Array.from({ length: 12 }, (_, i) => ({ id: `k${i}`, number: 1, lines: [{ productId: 0 }, null, ...withLines()], customer: { id: 0 } })) };
      const back = restore(JSON.stringify(raw)) as CartsState;
      expect(back.carts).toHaveLength(10);
      expect(back.activeId).toBe('k0');
      expect(new Set(back.carts.map((c) => c.number)).size).toBe(10);
      expect(back.carts[0].lines).toHaveLength(1);
      expect(back.carts[0].customer).toBeNull();
    });
  });
});
