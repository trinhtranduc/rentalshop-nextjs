/**
 * #1128 — a customer searches one shop's products by a photo on the public shop page (no login).
 * Same pipeline as POST /api/products/searchByImage (compress → Python /embed → vector store by merchant → Postgres)
 * and the same vector-hit cache, but only the shop's active products in their public shape (no cost price), at most
 * 10, and a request budget because every miss calls the embedding service. The photo is never stored.
 */
import { VALIDATION } from '@rentalshop/constants';
import { toPublicProduct } from './public-product';

export const PUBLIC_IMAGE_SEARCH_LIMIT = 10;
/**
 * Vector hits to read. Same number as POST /api/products/searchByImage (MAX_LIMIT * 2): both routes share the
 * vector-hit cache key (image, merchant, threshold), so a smaller list cached here would cut the shop's own search.
 */
export const PUBLIC_IMAGE_SEARCH_VECTOR_LIMIT = 200;
/** Per API instance (memory), like the booking spam limit of #1124 */
export const PUBLIC_IMAGE_SEARCH_RATE = {
  perIp: { limit: 10, windowMs: 10 * 60 * 1000 },
  perShop: { limit: 200, windowMs: 60 * 60 * 1000 },
};

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export type PickedImage = { name?: string; type?: string; size: number };

/** null when the upload can be searched, else the error code (400) */
export function checkPublicSearchImage(file: PickedImage | null | undefined): 'NO_IMAGE_FILE' | 'IMAGE_VALIDATION_FAILED' | null {
  if (!file || typeof (file as any).arrayBuffer !== 'function') return 'NO_IMAGE_FILE';
  const type = String(file.type || '').toLowerCase().trim();
  const name = String(file.name || '').toLowerCase().trim();
  const typeOk = type ? VALIDATION.ALLOWED_IMAGE_TYPES.some((t: string) => t.toLowerCase() === type) : false;
  const extOk = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!typeOk && !extOk) return 'IMAGE_VALIDATION_FAILED';
  if (file.size > VALIDATION.MAX_FILE_SIZE || file.size < 100) return 'IMAGE_VALIDATION_FAILED';
  return null;
}

/** A `db.products.findByIds` row → the public product plus how similar it is */
export function toPublicSearchResult(product: any, similarity: number) {
  const outletStock = (product.outletStock || []).map((stock: any) => ({
    stock: stock.stock || 0,
    renting: stock.renting || 0,
    available: Math.max(0, (stock.stock || 0) - (stock.renting || 0)),
    outlet: stock.outlet ? { id: stock.outlet.id, name: stock.outlet.name, address: stock.outlet.address ?? null } : null,
  }));
  const renting = outletStock.reduce((sum: number, s: { renting: number }) => sum + s.renting, 0);
  const totalStock = product.totalStock ?? 0;
  return {
    ...toPublicProduct({
      ...product,
      totalStock,
      stock: totalStock,
      renting,
      available: Math.max(0, totalStock - renting),
      outletStock,
    }),
    similarity,
  };
}

/** Hits (best first) → the shop's active products, at most `limit`; other shops' rows never pass */
export function publicSearchResults(
  hits: Array<{ productId: number; similarity: number }>,
  rows: any[],
  merchantId: number,
  limit: number = PUBLIC_IMAGE_SEARCH_LIMIT
) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const out: ReturnType<typeof toPublicSearchResult>[] = [];
  for (const hit of hits) {
    const row = byId.get(hit.productId);
    if (!row || row.isActive === false || row.deletedAt) continue;
    const owner = row.merchant?.id ?? row.merchantId;
    if (owner !== merchantId) continue;
    out.push(toPublicSearchResult(row, hit.similarity));
    if (out.length >= limit) break;
  }
  return out;
}
