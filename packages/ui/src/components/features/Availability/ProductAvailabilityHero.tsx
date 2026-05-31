'use client';

import React, { useMemo } from 'react';
import { useLocale } from 'next-intl';
import {
  Button,
  Input,
  Label,
} from '@rentalshop/ui';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { parseProductImages } from '@rentalshop/utils';
import { Package, X, CalendarRange, Minus, Plus } from 'lucide-react';
import type { ProductWithStock } from '@rentalshop/types';
import { AvailabilityStatusStrip } from './AvailabilityStatusStrip';
import { TimelineView } from './TimelineView';
import { ActiveOrdersList } from './ActiveOrdersList';
import { useAvailabilityCheck } from './useAvailabilityCheck';
import { formatAvailabilityDate } from './utils';
import type { ActiveOrder } from './types';

interface ProductAvailabilityHeroProps {
  product: ProductWithStock;
  quantity: number;
  pickup: string;
  returnDate: string;
  outletId?: number;
  dateError: boolean;
  activeOrders: ActiveOrder[];
  pickupLabel?: string;
  returnLabel?: string;
  onRemove: () => void;
  onQuantityChange: (qty: number) => void;
  onAddToOrder: (product: ProductWithStock, qty: number) => void;
}

export const ProductAvailabilityHero: React.FC<ProductAvailabilityHeroProps> = ({
  product,
  quantity,
  pickup,
  returnDate,
  outletId,
  dateError,
  activeOrders,
  onRemove,
  onQuantityChange,
  onAddToOrder,
}) => {
  const t = useAvailabilityTranslations();
  const locale = useLocale();

  const images = parseProductImages(product as Parameters<typeof parseProductImages>[0]);
  const imageUrl = images[0];

  const pickupDisplay = pickup ? formatAvailabilityDate(pickup, locale) : '—';
  const returnDisplay = returnDate ? formatAvailabilityDate(returnDate, locale) : '—';

  const checkParams = useMemo(
    () => ({
      productId: product.id,
      pickup,
      returnDate,
      quantity,
      outletId,
    }),
    [product.id, pickup, returnDate, quantity, outletId]
  );

  const { result, error, canCheck, retry, displayStatus } = useAvailabilityCheck({
    params: checkParams,
    enabled: !dateError,
  });

  const isAvailable = result?.status === 'available' || result?.status === 'warning';

  return (
    <article className="rounded-2xl border border-border bg-bg-card shadow-sm overflow-hidden">
      {/* Product + period — visual center */}
      <div className="p-4 sm:p-5">
        <div className="flex gap-4 sm:gap-5">
          <div className="shrink-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-bg-tertiary border border-border flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-10 h-10 text-text-secondary/60" />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-text-primary leading-snug line-clamp-2">
                  {product.name}
                </h2>
                {product.barcode && (
                  <p className="text-sm text-text-secondary mt-0.5 font-mono">{product.barcode}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-text-secondary"
                onClick={onRemove}
                aria-label={t('changeProduct')}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Kỳ thuê — nổi bật */}
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm">
                <CalendarRange className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium text-blue-900">
                  {pickup && returnDate
                    ? t('periodRange', { pickup: pickupDisplay, return: returnDisplay })
                    : t('idle.pickDates')}
                </span>
              </div>

              <div className="inline-flex items-center gap-2">
                <Label htmlFor={`qty-${product.id}`} className="text-sm text-text-secondary sr-only">
                  {t('quantity')}
                </Label>
                <span className="text-sm text-text-secondary">{t('quantity')}:</span>
                <div className="inline-flex items-center border border-border rounded-lg overflow-hidden bg-bg-card">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none"
                    disabled={quantity <= 1}
                    onClick={() => onQuantityChange(quantity - 1)}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Input
                    id={`qty-${product.id}`}
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      onQuantityChange(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="w-12 h-8 border-0 text-center text-sm px-0 focus-visible:ring-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none"
                    onClick={() => onQuantityChange(quantity + 1)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kết quả — gọn, ngay dưới mẫu + kỳ */}
        <div className="mt-4">
          <AvailabilityStatusStrip
            displayStatus={!pickup || !returnDate ? 'idle' : (displayStatus as typeof displayStatus)}
            result={result}
            errorKey={error}
            quantity={quantity}
            missingOutlet={!outletId}
            onRetry={retry}
            onAddToOrder={
              canCheck && result && isAvailable
                ? () => onAddToOrder(product, quantity)
                : undefined
            }
          />
        </div>
      </div>

      {/* Chi tiết phụ — thu gọn */}
      {(activeOrders.length > 0 || (pickup && returnDate)) && (
        <div className="border-t border-border bg-bg-secondary/30 px-4 sm:px-5 py-3 space-y-1">
          <TimelineView
            orders={activeOrders}
            selectedPickup={pickup}
            selectedReturn={returnDate}
          />
          <ActiveOrdersList
            orders={activeOrders}
            defaultExpanded={activeOrders.some((o) => o.isConflict)}
          />
        </div>
      )}
    </article>
  );
};
