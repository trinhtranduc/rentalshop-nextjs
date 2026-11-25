/**
 * #1189 what a client WITHOUT the `block-pricing` capability sees of a BLOCK pricing option.
 *
 * Old iOS drops an option it does not know and then shows $0 for the product (it also ignores `rentPrice` when
 * there are options), old Android reads it as FIXED (e2e-old-app-baseline.md rows 10-13). So an old client gets
 * the BLOCK option as a plain FIXED option at the day-1 price (same id, so a cart line still points at it), or no
 * option at all when the product already has a real FIXED one. The table (`block*`) is never sent to it.
 * `rentPrice` of a BLOCK product is already the day-1 price (set on save) and `pricingType` stays FIXED.
 * Capable clients (header `X-Client-Capabilities: block-pricing`) get the options as stored.
 */
import { hasCapability } from './client-capabilities';
import { salePriceForClient } from './legacy-sale-price';

type HeaderRequest = { headers?: { get(name: string): string | null } | null } | null | undefined;
type OptionLike = { type?: string | null; [key: string]: unknown };

const BLOCK_KEYS = ['blockTiers', 'blockStartDay', 'blockExtraMode', 'blockExtraPrice'];

export function pricingOptionsForClient<T extends OptionLike>(options: T[] | null | undefined, request: HeaderRequest): T[] {
  const list = options ?? [];
  if (!list.some((o) => o?.type === 'BLOCK')) return list;
  if (hasCapability(request, 'block-pricing')) return list;
  const hasFixed = list.some((o) => o?.type === 'FIXED');
  const out: T[] = [];
  for (const option of list) {
    if (option?.type !== 'BLOCK') {
      out.push(option);
    } else if (!hasFixed) {
      const plain: Record<string, unknown> = { ...option, type: 'FIXED' };
      for (const key of BLOCK_KEYS) delete plain[key];
      out.push(plain as T);
    }
  }
  return out;
}

/**
 * The product as the caller may read it: `pricingOptions` as `pricingOptionsForClient` shows them, and (#1215)
 * `salePrice` 0 instead of null for an old Android; other fields untouched
 */
export function productForClient<T extends { pricingOptions?: OptionLike[] | null; salePrice?: number | null }>(product: T, request: HeaderRequest): T {
  if (!product) return product;
  const out: T = Array.isArray(product.pricingOptions)
    ? { ...product, pricingOptions: pricingOptionsForClient(product.pricingOptions, request) }
    : product;
  const salePrice = salePriceForClient(product.salePrice, request);
  return salePrice === product.salePrice ? out : { ...out, salePrice };
}
