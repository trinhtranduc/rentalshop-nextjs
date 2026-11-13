/**
 * #1515 "Đặt lại" on Chi tiết đơn (web): the cart starts from an old order. Customer, order type, notes, each line's
 * quantity and note come from the order; the price is the product's price today; dates, discount, deposit, collateral,
 * payments are not copied. No database here. Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it, jest } from '@jest/globals';

// The @rentalshop/utils barrel pulls in React files; the model only needs the pure pricing modules
jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/order-line-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/rental-days') as object),
  ...(jest.requireActual('../packages/utils/src/core/block-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/block-line-text') as object),
}));
import { reorderLines, reorderStart } from '../apps/client/app/orders/create/reorder-model';
import type { OrderLike, ProductLike } from '../apps/client/app/orders/create/create-model';

const vnKey = (v: string | Date) => new Date(new Date(v).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);

// Váy A cost 200.000 on the old order and 250.000 today; Áo B 80.000 both times
const vayA: ProductLike = { id: 11, name: 'Váy A', rentPrice: 250000, salePrice: 900000, deposit: 300000, pricingType: 'FIXED', pricingOptions: [] };
const aoB: ProductLike = { id: 12, name: 'Áo B', rentPrice: 80000, salePrice: 300000, deposit: 0, pricingType: 'FIXED', pricingOptions: [] };

const rentOrder: OrderLike = {
  id: 501,
  orderNumber: '482913',
  orderType: 'RENT',
  status: 'RETURNED',
  customerId: 7,
  customer: { id: 7, firstName: 'An', lastName: 'Nguyễn', phone: '0901234567' },
  outletId: 3,
  pickupPlanAt: '2026-10-10T02:00:00.000Z',
  returnPlanAt: '2026-10-12T16:59:59.000Z',
  discountType: 'amount',
  discountValue: 50000,
  depositAmount: 300000,
  securityDeposit: 500000,
  notes: 'Giao trước 8h',
  orderItems: [
    { productId: 11, productName: 'Váy A', quantity: 1, unitPrice: 200000, notes: 'Đã sửa gấu', pricingType: 'FIXED', product: { id: 11 } },
    { productId: 12, productName: 'Áo B', quantity: 2, unitPrice: 80000, notes: '', pricingType: 'FIXED', product: { id: 12 } },
  ],
};

describe('reorderStart (what the order gives the new cart)', () => {
  it('Case 1: type, customer, notes and each line (product, quantity, note); nothing else', () => {
    const s = reorderStart(rentOrder, vnKey);
    expect(s).toEqual({
      orderType: 'RENT',
      customer: { id: 7, name: 'An Nguyễn', phone: '0901234567' },
      notes: 'Giao trước 8h',
      outletId: 3, // the branch of the old order: an owner sees every branch on the web
      items: [
        { productId: 11, quantity: 1, notes: 'Đã sửa gấu' },
        { productId: 12, quantity: 2, notes: '' },
      ],
      unreadable: 0,
    });
    // dates, discount, deposit, collateral, order id are not in the result at all
    expect(Object.keys(s).sort()).toEqual(['customer', 'items', 'notes', 'orderType', 'outletId', 'unreadable']);
  });

  it('Case 2: a sale order to a walk-in keeps its type and has no customer', () => {
    const s = reorderStart({ orderType: 'SALE', status: 'COMPLETED', customerId: null, customer: null, orderItems: [{ productId: 12, quantity: 3 }] }, vnKey);
    expect(s).toMatchObject({ orderType: 'SALE', customer: null, notes: '', items: [{ productId: 12, quantity: 3, notes: '' }], unreadable: 0 });
  });

  it('Case 5: a cancelled order starts a cart like any other', () => {
    expect(reorderStart({ ...rentOrder, status: 'CANCELLED' }, vnKey).items).toHaveLength(2);
  });

  it('a line without a product id (product gone) is counted, not carried', () => {
    const s = reorderStart({ ...rentOrder, orderItems: [{ productId: null, productName: 'Váy cũ', quantity: 1 }, { productId: 12, quantity: 2 }] }, vnKey);
    expect(s.items).toEqual([{ productId: 12, quantity: 2, notes: '' }]);
    expect(s.unreadable).toBe(1);
  });

  it('one product on two lines (one paid, one free, #951) stays two lines', () => {
    const s = reorderStart({ ...rentOrder, orderItems: [{ productId: 11, quantity: 1, unitPrice: 200000 }, { productId: 11, quantity: 1, unitPrice: 0, notes: 'tặng' }] }, vnKey);
    expect(s.items).toEqual([{ productId: 11, quantity: 1, notes: '' }, { productId: 11, quantity: 1, notes: 'tặng' }]);
  });
});

describe('reorderLines (the cart lines, priced today)', () => {
  const items = reorderStart(rentOrder, vnKey).items;

  it('Case 1: lines take the price of today, the old quantity and note; each line has its own key', () => {
    const { lines, skipped } = reorderLines(items, [vayA, aoB], 'RENT');
    expect(skipped).toBe(0);
    expect(lines.map((l) => [l.productId, l.quantity, l.unitPrice, l.notes])).toEqual([
      [11, 1, 250000, 'Đã sửa gấu'],
      [12, 2, 80000, ''],
    ]);
    expect(new Set(lines.map((l) => l.key)).size).toBe(2);
  });

  it('Case 2: a sale cart is priced with the sale price', () => {
    const { lines } = reorderLines([{ productId: 12, quantity: 3, notes: '' }], [aoB], 'SALE');
    expect(lines.map((l) => [l.quantity, l.unitPrice])).toEqual([[3, 300000]]);
  });

  it('Case 3: a product that did not load is skipped and counted; the others stay', () => {
    const { lines, skipped } = reorderLines(items, [null, aoB], 'RENT');
    expect(lines.map((l) => l.productId)).toEqual([12]);
    expect(skipped).toBe(1);
  });

  it('Case 4: nothing loaded gives no lines and counts every item', () => {
    const { lines, skipped } = reorderLines(items, [undefined, null], 'RENT');
    expect(lines).toEqual([]);
    expect(skipped).toBe(2);
  });

  it('a quantity below 1 becomes 1, never an empty line', () => {
    const { lines } = reorderLines([{ productId: 12, quantity: 0, notes: '' }], [aoB], 'RENT');
    expect(lines.map((l) => l.quantity)).toEqual([1]);
  });

  it('one product on two lines keeps both lines with their own notes', () => {
    const two = [{ productId: 11, quantity: 1, notes: '' }, { productId: 11, quantity: 1, notes: 'tặng' }];
    const { lines } = reorderLines(two, [vayA, vayA], 'RENT');
    expect(lines.map((l) => [l.productId, l.notes])).toEqual([[11, ''], [11, 'tặng']]);
    expect(lines[0].key).not.toBe(lines[1].key);
  });
});

describe('reorderStart keeps the branch of the order', () => {
  it('Case 10: outletId comes from outletId or outlet.id; an order without a branch gives null', () => {
    expect(reorderStart({ ...rentOrder, outletId: undefined, outlet: { id: 9 } }, vnKey).outletId).toBe(9);
    expect(reorderStart({ ...rentOrder, outletId: undefined, outlet: undefined }, vnKey).outletId).toBeNull();
  });
});
