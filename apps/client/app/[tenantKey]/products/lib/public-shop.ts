/**
 * #665 — pure helpers for the public shop page (prices, money, contact links).
 */

export interface ShopPricingOption {
  type: string;
  price: number;
}

export interface ShopPricedProduct {
  rentPrice?: number | null;
  salePrice?: number | null;
  deposit?: number | null;
  pricingType?: string | null;
  pricingOptions?: ShopPricingOption[] | null;
}

export interface ShopPriceLines {
  /** Main rent price and its unit ("rent" = per rental, "day" = per day) */
  main: { amount: number; unit: 'rent' | 'day' } | null;
  /** Per-day price shown under a per-rental price */
  daily: number | null;
  sale: number | null;
  deposit: number | null;
}

const positive = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

export function productPriceLines(product: ShopPricedProduct): ShopPriceLines {
  const options = product.pricingOptions ?? [];
  const fixedOption = positive(options.find((o) => o.type === 'FIXED')?.price);
  const dailyOption = positive(options.find((o) => o.type === 'DAILY')?.price);
  const rentPrice = positive(product.rentPrice);
  // Legacy products keep one price on the product; DAILY pricingType means it is per day
  const dailyOnly = !fixedOption && (dailyOption != null || product.pricingType === 'DAILY');
  const fixed = fixedOption ?? (dailyOnly ? null : rentPrice);
  const daily = dailyOption ?? (dailyOnly ? rentPrice : null);

  return {
    main: fixed != null ? { amount: fixed, unit: 'rent' } : daily != null ? { amount: daily, unit: 'day' } : null,
    daily: fixed != null ? daily : null,
    sale: positive(product.salePrice),
    deposit: positive(product.deposit),
  };
}

/** VND as `500.000đ`; other currencies as `$12.50` */
export function formatShopMoney(amount: number, currency?: string | null): string {
  if (!currency || currency === 'VND') {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(amount))}đ`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

const digitsOf = (phone?: string | null): string => (phone ?? '').replace(/\D/g, '');

/** `tel:` link, or null when there is no usable phone */
export function telLink(phone?: string | null): string | null {
  const digits = digitsOf(phone);
  if (digits.length < 8) return null;
  return `tel:${phone!.trim().startsWith('+') ? '+' : ''}${digits}`;
}

/** Zalo chat link for a Vietnamese phone (`0901…` or `84901…`), or null */
export function zaloLink(phone?: string | null): string | null {
  const digits = digitsOf(phone);
  if (digits.length < 8) return null;
  return `https://zalo.me/${digits.startsWith('84') ? `0${digits.slice(2)}` : digits}`;
}

/** Up to two initials for the logo tile: "Lan Anh Bridal" → "LA" */
export function shopInitials(name?: string | null): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
