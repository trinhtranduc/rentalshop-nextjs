/**
 * #523 shop web Tạo đơn / Sửa đơn: cart lines, money, stock label, days and the saved payload.
 * Day logic must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
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
  pickOutlet,
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
  discountExceeds,
  draftFromOrder,
  findByBarcode,
  firstMissing,
  hydrateLines,
  imagesOf,
  lineFromProduct,
  lineModes,
  lineTotal,
  needsPrice,
  productQuantity,
  selectMode,
  setLinePrice,
  setLineNote,
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

  it('adds, sets and removes (#952: every add is a new line)', () => {
    let lines = addProduct([], AO_DAI, 'RENT');
    lines = addProduct(lines, AO_DAI, 'RENT');
    lines = addProduct(lines, VEST, 'RENT');
    expect(lines.map((l) => [l.productId, l.quantity])).toEqual([[11, 1], [11, 1], [12, 1]]);
    lines = setQuantity(lines, 12, 0);
    expect(lines).toHaveLength(2);
    expect(setQuantity(lines, lines[0].key, 3).map((l) => l.quantity)).toEqual([3, 1]);
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

  it('#684 a line note is trimmed, sent as orderItems[].notes, and blank clears it', () => {
    const lines = setLineNote(base.lines, AO_DAI.id, '  Sửa eo 2cm  ');
    expect(lines[0].notes).toBe('Sửa eo 2cm');
    expect(lines[1].notes).toBe(base.lines[1].notes);
    const p = buildPayload({ ...base, lines, mode: 'create' }) as { orderItems: { notes: string }[] };
    expect(p.orderItems[0].notes).toBe('Sửa eo 2cm');
    expect(setLineNote(lines, AO_DAI.id, '   ')[0].notes).toBe('');
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

  // #589 (WEB-3): Sửa đơn must not rewrite a pickup / return time when its Vietnam day did not change
  describe('edit keeps the saved instants of unchanged days', () => {
    const edit = (original: { pickupPlanAt?: string | null; returnPlanAt?: string | null }, days: { pickup?: string; ret?: string } = {}) =>
      buildPayload({ ...base, ...days, mode: 'edit', original });

    it('keeps 09:30 / 17:00 Vietnam when both days are the same', () => {
      // 2026-10-07 09:30 VN, 2026-10-09 17:00 VN
      const p = edit({ pickupPlanAt: '2026-10-07T02:30:00.000Z', returnPlanAt: '2026-10-09T10:00:00.000Z' });
      expect([p.pickupPlanAt, p.returnPlanAt]).toEqual(['2026-10-07T02:30:00.000Z', '2026-10-09T10:00:00.000Z']);
    });

    it('a moved day saves 00:00 Vietnam of the new day; the other keeps its time', () => {
      const p = edit({ pickupPlanAt: '2026-10-07T02:30:00.000Z', returnPlanAt: '2026-10-09T10:00:00.000Z' }, { ret: '2026-10-10' });
      expect([p.pickupPlanAt, p.returnPlanAt]).toEqual(['2026-10-07T02:30:00.000Z', '2026-10-09T17:00:00.000Z']);
    });

    it('16:59:59Z is the last second of the Vietnam day, 17:00:00Z the first of the next', () => {
      // 2026-10-06T16:59:59Z = 23:59:59 VN on 06/10 → not the 07/10 pickup day
      expect(edit({ pickupPlanAt: '2026-10-06T16:59:59.000Z' }).pickupPlanAt).toBe('2026-10-06T17:00:00.000Z');
      expect(edit({ pickupPlanAt: '2026-10-06T16:59:59.000Z' }, { pickup: '2026-10-06' }).pickupPlanAt).toBe('2026-10-06T16:59:59.000Z');
      // 2026-10-06T17:00:00Z = 00:00 VN on 07/10; 2026-10-07T16:59:59Z = 23:59:59 VN on 07/10
      expect(edit({ pickupPlanAt: '2026-10-06T17:00:00.000Z' }).pickupPlanAt).toBe('2026-10-06T17:00:00.000Z');
      expect(edit({ pickupPlanAt: '2026-10-07T16:59:59.000Z' }).pickupPlanAt).toBe('2026-10-07T16:59:59.000Z');
      expect(edit({ returnPlanAt: '2026-10-09T17:00:00.000Z' }).returnPlanAt).toBe('2026-10-08T17:00:00.000Z');
    });

    it('month and year ends', () => {
      const p = buildPayload({
        ...base,
        mode: 'edit',
        pickup: '2026-12-31',
        ret: '2027-01-01',
        original: { pickupPlanAt: '2026-12-31T16:59:59.000Z', returnPlanAt: '2026-12-31T17:00:00.000Z' },
      });
      expect([p.pickupPlanAt, p.returnPlanAt]).toEqual(['2026-12-31T16:59:59.000Z', '2026-12-31T17:00:00.000Z']);
    });

    it('accepts a Date, ignores a bad value, and create never uses it', () => {
      expect(buildPayload({ ...base, mode: 'edit', original: { pickupPlanAt: new Date('2026-10-07T02:30:00Z') } }).pickupPlanAt).toBe(
        '2026-10-07T02:30:00.000Z',
      );
      expect(edit({ pickupPlanAt: 'not a date' }).pickupPlanAt).toBe('2026-10-06T17:00:00.000Z');
      const created = buildPayload({ ...base, mode: 'create', original: { pickupPlanAt: '2026-10-07T02:30:00.000Z' } });
      expect(created.pickupPlanAt).toBe('2026-10-06T17:00:00.000Z');
    });

    it('a sale has no plan days', () => {
      const p = buildPayload({ ...base, orderType: 'SALE', mode: 'edit', original: { pickupPlanAt: '2026-10-07T02:30:00.000Z' } });
      expect([p.pickupPlanAt, p.returnPlanAt]).toEqual([undefined, undefined]);
    });
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

// #556: Theo lần / Theo ngày and a price for this order on every rent line (iOS CartItem.selectPricingType)
describe('pricing mode and price for this order', () => {
  it('offers Theo lần and Theo ngày on every rent line, then other option types', () => {
    expect(lineModes(lineFromProduct(VEST, 'RENT'))).toEqual(['FIXED', 'DAILY']);
    const hourly = { ...AO_DAI, pricingOptions: [...(AO_DAI.pricingOptions || []), { id: 3, type: 'HOURLY', price: 50_000 }] };
    expect(lineModes(lineFromProduct(hourly, 'RENT'))).toEqual(['FIXED', 'DAILY', 'HOURLY']);
  });

  it('switches to the option price, or 0 for a mode the product has no price for', () => {
    let lines = selectMode([lineFromProduct(AO_DAI, 'RENT')], 11, 'FIXED');
    expect(lines[0]).toMatchObject({ pricingType: 'FIXED', unitPrice: 250_000, selectedPricingOptionId: 1 });
    // Vest has a rent price only (FIXED, no option): Theo ngày starts empty and needs a price
    lines = selectMode([lineFromProduct(VEST, 'RENT')], 12, 'DAILY');
    expect(lines[0]).toMatchObject({ pricingType: 'DAILY', unitPrice: 0, selectedPricingOptionId: null });
    expect(needsPrice(lines[0], 'RENT')).toBe(true);
    expect(needsPrice(lines[0], 'SALE')).toBe(false);
    // Back to Theo lần keeps the price it had (iOS legacy option)
    expect(selectMode(lines, 12, 'FIXED')[0]).toMatchObject({ pricingType: 'FIXED', unitPrice: 300_000 });
  });

  it('keeps a typed price per mode, independently', () => {
    let lines = setLinePrice([lineFromProduct(AO_DAI, 'RENT')], 11, 120_000); // DAILY
    expect(lines[0]).toMatchObject({ pricingType: 'DAILY', unitPrice: 120_000, selectedPricingOptionId: 2 });
    lines = selectMode(lines, 11, 'FIXED');
    expect(lines[0].unitPrice).toBe(250_000);
    lines = setLinePrice(lines, 11, 200_000);
    lines = selectMode(lines, 11, 'DAILY');
    expect(lines[0].unitPrice).toBe(120_000);
    lines = selectMode(lines, 11, 'FIXED');
    expect(lines[0].unitPrice).toBe(200_000);
    // The product's own prices never change
    expect(lines[0].product.pricingOptions.map((o) => o.price)).toEqual([250_000, 150_000]);
    expect(setLinePrice(lines, 11, -5)[0].unitPrice).toBe(0);
  });

  it('totals qty × price, × days only for Theo ngày', () => {
    let lines = setQuantity(setLinePrice([lineFromProduct(AO_DAI, 'RENT')], 11, 100_000), 11, 2);
    expect(lineTotal(lines[0], 'RENT', 3)).toBe(600_000);
    lines = setLinePrice(selectMode(lines, 11, 'FIXED'), 11, 180_000);
    expect(lineTotal(lines[0], 'RENT', 3)).toBe(360_000);
  });

  it('keeps a typed rent price through Thuê → Bán → Thuê', () => {
    let lines = setLinePrice([lineFromProduct(AO_DAI, 'RENT')], 11, 99_000);
    lines = repriceLines(lines, 'SALE');
    expect(lines[0].unitPrice).toBe(900_000);
    lines = repriceLines(lines, 'RENT');
    expect(lines[0]).toMatchObject({ pricingType: 'DAILY', unitPrice: 99_000 });
  });

  it('keeps a saved order price when switching mode and back', () => {
    const draft = draftFromOrder(
      { orderType: 'RENT', orderItems: [{ productId: 11, product: { id: 11, name: 'Áo dài đỏ' }, quantity: 1, unitPrice: 140_000, pricingType: 'DAILY' }] },
      getLocalDateKey,
    );
    let lines = hydrateLines(draft.lines, [AO_DAI]);
    lines = selectMode(selectMode(lines, 11, 'FIXED'), 11, 'DAILY');
    expect(lines[0].unitPrice).toBe(140_000);
  });

  it('blocks create while a rent line has no price', () => {
    const lines = selectMode([lineFromProduct(VEST, 'RENT')], 12, 'DAILY');
    const base = { orderType: 'RENT' as const, pickup: '2026-10-07', ret: '2026-10-09', customerId: 5, outletId: 1 };
    expect(firstMissing({ ...base, lines })).toBe('price');
    expect(firstMissing({ ...base, lines: setLinePrice(lines, 12, 80_000) })).toBeNull();
  });

  it('sends the mode, and the option id only when the product has that mode', () => {
    const base = {
      mode: 'create' as const,
      orderType: 'RENT' as const,
      customerId: 5,
      outletId: 1,
      pickup: '2026-10-07',
      ret: '2026-10-09',
      discountType: 'amount' as const,
      discountValue: 0,
      depositAmount: null,
      securityDeposit: 0,
      notes: '',
    };
    const daily = setLinePrice(selectMode([lineFromProduct(VEST, 'RENT')], 12, 'DAILY'), 12, 80_000);
    const item = buildPayload({ ...base, lines: daily }).orderItems[0];
    expect(item).toMatchObject({ pricingType: 'DAILY', unitPrice: 80_000, totalPrice: 240_000, rentDays: 3 });
    expect(item).not.toHaveProperty('pricingOptionId');
    const fixed = setLinePrice(selectMode([lineFromProduct(AO_DAI, 'RENT')], 11, 'FIXED'), 11, 200_000);
    expect(buildPayload({ ...base, lines: fixed }).orderItems[0]).toMatchObject({ pricingType: 'FIXED', unitPrice: 200_000, totalPrice: 200_000, pricingOptionId: 1 });
    // Another option type goes as FIXED without its id (the API takes FIXED, HOURLY, DAILY)
    const block = { ...AO_DAI, pricingOptions: [{ id: 9, type: 'BLOCK', price: 70_000, isDefault: true }] };
    const blockItem = buildPayload({ ...base, lines: [lineFromProduct(block, 'RENT')] }).orderItems[0];
    expect(blockItem).toMatchObject({ pricingType: 'FIXED', unitPrice: 70_000 });
    expect(blockItem).not.toHaveProperty('pricingOptionId');
  });
});

describe('outlet for a new order (owner: "phải có outlet mặc định")', () => {
  const list = [{ id: 3 }, { id: 1, isDefault: true }];
  it('keeps a valid choice, else the user outlet, else the default, else the first', () => {
    expect(pickOutlet(3, null, list)).toBe(3);
    expect(pickOutlet(null, 3, list)).toBe(3);
    expect(pickOutlet(null, null, list)).toBe(1);
    expect(pickOutlet(99, null, list)).toBe(1);
    expect(pickOutlet(null, null, [{ id: 7 }, { id: 8 }])).toBe(7);
    expect(pickOutlet(null, 5, [])).toBe(5);
  });
});

// #951: 0đ is a real price in the cart; only a missing price asks for one ("Nhập giá")
describe('0đ products and free lines (#951)', () => {
  const FREE: ProductLike = {
    id: 21,
    name: 'Túi quà',
    rentPrice: 0,
    salePrice: 0,
    deposit: 0,
    pricingType: 'FIXED',
    pricingOptions: [{ id: 7, type: 'FIXED', price: 0, isDefault: true }],
  };
  const NO_PRICE: ProductLike = { id: 22, name: 'Chưa có giá', rentPrice: 0, salePrice: null, deposit: 0, pricingOptions: [] };
  const base = { orderType: 'RENT' as const, pickup: '2026-10-07', ret: '2026-10-09', customerId: 5, outletId: 1 };

  it('a 0đ product goes in the cart at 0đ without asking for a price', () => {
    const line = lineFromProduct(FREE, 'RENT');
    expect(line).toMatchObject({ unitPrice: 0, pricingType: 'FIXED', selectedPricingOptionId: 7 });
    expect(needsPrice(line, 'RENT')).toBe(false);
    expect(lineTotal(line, 'RENT', 3)).toBe(0);
    expect(firstMissing({ ...base, lines: [line] })).toBeNull();
    expect(lineFromProduct(FREE, 'SALE').unitPrice).toBe(0);
  });

  it('a product priced 0 creates at 0đ without asking (#996)', () => {
    const line = lineFromProduct(NO_PRICE, 'RENT');
    expect(line.unitPrice).toBe(0);
    expect(needsPrice(line, 'RENT')).toBe(false);
    expect(lineTotal(line, 'RENT', 3)).toBe(0);
    expect(firstMissing({ ...base, lines: [line] })).toBeNull();
    const daily = selectMode([line], 22, 'DAILY');
    expect(needsPrice(daily[0], 'RENT')).toBe(true);
    expect(firstMissing({ ...base, lines: daily })).toBe('price');
  });

  it('a priced line can be given free: typed 0 is a price, not "Nhập giá"', () => {
    let lines = setLinePrice([lineFromProduct(AO_DAI, 'RENT')], 11, 0);
    expect(lines[0]).toMatchObject({ unitPrice: 0, pricingType: 'DAILY' });
    expect(needsPrice(lines[0], 'RENT')).toBe(false);
    expect(lineTotal(lines[0], 'RENT', 3)).toBe(0);
    // a missing-price line typed 0 is priced too
    lines = setLinePrice(selectMode([lineFromProduct(VEST, 'RENT')], 12, 'DAILY'), 12, 0);
    expect(needsPrice(lines[0], 'RENT')).toBe(false);
    expect(firstMissing({ ...base, lines })).toBeNull();
  });

  it('clearing the typed price goes back to the product price, or to "Nhập giá" when it has none', () => {
    let lines = setLinePrice(setLinePrice([lineFromProduct(AO_DAI, 'RENT')], 11, 0), 11, null);
    expect(lines[0].unitPrice).toBe(150_000);
    expect(needsPrice(lines[0], 'RENT')).toBe(false);
    lines = setLinePrice(setLinePrice([lineFromProduct(NO_PRICE, 'RENT')], 22, 50_000), 22, null);
    expect(lines[0].unitPrice).toBe(0);
    expect(needsPrice(lines[0], 'RENT')).toBe(false);
  });

  it('a free line keeps 0 through Thuê → Bán → Thuê and in the saved order', () => {
    let lines = setLinePrice([lineFromProduct(AO_DAI, 'RENT')], 11, 0);
    lines = repriceLines(repriceLines(lines, 'SALE'), 'RENT');
    expect(lines[0].unitPrice).toBe(0);
    expect(needsPrice(lines[0], 'RENT')).toBe(false);
    const draft = draftFromOrder(
      { orderType: 'RENT', orderItems: [{ productId: 11, product: { id: 11, name: 'Áo dài đỏ' }, quantity: 1, unitPrice: 0, pricingType: 'FIXED' }] },
      getLocalDateKey,
    );
    expect(needsPrice(draft.lines[0], 'RENT')).toBe(false);
  });

  it('a sale line can be given free and back', () => {
    let lines = setLinePrice([lineFromProduct(AO_DAI, 'SALE')], 11, 0, 'SALE');
    expect(lines[0].unitPrice).toBe(0);
    expect(lineTotal(lines[0], 'SALE', 1)).toBe(0);
    lines = setLinePrice(lines, 11, null, 'SALE');
    expect(lines[0].unitPrice).toBe(900_000);
  });

  it('the payload sends unit price 0 and total 0 for a free line', () => {
    const lines = [lineFromProduct(AO_DAI, 'RENT'), lineFromProduct(FREE, 'RENT')];
    const p = buildPayload({
      ...base,
      mode: 'create',
      lines: setLinePrice(lines, 11, 0),
      discountType: 'amount',
      discountValue: 0,
      depositAmount: null,
      securityDeposit: 0,
      notes: '',
    }) as { orderItems: Array<{ unitPrice: number; totalPrice: number }>; totalAmount: number };
    expect(p.orderItems.map((i) => [i.unitPrice, i.totalPrice])).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(p.totalAmount).toBe(0);
  });
});

// #951: an order made in the apps may hold the same product on two lines (one paid, one free); each line edits on its own
describe('two lines of one product (#951)', () => {
  const draft = () =>
    draftFromOrder(
      {
        orderType: 'RENT',
        orderItems: [
          { productId: 11, product: { id: 11, name: 'Áo dài đỏ' }, quantity: 1, unitPrice: 150_000, pricingType: 'FIXED' },
          { productId: 11, product: { id: 11, name: 'Áo dài đỏ' }, quantity: 2, unitPrice: 0, pricingType: 'FIXED' },
        ],
      },
      getLocalDateKey,
    );

  it('loads both lines with their own keys and prices', () => {
    const lines = draft().lines;
    expect(lines).toHaveLength(2);
    expect(lines[0].key).not.toBe(lines[1].key);
    expect(lines.map((l) => [l.quantity, l.unitPrice])).toEqual([
      [1, 150_000],
      [2, 0],
    ]);
  });

  it('quantity, price, note and remove touch one line only', () => {
    const lines = draft().lines;
    const [a, b] = lines;
    let next = setQuantity(lines, b.key, 3);
    expect(next.map((l) => l.quantity)).toEqual([1, 3]);
    next = setLinePrice(next, a.key, 0);
    expect(next.map((l) => l.unitPrice)).toEqual([0, 0]);
    next = setLineNote(next, b.key, 'Tặng');
    expect(next.map((l) => l.notes)).toEqual(['', 'Tặng']);
    next = setQuantity(next, a.key, 0);
    expect(next).toHaveLength(1);
    expect(next[0].key).toBe(b.key);
  });
});

// #952: like the mobile apps after #951, every add of a product is a new cart line (owner: no merging)
describe('every add makes a new line (#952)', () => {
  it('adding the same product twice gives two lines, each with its own key, rent or sale', () => {
    for (const type of ['RENT', 'SALE'] as const) {
      const lines = addProduct(addProduct([], AO_DAI, type), AO_DAI, type);
      expect(lines).toHaveLength(2);
      expect(lines.map((l) => [l.productId, l.quantity])).toEqual([[11, 1], [11, 1]]);
      expect(lines[0].key).not.toBe(lines[1].key);
    }
  });

  it('a new line never changes the lines already in the cart', () => {
    let lines = addProduct([], AO_DAI, 'RENT');
    lines = setQuantity(lines, lines[0].key, 2);
    lines = setLinePrice(lines, lines[0].key, 99_000);
    const first = lines[0];
    lines = addProduct(lines, AO_DAI, 'RENT');
    expect(lines[0]).toEqual(first);
    expect(lines[1]).toMatchObject({ quantity: 1, unitPrice: 150_000, pricingType: 'DAILY' });
  });

  it('quantity, price (0đ too), note and remove act on the line, not on the product', () => {
    let lines = addProduct(addProduct([], AO_DAI, 'RENT'), AO_DAI, 'RENT');
    const [a, b] = lines;
    lines = setLinePrice(lines, b.key, 0);
    expect(lines.map((l) => l.unitPrice)).toEqual([150_000, 0]);
    expect(needsPrice(lines[1], 'RENT')).toBe(false);
    lines = setQuantity(lines, a.key, 3);
    expect(lines.map((l) => l.quantity)).toEqual([3, 1]);
    lines = setLineNote(lines, b.key, 'Tặng');
    expect(lines.map((l) => l.notes)).toEqual(['', 'Tặng']);
    lines = setQuantity(lines, a.key, 0);
    expect(lines.map((l) => l.key)).toEqual([b.key]);
  });

  it('stock and availability count every line of a product', () => {
    let lines = addProduct(addProduct(addProduct([], AO_DAI, 'RENT'), AO_DAI, 'RENT'), VEST, 'RENT');
    lines = setQuantity(lines, lines[1].key, 2);
    expect(productQuantity(lines, 11)).toBe(3);
    expect(productQuantity(lines, 12)).toBe(1);
    expect(productQuantity(lines, 99)).toBe(0);
  });

  it('the payload sends one order item per line, the same product on two items', () => {
    let lines = addProduct(addProduct([], AO_DAI, 'SALE'), AO_DAI, 'SALE');
    lines = setLinePrice(lines, lines[1].key, 0, 'SALE');
    const p = buildPayload({
      mode: 'create',
      orderType: 'SALE',
      customerId: 7,
      outletId: 1,
      pickup: '',
      ret: '',
      lines,
      discountType: 'amount',
      discountValue: 0,
      depositAmount: null,
      securityDeposit: 0,
      notes: '',
    });
    expect(p.orderItems.map((i: { productId: number; unitPrice: number }) => [i.productId, i.unitPrice])).toEqual([
      [11, 900_000],
      [11, 0],
    ]);
  });

  it('editing an order keeps one line per saved item', () => {
    const d = draftFromOrder(
      {
        orderType: 'RENT',
        orderItems: [
          { productId: 11, product: { id: 11, name: 'Áo dài đỏ' }, quantity: 1, unitPrice: 150_000, pricingType: 'FIXED' },
          { productId: 12, product: { id: 12, name: 'Vest' }, quantity: 1, unitPrice: 80_000, pricingType: 'FIXED' },
          { productId: 11, product: { id: 11, name: 'Áo dài đỏ' }, quantity: 1, unitPrice: 0, pricingType: 'FIXED' },
        ],
      },
      getLocalDateKey,
    );
    expect(d.lines.map((l) => [l.productId, l.unitPrice])).toEqual([
      [11, 150_000],
      [12, 80_000],
      [11, 0],
    ]);
    expect(new Set(d.lines.map((l) => l.key)).size).toBe(3);
  });
});

// #1067 owner: "chặn giảm giá lớn hơn tổng đơn luôn" — same rule as iOS CartV2Logic.discountExceeds
describe('discountExceeds (#1067)', () => {
  it('refuses an amount above the subtotal before discount', () => {
    expect(discountExceeds('amount', 5_000_050_000, 77)).toBe(true);
    expect(discountExceeds('amount', 78, 77)).toBe(true);
    expect(discountExceeds('amount', 77, 77)).toBe(false);
    expect(discountExceeds('amount', 0, 0)).toBe(false);
    expect(discountExceeds('amount', 10, 0)).toBe(true);
  });

  it('caps a percent discount at 100%', () => {
    expect(discountExceeds('percentage', 101, 77)).toBe(true);
    expect(discountExceeds('percentage', 100, 77)).toBe(false);
    expect(discountExceeds('percentage', 50, 0)).toBe(false);
  });
});
