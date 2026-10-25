/**
 * #1200 — saving a product from an installed app (payload without pricingSchemaVersion; it only knows
 * FIXED / DAILY) must not delete a BLOCK pricing option it cannot see.
 */
const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
const createMany = jest.fn().mockResolvedValue({ count: 0 });
const productUpdate = jest.fn().mockResolvedValue({ id: 7 });
const count = jest.fn().mockResolvedValue(0);
const tx = { productPricingOption: { deleteMany, createMany }, product: { update: productUpdate } };
jest.mock('../../packages/database/src/client', () => ({
  prisma: { $transaction: (fn: any) => fn(tx), product: { update: productUpdate }, productPricingOption: { count, updateMany: jest.fn() } },
}));
jest.mock('@rentalshop/utils', () => ({ removeVietnameseDiacritics: (s: string) => s }));

import { simplifiedProducts } from '../../packages/database/src/product';
import { pricingOptionsDeleteWhere } from '../../packages/database/src/product-pricing-normalize';

const oldStylePayload = () => ({
  name: 'Ao dai',
  pricingOptions: [
    { type: 'FIXED', price: 100000, isDefault: true },
    { type: 'DAILY', price: 80000 },
  ],
});

beforeEach(() => { jest.clearAllMocks(); count.mockResolvedValue(0); });

describe('pricingOptionsDeleteWhere (#1200)', () => {
  it('default (replace everything) is unchanged', () => {
    expect(pricingOptionsDeleteWhere(7)).toEqual({ productId: 7 });
    expect(pricingOptionsDeleteWhere(7, { keepBlockOptions: false })).toEqual({ productId: 7 });
  });
  it('old client: BLOCK survives', () => {
    expect(pricingOptionsDeleteWhere(7, { keepBlockOptions: true })).toEqual({ productId: 7, type: { not: 'BLOCK' } });
  });
  it('payload that carries BLOCK itself replaces them', () => {
    expect(pricingOptionsDeleteWhere(7, { keepBlockOptions: true, payloadHasBlock: true })).toEqual({ productId: 7 });
  });
});

describe('simplifiedProducts.update with an old-style payload (#1200)', () => {
  it('keepBlockOptions: deletes only non-BLOCK options, creates the payload ones', async () => {
    await simplifiedProducts.update(7, oldStylePayload(), { keepBlockOptions: true });
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: 7, type: { not: 'BLOCK' } } });
    expect(createMany.mock.calls[0][0].data.map((o: any) => o.type)).toEqual(['FIXED', 'DAILY']);
  });

  it('without the flag the behaviour is the one from before: all options replaced', async () => {
    await simplifiedProducts.update(7, oldStylePayload());
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: 7 } });
  });

  it('a payload without pricingOptions touches no option row', async () => {
    await simplifiedProducts.update(7, { name: 'x' }, { keepBlockOptions: true });
    expect(deleteMany).not.toHaveBeenCalled();
  });
});

describe('the payload observed from an installed app on a BLOCK product (#1200)', () => {
  // e2e on main-real: Save without a change sends rentPrice 0, salePrice 0, pricingOptions [] (form shows no price)
  const oldPut = () => ({ name: 'Ao BLOCK', rentPrice: 0, salePrice: 0, pricingOptions: [] as any[] });

  it('product has a BLOCK option: option rows untouched, rentPrice / salePrice not overwritten with 0', async () => {
    count.mockResolvedValue(1);
    await simplifiedProducts.update(7, oldPut(), { keepBlockOptions: true });
    expect(count).toHaveBeenCalledWith({ where: { productId: 7, type: 'BLOCK' } });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
    const data = productUpdate.mock.calls[0][0].data;
    expect(data.rentPrice).toBeUndefined();
    expect(data.salePrice).toBeUndefined();
    expect(data.name).toBe('Ao BLOCK');
  });

  it('a real price typed on the old app is still saved', async () => {
    count.mockResolvedValue(1);
    await simplifiedProducts.update(7, { ...oldPut(), rentPrice: 90000, salePrice: 0 }, { keepBlockOptions: true });
    const data = productUpdate.mock.calls[0][0].data;
    expect(data.rentPrice).toBe(90000);
    expect(data.salePrice).toBeUndefined();
  });

  it('product without BLOCK: behaves as before (options replaced, prices as sent)', async () => {
    count.mockResolvedValue(0);
    await simplifiedProducts.update(7, oldPut(), { keepBlockOptions: true });
    expect(deleteMany).toHaveBeenCalled();
    expect(productUpdate.mock.calls[0][0].data.rentPrice).toBe(0);
  });

  it('no flag (new client / other caller): nothing is skipped', async () => {
    count.mockResolvedValue(1);
    await simplifiedProducts.update(7, oldPut());
    expect(count).not.toHaveBeenCalled();
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: 7 } });
  });
});
