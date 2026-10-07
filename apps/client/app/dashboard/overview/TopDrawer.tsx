'use client';

/**
 * "Xem tất cả" for Thuê nhiều nhất / Khách chi nhiều nhất (#620): the full ranking of the period
 * (up to TOP_ALL_LIMIT) in the same drawer as the tile details, opened from `?top=<kind>`.
 */
import React from 'react';
import Link from 'next/link';

import { topBars, topCustomerBars, type PeriodReportLike, type TopKind } from '../overview-model';
import { DrawerShell } from './DetailDrawer';
import { Skeleton, type Money, type T } from './sections';

const NS: Record<TopKind, { ns: string; count: string; href: (id: number | string) => string }> = {
  products: { ns: 'home.top', count: 'home.top.rentals', href: (id) => `/products/${id}` },
  customers: { ns: 'home.topCustomers', count: 'home.topCustomers.orders', href: (id) => `/customers/${id}` },
};

export function TopDrawer({
  kind,
  report,
  loading,
  failed,
  onRetry,
  periodLabel,
  onClose,
  t,
  money,
}: {
  kind: TopKind;
  report: PeriodReportLike | null;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  periodLabel: string;
  onClose: () => void;
  t: T;
  money: Money;
}) {
  const cfg = NS[kind];
  const titleId = `top-${kind}-title`;
  const bars =
    kind === 'products' ? topBars(report?.topProducts, Infinity) : topCustomerBars(report?.topCustomers, Infinity);

  return (
    <DrawerShell
      titleId={titleId}
      onClose={onClose}
      t={t}
      header={
        <>
          <span id={titleId} className="text-lg font-bold">
            {t(`${cfg.ns}.title`)}
          </span>
          <span className="text-sm text-ar-ink-2">
            {t(`${cfg.ns}.subtitle`)} · {periodLabel}
          </span>
        </>
      }
    >
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : failed ? (
        <div className="flex items-center gap-3 text-sm text-ar-muted">
          {t('home.loadFailed')}
          <button type="button" onClick={onRetry} className="font-semibold text-ar-primary-ink hover:underline">
            {t('home.retry')}
          </button>
        </div>
      ) : bars.length === 0 ? (
        <p className="m-0 text-sm text-ar-muted">{t(`${cfg.ns}.empty`)}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {bars.map((b, i) => (
            <li key={b.id}>
              <Link
                href={cfg.href(b.id)}
                className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 rounded-lg px-1 py-1.5 text-ar-ink no-underline hover:bg-ar-surface-muted"
              >
                <span className="row-span-2 text-center text-[13px] font-semibold tabular-nums text-ar-muted">{i + 1}</span>
                <span className="truncate text-[13px]">{b.name}</span>
                <span className="text-right text-[13px] font-semibold tabular-nums">{money(b.value)}</span>
                <span aria-hidden="true" className="relative block h-1.5 rounded-[3px] bg-ar-subtle">
                  <span className="absolute inset-y-0 left-0 rounded-[3px] bg-ar-chart-blue" style={{ width: `${b.width}%` }} />
                </span>
                <span className="text-right text-xs text-ar-muted">{t(cfg.count, { count: b.rentals })}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </DrawerShell>
  );
}
