'use client';

import React from 'react';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { parseProductImages } from '@rentalshop/utils';
import { AlertCircle, CheckCircle2, Loader2, Minus, Package, PackageSearch, Plus, X } from 'lucide-react';
import type { ProductWithStock, CurrencyCode } from '@rentalshop/types';
import { cn } from '../../../lib/cn';
import { ProductSearchField } from './ProductSearchField';
import type { SelectedProduct } from './types';
import type { ProductCheckState } from './useAvailabilityResults';

interface AvailabilityProductListProps {
  selectedProducts: SelectedProduct[];
  results: Map<number, ProductCheckState>;
  periodReady: boolean;
  activeProductId?: number;
  onSelectActive: (productId: number) => void;
  onAddProduct: (product: ProductWithStock) => void;
  onRemoveProduct: (productId: number) => void;
  onQuantityChange: (productId: number, qty: number) => void;
  canAddProduct: boolean;
  outletIdForSearch?: number;
  currency?: CurrencyCode;
  disabled?: boolean;
}

function ResultBadge({ check, quantity }: { check?: ProductCheckState; quantity: number }) {
  const t = useAvailabilityTranslations();
  if (!check || check.state === 'loading') {
    return <Loader2 className="h-4 w-4 animate-spin text-gray-600" aria-label={t('checking')} />;
  }
  if (check.state === 'error') {
    return <span className="text-xs font-medium text-red-700">{t('badge.error')}</span>;
  }
  const { effectivelyAvailable, totalStock } = check.result;
  const enough = effectivelyAvailable >= quantity;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        enough ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
      )}
    >
      {enough ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
      {enough
        ? t('badge.free', { free: effectivelyAvailable, total: totalStock })
        : t('badge.short', { count: quantity - effectivelyAvailable })}
    </span>
  );
}

/** The products to check, one line each, with the answer for the chosen period on the line. */
export const AvailabilityProductList: React.FC<AvailabilityProductListProps> = ({
  selectedProducts,
  results,
  periodReady,
  activeProductId,
  onSelectActive,
  onAddProduct,
  onRemoveProduct,
  onQuantityChange,
  canAddProduct,
  outletIdForSearch,
  currency,
  disabled,
}) => {
  const t = useAvailabilityTranslations();

  const done = selectedProducts
    .map((sp) => ({ sp, check: results.get(sp.product.id) }))
    .filter((x) => x.check?.state === 'done') as { sp: SelectedProduct; check: Extract<ProductCheckState, { state: 'done' }> }[];
  const allDone = periodReady && selectedProducts.length > 0 && done.length === selectedProducts.length;
  const shortCount = done.filter(({ sp, check }) => check.result.effectivelyAvailable < sp.quantity).length;

  return (
    <section className="min-w-0" aria-labelledby="av-products">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="av-products" className="text-sm font-semibold text-text-primary">
          {t('productsTitle')}
        </h2>
        <span className="text-xs tabular-nums text-gray-600">{selectedProducts.length}/20</span>
      </div>

      {canAddProduct && (
        <div className="mt-2">
          <ProductSearchField onSelectProduct={onAddProduct} outletId={outletIdForSearch} currency={currency} disabled={disabled} />
        </div>
      )}

      {selectedProducts.length === 0 ? (
        <div className="mt-6 flex flex-col items-center px-4 pb-4 text-center">
          <PackageSearch className="h-10 w-10 text-gray-600/40" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-text-primary">{t('empty.title')}</p>
          <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-gray-600">{t('empty.description')}</p>
        </div>
      ) : (
        <>
          {/* Overall answer for the whole list */}
          <div role="status" aria-live="polite" className="mt-3 min-h-[20px] text-sm">
            {!periodReady ? (
              <span className="text-gray-600">{t('summary.pickDates')}</span>
            ) : !allDone ? (
              <span className="text-gray-600">{t('checking')}</span>
            ) : shortCount === 0 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-green-800">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t('summary.allOk', { count: selectedProducts.length })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                {t('summary.someShort', { count: shortCount })}
              </span>
            )}
          </div>

          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {selectedProducts.map((sp) => {
              const image = parseProductImages(sp.product as Parameters<typeof parseProductImages>[0])[0];
              const isActive = sp.product.id === activeProductId;
              return (
                <li
                  key={sp.product.id}
                  // Phones: name and remove on the first line, quantity and result on the second
                  className={cn('relative flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-2.5 py-2 transition-colors sm:flex-nowrap', isActive ? 'bg-blue-50/70' : 'hover:bg-bg-secondary/60')}
                >
                  {isActive && <span className="absolute inset-y-1 left-0 w-0.5 rounded bg-blue-600" aria-hidden="true" />}
                  <button
                    type="button"
                    onClick={() => onSelectActive(sp.product.id)}
                    aria-pressed={isActive}
                    title={sp.product.barcode || undefined}
                    className="order-1 flex min-h-[40px] min-w-0 basis-[calc(100%-2.75rem)] items-center gap-2.5 text-left sm:flex-1 sm:basis-auto"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/80 bg-bg-tertiary">
                      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-gray-600/60" aria-hidden="true" />}
                    </span>
                    <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug text-text-primary">{sp.product.name}</span>
                  </button>

                  <div className="order-3 ml-[2.625rem] flex h-8 shrink-0 items-center rounded-md border border-border bg-bg-card sm:order-2 sm:ml-0">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center text-gray-600 hover:text-text-primary disabled:opacity-40"
                      disabled={sp.quantity <= 1}
                      onClick={() => onQuantityChange(sp.product.id, sp.quantity - 1)}
                      aria-label={t('decrease')}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={sp.quantity}
                      aria-label={t('quantity')}
                      onChange={(e) => onQuantityChange(sp.product.id, Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="h-8 w-8 border-0 bg-transparent p-0 text-center text-sm tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center text-gray-600 hover:text-text-primary"
                      onClick={() => onQuantityChange(sp.product.id, sp.quantity + 1)}
                      aria-label={t('increase')}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span className="order-4 ml-auto flex shrink-0 justify-end sm:order-3 sm:ml-0 sm:w-[5.75rem]">
                    {periodReady ? <ResultBadge check={results.get(sp.product.id)} quantity={sp.quantity} /> : <span className="text-xs text-gray-600">—</span>}
                  </span>

                  <button
                    type="button"
                    className="order-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-bg-secondary hover:text-text-primary sm:order-4"
                    onClick={() => onRemoveProduct(sp.product.id)}
                    aria-label={t('remove', { name: sp.product.name })}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
};
