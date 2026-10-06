/**
 * #523 shop web Tạo đơn / Sửa đơn: cart lines, money, stock label, days and the saved payload.
 * Day logic must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it, jest } from '@jest/globals';

// The @rentalshop/utils barrel pulls in React files; the model only needs the pure pricing modules
jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/order-line-pricing') as object),
  ...(jest.requireActual('../packages/utils/src/core/rental-days') as object),
}));
import {
  addProduct,
  buildPayload,
  canEditOrder,
  cardPrices,
  checkDays,
  chooseOption,
  chunk,
  computeTotals,
  dayRangeIso,
  dayStartIso,
  draftFromOrder,
  findByBarcode,
  firstMissing,
  hydrateLines,
  imagesOf,
  lineFromProduct,
  quickDays,
  rentalDays,
  repriceLines,
  setQuantity,
  stockOf,
  type ProductLike,
} from '../apps/client/app/orders/create/create-model';
import { convertLocalDateToUTCDatetime, getLocalDateKey } from '../packages/utils/src/core/date';

const AO_DAI: ProductLike = {
  id: 11,
  name: 'Áo dài đỏ',
  barcode: 'AD001',
  images: ['https://img/ad.jpg'],
  rentPrice: 250_000,
  salePrice: 900_000,
  deposit: 100_000,
  pricingType: 'DAILY',
  pricingOptions: [
    { id: 1, type: 'FIXED', price: 250_000, isDefault: false },
    { id: 2, type: 'DAILY', price: 150_000, isDefault: true },
  ],
};
const VEST: ProductLike = { id: 12, name: 'Vest đen', rentPrice: 300_000, salePrice: null, deposit: 0, pricingOptions: [] };

describe('lines', () => {
  it('starts a rent line on the default option and a sale line on the sale price', () => {
    const rent = lineFromProduct(AO_DAI, 'RENT');
    expect(rent).toMatchObject({ unitPrice: 150_000, pricingType: 'DAILY', selectedPricingOptionId: 2, quantity: 1, deposit: 100_000, image: 'https://img/ad.jpg' });
    const sale = lineFromProduct(AO_DAI, 'SALE');
    expect(sale).toMatchObject({ unitPrice: 900_000, pricingType: 'FIXED', selectedPricingOptionId: null });
    expect(lineFromProduct(VEST, 'SALE').unitPrice).toBe(300_000);
  });

  it('adds, counts up, sets and removes', () => {
    let lines = addProduct([], AO_DAI, 'RENT');
    lines = addProduct(lines, AO_DAI, 'RENT');
    lines = addProduct(lines, VEST, 'RENT');
    expect(lines.map((l) => [l.productId, l.quantity])).toEqual([[11, 2], [12, 1]]);
    lines = setQuantity(lines, 12, 0);
    expect(lines).toHaveLength(1);
    expect(setQuantity(lines, 11, 3)[0].quantity).toBe(3);
  });

  it('switches option and reprices on Thuê ↔ Bán', () => {
    let lines = chooseOption([lineFromProduct(AO_DAI, 'RENT')], 11, 1);
    expect(lines[0]).toMatchObject({ unitPrice: 250_000, pricingType: 'FIXED', selectedPricingOptionId: 1 });
    lines = repriceLines(lines, 'SALE');
    expect(lines[0].unitPrice).toBe(900_000);
    lines = repriceLines(lines, 'RENT');
    expect(lines[0]).toMatchObject({ unitPrice: 250_000, pricingType: 'FIXED' });
    // A line added while selling takes the default rent option when switched to rent
    const fromSale = repriceLines([lineFromProduct(AO_DAI, 'SALE')], 'RENT');
    expect(fromSale[0]).toMatchObject({ unitPrice: 150_000, pricingType: 'DAILY', selectedPricingOptionId: 2 });
  });

  it('hydrates options of saved items without repricing them', () => {
    const draft = draftFromOrder(
      { orderType: 'RENT', orderItems: [{ productId: 11, product: { id: 11, name: 'Áo dài đỏ' }, quantity: 1, unitPrice: 140_000, pricingType: 'DAILY' }] },
      getLocalDateKey,
    );
    const lines = hydrateLines(draft.lines, [AO_DAI]);
    expect(lines[0]).toMatchObject({ unitPrice: 140_000, pricingType: 'DAILY', selectedPricingOptionId: 2 });
    expect(lines[0].product.pricingOptions).toHaveLength(2);
    expect(hydrateLines(lines, [AO_DAI])).toBe(lines);
  });

  it('reads card prices and images', () => {
    expect(cardPrices(AO_DAI, 'RENT')).toEqual([{ type: 'DAILY', price: 150_000 }, { type: 'FIXED', price: 250_000 }]);
    expect(cardPrices(VEST, 'RENT')).toEqual([{ type: 'FIXED', price: 300_000 }]);
    expect(cardPrices(AO_DAI, 'SALE')).toEqual([{ type: 'SALE', price: 900_000 }]);
    expect(imagesOf('["a","b"]')).toEqual(['a', 'b']);
    expect(imagesOf('a, b')).toEqual(['a', 'b']);
    expect(imagesOf(null)).toEqual([]);
  });
});

describe('days', () => {
  it('counts both ends and builds the Vietnam day range', () => {
    expect(rentalDays('2026-10-07', '2026-10-09')).toBe(3);
    expect(rentalDays('2026-10-07', '2026-10-07')).toBe(1);
    expect(rentalDays('', '2026-10-07')).toBe(0);
    expect(dayStartIso('2026-10-07')).toBe('2026-10-06T17:00:00.000Z');
    expect(dayStartIso('2026-10-07')).toBe(convertLocalDateToUTCDatetime('2026-10-07'));
    expect(dayRangeIso('2026-10-07', '2026-10-09')).toEqual({ startDate: '2026-10-06T17:00:00.000Z', endDate: '2026-10-09T16:59:59.999Z' });
  });

  it('checks the chosen days', () => {
    expect(checkDays('', '', 365)).toBe('missing');
    expect(checkDays('2026-10-09', '2026-10-07', 365)).toBe('reversed');
    expect(checkDays('2026-10-07', '2026-10-07', 365)).toBeNull();
    expect(checkDays('2026-01-01', '2027-01-01', 365)).toBe('tooLong');
  });

  it('offers quick picks from today', () => {
    // 2026-10-07 is a Wednesday
    expect(quickDays('2026-10-07')).toEqual({
      today: { from: '2026-10-07', to: '2026-10-07' },
      tomorrow: { from: '2026-10-08', to: '2026-10-08' },
      weekend: { from: '2026-10-10', to: '2026-10-11' },
      threeDays: { from: '2026-10-07', to: '2026-10-09' },
    });
    expect(quickDays('2026-10-11').weekend).toEqual({ from: '2026-10-11', to: '2026-10-11' }); // Sunday
  });
});

describe('stock', () => {
  it('reads the order outlet, else the totals', () => {
    const r = {
      productId: 11,
      totalStock: 5,
      totalAvailableStock: 2,
      availabilityByOutlet: [
        { outletId: 1, stock: 3, effectivelyAvailable: 1 },
        { outletId: 2, stock: 2, effectivelyAvailable: 1 },
      ],
    };
    expect(stockOf(r, 1)).toEqual({ free: 1, total: 3 });
    expect(stockOf(r, 9)).toEqual({ free: 2, total: 5 });
    expect(stockOf({ ...r, availabilityByOutlet: [{ outletId: 4, stock: 3, effectivelyAvailable: -1 }] }, null)).toEqual({ free: 0, total: 3 });
    expect(stockOf({ productId: 1, error: 'x' }, 1)).toBeNull();
    expect(stockOf(undefined, 1)).toBeNull();
  });

  it('chunks requests and finds a barcode', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(findByBarcode([AO_DAI, VEST], ' ad001 ')?.id).toBe(11);
    expect(findByBarcode([AO_DAI, VEST], 'AD')).toBeNull();
  });
});

describe('money', () => {
  const lines = [{ ...lineFromProduct(AO_DAI, 'RENT'), quantity: 2 }, lineFromProduct(VEST, 'RENT')];

  it('totals a rental: per-day lines × days, discount, cọc and còn thu', () => {
    const t = computeTotals({ lines, orderType: 'RENT', days: 3, discountType: 'amount', discountValue: 100_000, depositAmount: null, securityDeposit: 1_000_000 });
    // 150k × 2 × 3 days + 300k fixed
    expect(t.subtotal).toBe(1_200_000);
    expect(t.discountAmount).toBe(100_000);
    expect(t.totalAmount).toBe(1_100_000);
    expect(t.autoDeposit).toBe(200_000);
    expect(t.depositAmount).toBe(200_000);
    // total − cọc + thế chân, same as the order page
    expect(t.dueAtPickup).toBe(1_900_000);
  });

  it('caps the discount and keeps a typed cọc', () => {
    const pct = computeTotals({ lines, orderType: 'RENT', days: 1, discountType: 'percentage', discountValue: 150, depositAmount: 50_000, securityDeposit: 0 });
    expect(pct.totalAmount).toBe(0);
    expect(pct.depositAmount).toBe(50_000);
    expect(pct.dueAtPickup).toBe(0);
    const amt = computeTotals({ lines, orderType: 'RENT', days: 1, discountType: 'amount', discountValue: 9_999_999, depositAmount: 0, securityDeposit: 0 });
    expect(amt.discountAmount).toBe(amt.subtotal);
  });

  it('holds no cọc or thế chân on a sale and takes loyalty off', () => {
    const t = computeTotals({ lines: repriceLines(lines, 'SALE'), orderType: 'SALE', days: 0, discountType: 'amount', discountValue: 0, depositAmount: 500, securityDeposit: 500, loyaltyDiscount: 100_000 });
    expect(t.subtotal).toBe(2_100_000);
    expect(t.depositAmount).toBe(0);
    expect(t.securityDeposit).toBe(0);
    expect(t.dueAtPickup).toBe(2_000_000);
  });
});

describe('submit', () => {
  const base = {
    orderType: 'RENT' as const,
    customerId: 7,
    outletId: 1,
    pickup: '2026-10-07',
    ret: '2026-10-09',
    lines: [{ ...lineFromProduct(AO_DAI, 'RENT'), quantity: 2 }, lineFromProduct(VEST, 'RENT')],
    discountType: 'amount' as const,
    discountValue: 0,
    depositAmount: null,
    securityDeposit: 1_000_000,
    notes: 'Giao sáng',
  };

  it('names the first missing thing', () => {
    expect(firstMissing({ ...base, pickup: '', customerId: null })).toBe('days');
    expect(firstMissing({ ...base, lines: [], customerId: null })).toBe('items');
    expect(firstMissing({ ...base, customerId: null })).toBe('customer');
    expect(firstMissing({ ...base, outletId: null })).toBe('outlet');
    expect(firstMissing({ ...base, orderType: 'SALE', pickup: '', ret: '' })).toBeNull();
  });

  it('builds the create payload', () => {
    const p = buildPayload({ ...base, mode: 'create', loyaltyPoints: 20 });
    expect(p).toMatchObject({
      orderType: 'RENT',
      customerId: 7,
      outletId: 1,
      pickupPlanAt: '2026-10-06T17:00:00.000Z',
      returnPlanAt: '2026-10-08T17:00:00.000Z',
      subtotal: 1_200_000,
      taxAmount: 0,
      discountAmount: 0,
      depositAmount: 200_000,
      securityDeposit: 1_000_000,
      totalAmount: 1_200_000,
      notes: 'Giao sáng',
      loyaltyRedeem: { points: 20 },
    });
    expect(p.orderItems).toEqual([
      // POST divides deposit by quantity → 100k per unit saved
      { productId: 11, quantity: 2, unitPrice: 150_000, totalPrice: 900_000, deposit: 200_000, notes: '', rentDays: 3, pricingType: 'DAILY', pricingOptionId: 2 },
      { productId: 12, quantity: 1, unitPrice: 300_000, totalPrice: 300_000, deposit: 0, notes: '', rentDays: 1, pricingType: 'FIXED' },
    ]);
  });

  it('builds the edit payload: per-unit deposit, no loyalty', () => {
    const p = buildPayload({ ...base, mode: 'edit', loyaltyPoints: 20 });
    expect(p.orderItems[0].deposit).toBe(100_000);
    expect('loyaltyRedeem' in p).toBe(false);
  });

  it('sends no days on a sale', () => {
    const p = buildPayload({ ...base, orderType: 'SALE', lines: repriceLines(base.lines, 'SALE'), mode: 'create' });
    expect(p.pickupPlanAt).toBeUndefined();
    expect(p.depositAmount).toBe(0);
    expect(p.orderItems[0]).toMatchObject({ unitPrice: 900_000, totalPrice: 1_800_000, pricingType: 'FIXED', rentDays: 1 });
    expect('pricingOptionId' in p.orderItems[0]).toBe(false);
  });
});

describe('edit', () => {
  it('loads an order into the editor on Vietnam days', () => {
    const d = draftFromOrder(
      {
        orderType: 'RENT',
        status: 'RESERVED',
        customer: { id: 7, firstName: 'Bùi', lastName: 'Thanh Tâm', phone: '0903456789' },
        outlet: { id: 3 },
        pickupPlanAt: '2026-10-06T17:00:00.000Z',
        returnPlanAt: '2026-10-08T17:00:00.000Z',
        discountType: 'percentage',
        discountValue: 10,
        depositAmount: 300_000,
        securityDeposit: 0,
        notes: 'x',
        orderItems: [{ productId: 11, productName: 'Áo dài đỏ', quantity: 1, unitPrice: 150_000, deposit: 100_000, pricingType: 'DAILY', pricingOptionId: 2 }],
      },
      getLocalDateKey,
    );
    expect(d).toMatchObject({
      orderType: 'RENT',
      pickup: '2026-10-07',
      ret: '2026-10-09',
      customer: { id: 7, name: 'Bùi Thanh Tâm', phone: '0903456789' },
      outletId: 3,
      discountType: 'percentage',
      discountValue: 10,
      depositAmount: 300_000,
    });
    expect(d.lines[0]).toMatchObject({ productId: 11, name: 'Áo dài đỏ', unitPrice: 150_000, selectedPricingOptionId: 2 });
  });

  it('allows a reserved rental or a completed sale', () => {
    expect(canEditOrder({ orderType: 'RENT', status: 'RESERVED' })).toBe(true);
    expect(canEditOrder({ orderType: 'RENT', status: 'PICKUPED' })).toBe(false);
    expect(canEditOrder({ orderType: 'SALE', status: 'COMPLETED' })).toBe(true);
    expect(canEditOrder({ orderType: 'SALE', status: 'CANCELLED' })).toBe(false);
  });
});
