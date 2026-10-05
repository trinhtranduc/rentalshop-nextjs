/**
 * #444: the web order form showed a per-day line total for a FIXED line when the
 * product's default option is per-day, while the saved total used FIXED.
 * The line's own pricing type must drive both the display and the saved total.
 */
import { describe, expect, it } from '@jest/globals';
import {
  computeOrderLineTotal,
  getOrderLineDisplay,
  repriceOrderLineForOrderType,
  resolveOrderLinePricingType,
  type OrderLinePricingItem,
} from '../packages/utils/src/core/order-line-pricing';

// 2026-10-03 → 2026-10-05: pickup and return day both count = 3 days
const PICKUP = '2026-10-03';
const RETURN = '2026-10-05';
const DAYS = 3;

const dailyDefaultProduct = {
  pricingType: 'DAILY', // copied from the default option
  rentPrice: 100_000,
  salePrice: 900_000,
  pricingOptions: [
    { id: 11, type: 'FIXED', price: 150_000, isDefault: false },
    { id: 12, type: 'DAILY', price: 100_000, isDefault: true },
  ],
};

const fixedLine: OrderLinePricingItem = {
  quantity: 2,
  unitPrice: 150_000,
  pricingType: 'FIXED',
  selectedPricingOptionId: 11,
  product: dailyDefaultProduct,
};

const dailyLine: OrderLinePricingItem = {
  quantity: 2,
  unitPrice: 100_000,
  pricingType: 'DAILY',
  selectedPricingOptionId: 12,
  product: dailyDefaultProduct,
};

describe('order form line pricing (#444)', () => {
  it('shows a FIXED line on a DAILY-default product per rental, total = unit × qty', () => {
    const line = getOrderLineDisplay(fixedLine, 'RENT', PICKUP, RETURN);
    expect(line.isDaily).toBe(false);
    expect(line.days).toBe(1);
    expect(line.total).toBe(300_000);
    expect(computeOrderLineTotal(fixedLine, 'RENT', DAYS)).toBe(300_000);
  });

  it('totals a DAILY line as unit × qty × days', () => {
    const line = getOrderLineDisplay(dailyLine, 'RENT', PICKUP, RETURN);
    expect(line.isDaily).toBe(true);
    expect(line.days).toBe(DAYS);
    expect(line.total).toBe(600_000);
    expect(computeOrderLineTotal(dailyLine, 'RENT', DAYS)).toBe(600_000);
  });

  it('ignores days on a SALE order', () => {
    const line = getOrderLineDisplay(dailyLine, 'SALE', PICKUP, RETURN);
    expect(line.isDaily).toBe(false);
    expect(line.total).toBe(200_000);
    expect(computeOrderLineTotal(dailyLine, 'SALE', DAYS)).toBe(200_000);
  });

  it('uses the line type when a line is switched to DAILY without a DAILY option', () => {
    const line: OrderLinePricingItem = {
      quantity: 1,
      unitPrice: 50_000,
      pricingType: 'DAILY',
      selectedPricingOptionId: null,
      product: { pricingType: 'FIXED', rentPrice: 50_000, pricingOptions: [{ id: 21, type: 'FIXED', price: 50_000 }] },
    };
    expect(resolveOrderLinePricingType(line)).toBe('DAILY');
    expect(getOrderLineDisplay(line, 'RENT', PICKUP, RETURN).total).toBe(150_000);
    expect(computeOrderLineTotal(line, 'RENT', DAYS)).toBe(150_000);
  });

  it('falls back to the product type, then FIXED, when the line has no type', () => {
    expect(resolveOrderLinePricingType({ product: { pricingType: 'DAILY' } })).toBe('DAILY');
    expect(resolveOrderLinePricingType({})).toBe('FIXED');
  });

  it.each([
    ['FIXED line, RENT', fixedLine, 'RENT'],
    ['DAILY line, RENT', dailyLine, 'RENT'],
    ['DAILY line, SALE', dailyLine, 'SALE'],
    ['FIXED line, no options', { quantity: 3, unitPrice: 10_000, pricingType: 'FIXED', product: { pricingType: 'DAILY' } }, 'RENT'],
    ['no type, DAILY product', { quantity: 1, unitPrice: 10_000, product: { pricingType: 'DAILY' } }, 'RENT'],
  ] as const)('display total equals the saved total: %s', (_name, item, orderType) => {
    const shown = getOrderLineDisplay(item as OrderLinePricingItem, orderType, PICKUP, RETURN).total;
    expect(shown).toBe(computeOrderLineTotal(item as OrderLinePricingItem, orderType, DAYS));
  });

  it('reprices to the selected option when switching back to RENT', () => {
    expect(repriceOrderLineForOrderType(fixedLine, 'RENT', DAYS)).toEqual({ unitPrice: 150_000, totalPrice: 300_000 });
    expect(repriceOrderLineForOrderType(dailyLine, 'RENT', DAYS)).toEqual({ unitPrice: 100_000, totalPrice: 600_000 });
  });

  it('reprices to the sale price, unit × qty, when switching to SALE', () => {
    expect(repriceOrderLineForOrderType(dailyLine, 'SALE', DAYS)).toEqual({ unitPrice: 900_000, totalPrice: 1_800_000 });
  });
});
