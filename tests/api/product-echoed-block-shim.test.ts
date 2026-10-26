/**
 * #1215 an installed app shows a BLOCK option as a FIXED option at the day-1 price (#1189 shim) and sends it back
 * on save as { type, price, isDefault } (no id). The save kept the BLOCK row (#1200) and created that FIXED row too:
 * two rows with isDefault = true.
 */
const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
const createMany = jest.fn().mockResolvedValue({ count: 0 });
const productUpdate = jest.fn().mockResolvedValue({ id: 7 });
const count = jest.fn().mockResolvedValue(1);
const findMany = jest.fn();
const tx = { productPricingOption: { deleteMany, createMany }, product: { update: productUpdate } };
jest.mock('../../packages/database/src/client', () => ({
  prisma: {
    $transaction: (fn: any) => fn(tx),
    product: { update: productUpdate },
    productPricingOption: { count, findMany, updateMany: jest.fn() },
  },
}));
jest.mock('@rentalshop/utils', () => ({ removeVietnameseDiacritics: (s: string) => s }));

import { simplifiedProducts } from '../../packages/database/src/product';

const stored = (rows: Array<{ type: string; price: number; isDefault: boolean }>) => findMany.mockResolvedValue(rows);
const created = () => (createMany.mock.calls[0]?.[0]?.data ?? []) as any[];
const BLOCK_DEFAULT = { type: 'BLOCK', price: 80000, isDefault: true };

beforeEach(() => { jest.clearAllMocks(); count.mockResolvedValue(1); });

describe('old app saves a BLOCK product (#1215)', () => {
  it('the echoed FIXED shim (same price as day 1) is not created', async () => {
    stored([BLOCK_DEFAULT]);
    await simplifiedProducts.update(7, { name: 'Ao', rentPrice: 80000, pricingOptions: [{ type: 'FIXED', price: 80000, isDefault: true }] }, { keepBlockOptions: true });
    expect(created().filter((o) => o.type === 'FIXED')).toEqual([]);
  });

  it('nothing but the shim = a save that changes no option and keeps the product price', async () => {
    stored([BLOCK_DEFAULT]);
    await simplifiedProducts.update(7, { name: 'Ao', rentPrice: 80000, pricingOptions: [{ type: 'FIXED', price: 80000, isDefault: true }] }, { keepBlockOptions: true });
    expect(createMany).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
    expect(productUpdate.mock.calls[0][0].data.rentPrice).toBe(80000);
  });

  it('the shim plus a DAILY option: DAILY is saved, the shim is not, and only BLOCK stays default', async () => {
    stored([BLOCK_DEFAULT]);
    await simplifiedProducts.update(7, { name: 'Ao', rentPrice: 80000, pricingOptions: [{ type: 'FIXED', price: 80000, isDefault: true }, { type: 'DAILY', price: 30000 }] }, { keepBlockOptions: true });
    expect(created().map((o) => o.type)).toEqual(['DAILY']);
    expect(created().filter((o) => o.isDefault)).toEqual([]);
  });

  it('a FIXED price the user changed is a real option; it is not the default while BLOCK is', async () => {
    stored([BLOCK_DEFAULT]);
    await simplifiedProducts.update(7, { name: 'Ao', pricingOptions: [{ type: 'FIXED', price: 90000, isDefault: true }] }, { keepBlockOptions: true });
    expect(created().map((o) => [o.type, o.price, o.isDefault])).toEqual([['FIXED', 90000, false]]);
  });

  it('a product that already has a real FIXED option: the payload is saved as before', async () => {
    stored([BLOCK_DEFAULT, { type: 'FIXED', price: 80000, isDefault: false }]);
    await simplifiedProducts.update(7, { name: 'Ao', pricingOptions: [{ type: 'FIXED', price: 80000, isDefault: false }] }, { keepBlockOptions: true });
    expect(created().map((o) => [o.type, o.price])).toEqual([['FIXED', 80000]]);
  });

  it('BLOCK is not the default (a DAILY is): the payload default stays the default', async () => {
    stored([{ type: 'BLOCK', price: 80000, isDefault: false }]);
    await simplifiedProducts.update(7, { name: 'Ao', pricingOptions: [{ type: 'DAILY', price: 30000, isDefault: true }] }, { keepBlockOptions: true });
    expect(created().map((o) => [o.type, o.isDefault])).toEqual([['DAILY', true]]);
  });

  it('a product without BLOCK, or a caller without the flag: unchanged', async () => {
    count.mockResolvedValue(0); stored([]);
    await simplifiedProducts.update(7, { name: 'Ao', pricingOptions: [{ type: 'FIXED', price: 80000, isDefault: true }] }, { keepBlockOptions: true });
    expect(created().map((o) => [o.type, o.isDefault])).toEqual([['FIXED', true]]);
    jest.clearAllMocks();
    await simplifiedProducts.update(7, { name: 'Ao', pricingOptions: [{ type: 'FIXED', price: 80000, isDefault: true }] });
    expect(findMany).not.toHaveBeenCalled();
    expect(created().map((o) => o.type)).toEqual(['FIXED']);
  });
});
