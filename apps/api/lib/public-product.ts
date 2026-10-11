import { parseProductImages } from '@rentalshop/utils';

type Named = { id: number; name: string };

/** The fields read from a `db.products.search` row; anything else on the row is never copied. */
export interface PublicProductSource {
  id: number;
  name: string;
  description?: string | null;
  images?: unknown;
  rentPrice: number;
  salePrice?: number | null;
  deposit?: number | null;
  pricingType?: string | null;
  pricingOptions?: {
    type: string;
    price: number;
    unit?: string | null;
    blockSize?: number | null;
    isDefault?: boolean | null;
  }[];
  categoryId?: number | null;
  category?: Named | null;
  totalStock?: number;
  stock?: number;
  available?: number;
  renting?: number;
  outletStock?: {
    stock: number;
    available: number;
    renting: number;
    outlet?: (Named & { address?: string | null }) | null;
  }[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * #663 — the public shop page is open to anyone. Build its product from an allowlist so cost price
 * (giá vốn), CUIDs and internal fields never leave the API, whatever `db.products.search` adds later.
 */
export function toPublicProduct(product: PublicProductSource) {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? null,
    images: parseProductImages(product.images as Parameters<typeof parseProductImages>[0]),
    rentPrice: product.rentPrice,
    salePrice: product.salePrice ?? null,
    deposit: product.deposit ?? 0,
    pricingType: product.pricingType ?? null,
    pricingOptions: (product.pricingOptions ?? []).map((option) => ({
      type: option.type,
      price: option.price,
      unit: option.unit ?? null,
      blockSize: option.blockSize ?? null,
      isDefault: Boolean(option.isDefault),
    })),
    categoryId: product.categoryId || product.category?.id,
    category: product.category ? { id: product.category.id, name: product.category.name } : null,
    totalStock: product.totalStock,
    stock: product.stock,
    available: product.available,
    renting: product.renting,
    outletStock: (product.outletStock ?? []).map((stock) => ({
      stock: stock.stock,
      available: stock.available,
      renting: stock.renting,
      outlet: stock.outlet
        ? { id: stock.outlet.id, name: stock.outlet.name, address: stock.outlet.address }
        : null,
    })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
