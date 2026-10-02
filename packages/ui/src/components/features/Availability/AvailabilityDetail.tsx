'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { useFormatCurrency } from '@rentalshop/ui';
import { parseProductImages } from '@rentalshop/utils';
import { AlertCircle, CheckCircle2, Loader2, Package } from 'lucide-react';
import type { ProductWithStock } from '@rentalshop/types';
import { cn } from '../../../lib/cn';
import { ActiveOrdersList } from './ActiveOrdersList';
import { addDaysToKey, freeUnitsByDay, shopDateKey, todayShopKey } from './availability-days';
import type { ActiveOrder } from './types';
import type { ProductCheckState } from './useAvailabilityResults';

const GRID_DAYS = 14;

interface AvailabilityDetailProps {
  product: ProductWithStock;
  quantity: number;
  pickup: string;
  returnDate: string;
  periodReady: boolean;
  check?: ProductCheckState;
  orders: ActiveOrder[];
  onPickDay: (dayKey: string) => void;
  onRetry: () => void;
}

const dayMonth = (key: string) => {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
};

/** One product in detail: how many units are free in the period, day by day, and which orders hold the rest. */
export const AvailabilityDetail: React.FC<AvailabilityDetailProps> = ({
  product,
  quantity,
  pickup,
  returnDate,
  periodReady,
  check,
  orders,
  onPickDay,
  onRetry,
}) => {
  const t = useAvailabilityTranslations();
  const locale = useLocale();
  const formatMoney = useFormatCurrency();
  const image = parseProductImages(product as Parameters<typeof parseProductImages>[0])[0];
  const result = check?.state === 'done' ? check.result : null;
  const todayKey = todayShopKey();

  // 14 civil days starting a few days before the pickup (never before today)
  const days = useMemo(() => {
    const start = pickup ? addDaysToKey(pickup, -3) : todayKey;
    const first = start < todayKey ? todayKey : start;
    return Array.from({ length: GRID_DAYS }, (_, i) => addDaysToKey(first, i));
  }, [pickup, todayKey]);

  const totalStock = result?.totalStock ?? product.outletStock?.[0]?.stock ?? 0;
  const freeByDay = useMemo(() => freeUnitsByDay(totalStock, orders, days), [totalStock, orders, days]);
  const weekday = useMemo(
    () => new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : locale, { weekday: 'short', timeZone: 'UTC' }),
    [locale]
  );

  const free = result?.effectivelyAvailable ?? 0;
  const busy = result ? Math.max(0, result.totalStock - free) : 0;
  const enough = result ? free >= quantity : false;
  const pct = (n: number) => (result && result.totalStock > 0 ? (n / result.totalStock) * 100 : 0);

  return (
    <div className="min-w-0 space-y-5">
      {/* Product */}
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-tertiary">
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-gray-600/50" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-text-primary">{product.name}</h2>
          <p className="text-xs text-gray-600">
            {[
              product.rentPrice != null ? `${t('product.rentPrice')} ${formatMoney(product.rentPrice)}` : null,
              product.deposit ? `${t('product.deposit')} ${formatMoney(product.deposit)}` : null,
              product.barcode || null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {/* Answer for the period */}
      {!periodReady ? (
        <p className="rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 text-sm text-gray-600">{t('idle.pickDates')}</p>
      ) : !check || check.state === 'loading' ? (
        <p className="flex items-center gap-2 py-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
          {t('checking')}
        </p>
      ) : check.state === 'error' ? (
        <p className="flex items-center gap-3 text-sm text-red-700">
          {t('errors.checkFailed')}
          <button type="button" onClick={onRetry} className="min-h-[32px] rounded-md border border-border px-3 text-text-primary">
            {t('actions.retry')}
          </button>
        </p>
      ) : (
        result && (
          <div>
            <p className={cn('flex items-center gap-2 text-lg font-bold', enough ? 'text-green-800' : 'text-red-700')}>
              {enough ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <AlertCircle className="h-5 w-5" aria-hidden="true" />}
              {enough ? t('detail.freeHeadline', { count: free }) : t('result.insufficient', { need: quantity, have: free })}
            </p>
            <div
              className="mt-3 flex h-3 overflow-hidden rounded-full bg-green-100"
              role="img"
              aria-label={t('detail.barLabel', { free, busy, need: quantity, total: result.totalStock })}
            >
              <span className="h-full bg-amber-400" style={{ width: `${pct(busy)}%` }} />
              <span className={cn('h-full', enough ? 'bg-blue-600' : 'bg-red-500')} style={{ width: `${pct(Math.min(quantity, Math.max(free, 0)))}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-green-100 ring-1 ring-inset ring-green-300" aria-hidden="true" />
                {t('detail.free')} <b className="tabular-nums text-text-primary">{free}</b>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" aria-hidden="true" />
                {t('detail.busy')} <b className="tabular-nums text-text-primary">{busy}</b>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-sm', enough ? 'bg-blue-600' : 'bg-red-500')} aria-hidden="true" />
                {t('detail.need')} <b className="tabular-nums text-text-primary">{quantity}</b>
              </span>
              <span>
                {t('stock.total')} <b className="tabular-nums text-text-primary">{result.totalStock}</b>
              </span>
            </div>
          </div>
        )
      )}

      {/* Free units per day */}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-text-primary">{t('detail.days')}</h3>
          <span className="text-xs text-gray-600">{t('detail.dayHint')}</span>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {days.map((day, i) => {
            const inPeriod = Boolean(pickup && returnDate && day >= pickup && day <= returnDate);
            const short = freeByDay[i] < quantity;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onPickDay(day)}
                aria-label={t('detail.dayLabel', { date: dayMonth(day), free: freeByDay[i] })}
                aria-current={inPeriod ? 'date' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center rounded-md border text-center transition-colors',
                  short ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-border bg-bg-card hover:bg-bg-secondary',
                  inPeriod && 'ring-2 ring-blue-600 ring-offset-1'
                )}
              >
                <span className="text-[11px] leading-none text-gray-600">
                  {weekday.format(new Date(Date.parse(day)))} {dayMonth(day)}
                </span>
                <span className={cn('mt-1 text-base font-semibold leading-none tabular-nums', short ? 'text-red-700' : 'text-text-primary')}>
                  {freeByDay[i]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders holding units in the period */}
      {result && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{t('detail.conflicts', { count: result.conflicts.length })}</h3>
          {result.conflicts.length === 0 ? (
            <p className="mt-1.5 text-sm text-gray-600">{t('detail.noConflicts')}</p>
          ) : (
            <ul className="mt-1.5 divide-y divide-border rounded-lg border border-border">
              {result.conflicts.map((c, i) => {
                const from = c.pickupDate ? shopDateKey(c.pickupDate) : '';
                const to = c.returnDate ? shopDateKey(c.returnDate) : '';
                return (
                  <li key={`${c.orderNumber}-${i}`}>
                    <Link
                      href={`/orders/${c.orderNumber}`}
                      className="flex min-h-[40px] items-center gap-3 px-3 text-sm hover:bg-bg-secondary/60"
                    >
                      <span className="shrink-0 font-medium text-text-primary">#{c.orderNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-gray-600">{c.customerName || '—'}</span>
                      <span className="shrink-0 tabular-nums text-gray-600">
                        {from && to ? `${dayMonth(from)} – ${dayMonth(to)}` : ''}
                      </span>
                      <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-amber-700">×{c.quantity}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <ActiveOrdersList orders={orders} productName={product.name} />
    </div>
  );
};

