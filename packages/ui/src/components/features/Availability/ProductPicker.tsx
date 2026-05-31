'use client';

import React, { useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SearchableSelect,
  Button,
} from '@rentalshop/ui';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { productsApi, formatCurrency, parseProductImages } from '@rentalshop/utils';
import { PAGINATION } from '@rentalshop/constants';
import { Package, X } from 'lucide-react';
import type { ProductWithStock } from '@rentalshop/types';
import type { CurrencyCode } from '@rentalshop/types';

interface ProductPickerProps {
  selectedProduct: ProductWithStock | null;
  onSelectProduct: (product: ProductWithStock | null) => void;
  outletId?: number;
  currency?: CurrencyCode;
  disabled?: boolean;
}

export const ProductPicker: React.FC<ProductPickerProps> = ({
  selectedProduct,
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
      if (!value) {
        onSelectProduct(null);
        return;
      }
      const response = await productsApi.getProduct(value);
      if (response.success && response.data) {
        onSelectProduct(response.data as ProductWithStock);
      }
    },
    [onSelectProduct]
  );

  const productImage = selectedProduct
    ? parseProductImages(selectedProduct as Parameters<typeof parseProductImages>[0])[0]
    : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t('sections.product')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedProduct ? (
          <SearchableSelect
            placeholder={t('searchPlaceholder')}
            onSearch={handleSearch}
            onChange={(value) => void handleSelect(value)}
            disabled={disabled}
            emptyText={t('noProductsFound')}
          />
        ) : (
          <div className="flex gap-3 p-3 rounded-lg border border-border bg-bg-secondary/50">
            <div className="w-16 h-16 rounded-md bg-bg-tertiary flex items-center justify-center overflow-hidden shrink-0">
              {productImage ? (
                <img src={productImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-8 h-8 text-text-secondary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary truncate">{selectedProduct.name}</p>
              {selectedProduct.barcode && (
                <p className="text-sm text-text-secondary truncate">
                  {selectedProduct.barcode}
                </p>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-8 px-2 text-blue-600"
                onClick={() => onSelectProduct(null)}
              >
                <X className="w-3 h-3 mr-1" />
                {t('changeProduct')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
