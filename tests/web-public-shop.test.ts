/**
 * #665 — public shop page: which prices a card shows, money format, contact links.
 */
import { describe, expect, it } from '@jest/globals';
import {
  formatShopMoney,
  productPriceLines,
  shopInitials,
  telLink,
  zaloLink,
} from '../apps/client/app/[tenantKey]/products/lib/public-shop';

describe('public shop prices (#665)', () => {
  it('per-rental price with a per-day line and a sale line', () => {
    expect(
      productPriceLines({
        rentPrice: 350000,
        salePrice: 1200000,
        deposit: 200000,
        pricingOptions: [
          { type: 'FIXED', price: 350000 },
          { type: 'DAILY', price: 120000 },
        ],
      })
    ).toEqual({ main: { amount: 350000, unit: 'rent' }, daily: 120000, sale: 1200000, deposit: 200000 });
  });

  it('legacy product without options: rent price per rental, no per-day, no zero sale/deposit', () => {
    expect(productPriceLines({ rentPrice: 500000, salePrice: 0, deposit: 0, pricingOptions: [] })).toEqual({
      main: { amount: 500000, unit: 'rent' },
      daily: null,
      sale: null,
      deposit: null,
    });
  });

  it('daily-only product shows the per-day price as the main line', () => {
    expect(productPriceLines({ rentPrice: 80000, pricingOptions: [{ type: 'DAILY', price: 80000 }] }).main).toEqual({
      amount: 80000,
      unit: 'day',
    });
    expect(productPriceLines({ rentPrice: 80000, pricingType: 'DAILY' })).toMatchObject({
      main: { amount: 80000, unit: 'day' },
      daily: null,
    });
  });

  it('formats VND the Vietnamese way', () => {
    expect(formatShopMoney(500000, 'VND')).toBe('500.000đ');
    expect(formatShopMoney(1200000)).toBe('1.200.000đ');
    expect(formatShopMoney(12.5, 'USD')).toBe('$12.5');
  });

  it('builds call and Zalo links, none without a phone', () => {
    expect(telLink('0901 234 567')).toBe('tel:0901234567');
    expect(telLink('+84 901 234 567')).toBe('tel:+84901234567');
    expect(zaloLink('0901 234 567')).toBe('https://zalo.me/0901234567');
    expect(zaloLink('+84 901 234 567')).toBe('https://zalo.me/0901234567');
    expect(zaloLink('')).toBeNull();
    expect(telLink(null)).toBeNull();
  });

  it('logo initials', () => {
    expect(shopInitials('Lan Anh Bridal')).toBe('LA');
    expect(shopInitials('áo')).toBe('Á');
    expect(shopInitials('')).toBe('?');
  });
});
