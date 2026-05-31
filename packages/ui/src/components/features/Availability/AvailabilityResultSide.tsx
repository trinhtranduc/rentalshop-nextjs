'use client';

import React, { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { useFormatCurrency } from '@rentalshop/ui';
import { parseProductImages } from '@rentalshop/utils';
import { Package, CalendarRange, PackageSearch } from 'lucide-react';
import type { ProductWithStock } from '@rentalshop/types';
import { AvailabilityStatusStrip } from './AvailabilityStatusStrip';
import { TimelineView } from './TimelineView';
import { ActiveOrdersList } from './ActiveOrdersList';
import { useAvailabilityCheck } from './useAvailabilityCheck';
import { formatAvailabilityDate } from './utils';
import type { ActiveOrder } from './types';

interface AvailabilityResultSideProps {
  product: ProductWithStock | null;
  quantity: number;
  pickup: string;
  returnDate: string;
  outletId?: number;
  dateError: boolean;
  activeOrders: ActiveOrder[];
}

export const AvailabilityResultSide: React.FC<AvailabilityResultSideProps> = ({
  product,
  quantity,
  pickup,
  returnDate,
  outletId,
  dateError,
  activeOrders,
}) => {
  const t = useAvailabilityTranslations();
  const locale = useLocale();
  const formatMoney = useFormatCurrency();

  const checkParams = useMemo(
    () => ({
      productId: product?.id,
      pickup,
      returnDate,
      quantity,
      outletId,
    }),
    [product?.id, pickup, returnDate, quantity, outletId]
  );

  const { result, error, canCheck, retry, displayStatus } = useAvailabilityCheck({
    params: checkParams,
    enabled: !dateError && !!product,
  });

  const isAvailable = result?.status === 'available' || result?.status === 'warning';

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <PackageSearch className="w-12 h-12 mb-3 text-text-secondary/35" />
        <p className="text-sm font-medium text-text-primary">{t('idle.title')}</p>
        <p className="text-xs text-text-secondary mt-1.5 max-w-[240px] leading-relaxed">
          {t('idle.description')}
        </p>
      </div>
    );
  }

  const images = parseProductImages(product as Parameters<typeof parseProductImages>[0]);
  const imageUrl = images[0];
  const pickupDisplay = pickup ? formatAvailabilityDate(pickup, locale) : '—';
  const returnDisplay = returnDate ? formatAvailabilityDate(returnDate, locale) : '—';

  return (
    <div className="flex flex-col">
      <div className="p-0">
        {/* Ảnh + meta */}
        <div className="pb-4 border-b border-border">
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-bg-tertiary border border-border shrink-0">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-text-secondary/45" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <h2 className="text-base font-semibold text-text-primary leading-snug line-clamp-2">
                {product.name}
              </h2>
              {product.barcode && (
                <p className="text-xs text-text-secondary mt-0.5 font-mono">{product.barcode}</p>
              )}

              {/* Product details: price, deposit, category */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                {product.rentPrice != null && (
                  <span>{t('product.rentPrice')}: <span className="font-medium text-text-primary">{formatMoney(product.rentPrice)}</span></span>
                )}
                {product.deposit != null && product.deposit > 0 && (
                  <span>{t('product.deposit')}: <span className="font-medium text-text-primary">{formatMoney(product.deposit)}</span></span>
                )}
                {(product as any).category?.name && (
                  <span>{t('product.category')}: <span className="font-medium text-text-primary">{(product as any).category.name}</span></span>
                )}
              </div>

              {/* Period & quantity */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-100 px-2 py-1 text-xs">
                  <CalendarRange className="w-3 h-3 text-blue-600 shrink-0" />
                  <span className="font-medium text-blue-900">
                    {pickup && returnDate
                      ? t('periodRange', { pickup: pickupDisplay, return: returnDisplay })
                      : t('idle.pickDates')}
                  </span>
                </div>
                <span className="text-xs text-text-secondary">
                  {t('quantity')}: <span className="font-semibold text-text-primary">{quantity}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Kết quả + chi tiết */}
        <div className="pt-4 space-y-4">
          <AvailabilityStatusStrip
            displayStatus={!pickup || !returnDate ? 'idle' : (displayStatus as typeof displayStatus)}
            result={result}
            errorKey={error}
            quantity={quantity}
            missingOutlet={!outletId}
            onRetry={retry}
          />

          {(activeOrders.length > 0 || (pickup && returnDate)) && (
            <div className="space-y-3 pt-1">
              <TimelineView
                orders={activeOrders}
                selectedPickup={pickup}
                selectedReturn={returnDate}
              />
              <ActiveOrdersList
                orders={activeOrders}
                productName={product.name}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
