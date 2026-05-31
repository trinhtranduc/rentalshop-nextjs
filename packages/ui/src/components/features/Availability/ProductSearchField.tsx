'use client';

import React, { useCallback } from 'react';
import { SearchableSelect } from '@rentalshop/ui';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { productsApi, formatCurrency, parseProductImages } from '@rentalshop/utils';
import { PAGINATION } from '@rentalshop/constants';
import type { ProductWithStock } from '@rentalshop/types';
import type { CurrencyCode } from '@rentalshop/types';

interface ProductSearchFieldProps {
  onSelectProduct: (product: ProductWithStock) => void;
  outletId?: number;
  currency?: CurrencyCode;
  disabled?: boolean;
}

/** Inline search — no card wrapper; used in toolbar */
export const ProductSearchField: React.FC<ProductSearchFieldProps> = ({
  onSelectProduct,
  outletId,
  currency = 'USD',
  disabled,
}) => {
  const t = useAvailabilityTranslations();

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return [];
      const result = await productsApi.searchProducts({
        search: query,
        limit: PAGINATION.SEARCH_LIMIT,
        ...(outletId ? { outletId } : {}),
      });
      const data = result.data;
      const products: ProductWithStock[] = Array.isArray(data)
        ? (data as ProductWithStock[])
        : data && typeof data === 'object' && 'products' in data
          ? ((data as { products?: ProductWithStock[] }).products ?? [])
          : [];

      return products.map((product) => {
        const outletStock = outletId
          ? product.outletStock?.find((os) => os.outletId === outletId)
          : product.outletStock?.[0];
        const images = parseProductImages(product as Parameters<typeof parseProductImages>[0]);
        return {
          value: String(product.id),
          label: product.name,
          image: images[0],
          subtitle: product.barcode || '',
          details: [
            formatCurrency(product.rentPrice ?? 0, currency),
            `${outletStock?.available ?? 0}/${outletStock?.stock ?? 0}`,
          ].filter(Boolean),
          type: 'product' as const,
        };
      });
    },
    [outletId, currency]
  );

  const handleSelect = useCallback(
    async (value: number) => {
      if (!value) return;
      const response = await productsApi.getProduct(value);
      if (response.success && response.data) {
        onSelectProduct(response.data as ProductWithStock);
      }
    },
    [onSelectProduct]
  );

  return (
    <SearchableSelect
      placeholder={t('searchPlaceholder')}
      onSearch={handleSearch}
      onChange={(value) => void handleSelect(value)}
      disabled={disabled}
      emptyText={t('noProductsFound')}
      productRowStyle="compact"
    />
  );
};
