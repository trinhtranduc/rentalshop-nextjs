'use client';

/**
 * Đơn có sản phẩm này (#547): the redrawn Đơn hàng list filtered to one product. Reads GET /api/products/[id]
 * (name, stock) and GET /api/orders?productId= (same endpoint as the old ProductOrdersView), rows from
 * ../../../orders/orders-model (Vietnam days). Status, page and page size live in the URL.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFormatCurrency } from '@rentalshop/ui';
import { formatDateKeyInTimeZone, getLocalDateKey, ordersApi, productsApi, SHOP_TIMEZONE } from '@rentalshop/utils';
import type { OrderFilters } from '@rentalshop/types';
import { ICONS, ShellIcon } from '../../../components/shell/Icon';
import { OrdersTable, Skeleton, TableFooter, cardClass, type T } from '../../../orders/list/parts';
import { ORDER_STATUSES, buildOrderRow, parsePage, parsePageSize, parseStatus, type OrderRowLike } from '../../../orders/orders-model';

type ProductHead = { id: number; name: string; barcode?: string | null; outletStock?: Array<{ stock?: number; available?: number; renting?: number }> | null };

function useProductHead(id: number) {
  const [state, setState] = useState<{ product: ProductHead | null; loading: boolean; failed: boolean }>({ product: null, loading: true, failed: false });
  useEffect(() => {
    let cancelled = false;
    if (!(id > 0)) {
      setState({ product: null, loading: false, failed: true });
      return;
    }
    productsApi
      .getProductById(id)
      .then((res) => {
        if (!cancelled) setState({ product: res.success && res.data ? (res.data as unknown as ProductHead) : null, loading: false, failed: !res.success });
      })
      .catch(() => !cancelled && setState({ product: null, loading: false, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [id]);
  return state;
}

interface ListState {
  rows: OrderRowLike[];
  total: number;
  totalPages: number;
  loading: boolean;
  failed: boolean;
}

function useOrders(filters: OrderFilters | null, nonce: number): ListState {
  const [state, setState] = useState<ListState>({ rows: [], total: 0, totalPages: 1, loading: true, failed: false });
  const key = filters ? JSON.stringify(filters) : '';
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, failed: false }));
    ordersApi
      .searchOrders(JSON.parse(key) as OrderFilters)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          const data = res.data as { orders?: unknown[]; total?: number; totalPages?: number };
          setState({ rows: (data.orders || []) as OrderRowLike[], total: data.total || 0, totalPages: Math.max(1, data.totalPages || 1), loading: false, failed: false });
        } else setState((s) => ({ ...s, loading: false, failed: true }));
      })
      .catch(() => !cancelled && setState((s) => ({ ...s, loading: false, failed: true })));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);
  return state;
}

/** Orders per status chip for this product (one `limit=1` request each; `total` is the count). */
function useStatusCounts(productId: number, nonce: number): Record<string, number | null> {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  useEffect(() => {
    if (!(productId > 0)) return;
    let cancelled = false;
    const keys = ['', ...ORDER_STATUSES];
    Promise.all(
      keys.map((status) =>
        ordersApi
          .searchOrders({ productId, status: (status || undefined) as OrderFilters['status'], page: 1, limit: 1 } as OrderFilters)
          .then((res) => (res.success && res.data ? (res.data as { total?: number }).total ?? null : null))
          .catch(() => null),
      ),
    ).then((totals) => {
      if (!cancelled) setCounts(Object.fromEntries(keys.map((k, i) => [k, totals[i]])));
    });
    return () => {
      cancelled = true;
    };
  }, [productId, nonce]);
  return counts;
}

function Tile({ label, value, tone }: { label: string; value: number | null; tone?: string }) {
  return (
    <div className={`${cardClass} flex min-w-0 flex-col gap-1 px-4 py-3.5`}>
      <span className="text-sm text-ar-muted">{label}</span>
      {value == null ? <Skeleton className="h-7 w-14" /> : <span className={`text-[26px] font-bold leading-tight tabular-nums ${tone || 'text-ar-ink'}`}>{value}</span>}
    </div>
  );
}

export default function ProductOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const productId = Number(params.id);
  const tp = useTranslations('products.web') as unknown as T;
  const t = useTranslations('orders.web') as unknown as T;
  const money = useFormatCurrency();
  const weekdays = useMemo(() => t('weekdays').split(','), [t]);
  const todayKey = useMemo(() => formatDateKeyInTimeZone(new Date(), SHOP_TIMEZONE), []);

  const status = parseStatus(searchParams.get('status'));
  const page = parsePage(searchParams.get('page'));
  const limit = parsePageSize(searchParams.get('limit'));

  const update = useCallback(
    (patch: Record<string, string | number | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, String(v));
      }
      if (!('page' in patch)) next.delete('page');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [nonce, setNonce] = useState(0);
  const head = useProductHead(productId);
  const filters = useMemo<OrderFilters | null>(
    () =>
      productId > 0
        ? ({ productId, status: (status || undefined) as OrderFilters['status'], page, limit, sortBy: 'createdAt', sortOrder: 'desc' } as OrderFilters)
        : null,
    [productId, status, page, limit],
  );
  const list = useOrders(filters, nonce);
  const counts = useStatusCounts(productId, nonce);
  const rows = useMemo(() => list.rows.map((o) => buildOrderRow(o, todayKey, getLocalDateKey)), [list.rows, todayKey]);

  // A page past the end goes back to the last one
  useEffect(() => {
    if (!list.loading && !list.failed && page > list.totalPages) update({ page: list.totalPages > 1 ? list.totalPages : null });
  }, [list.loading, list.failed, list.totalPages, page, update]);

  const stock = head.product?.outletStock || null;
  const sum = (k: 'stock' | 'available' | 'renting') => (stock ? stock.reduce((s, r) => s + (Number(r?.[k]) || 0), 0) : null);

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <Link
        href={productId > 0 ? `/products/${productId}` : '/products'}
        className="inline-flex w-fit max-w-full items-center gap-1 text-sm font-semibold text-ar-muted no-underline hover:text-ar-ink"
      >
        <ShellIcon d={ICONS.chevronLeft} size={16} />
        <span className="truncate">{tp('orders.back')}</span>
      </Link>
      <div className="min-w-0">
        <h1 className="m-0 text-2xl font-bold text-ar-ink">{tp('orders.title')}</h1>
        {head.loading ? (
          <Skeleton className="mt-1.5 h-5 w-60" />
        ) : (
          head.product && (
            <p className="m-0 mt-1 text-[15px] text-ar-ink-2">
              {head.product.name}
              {head.product.barcode && <span className="font-mono text-sm tabular-nums text-ar-muted"> · {head.product.barcode}</span>}
            </p>
          )
        )}
      </div>

      {!head.failed && (
        <div className="grid grid-cols-3 gap-3">
          <Tile label={tp('orders.total')} value={sum('stock')} />
          <Tile label={tp('orders.available')} value={sum('available')} tone="text-ar-done" />
          <Tile label={tp('orders.renting')} value={sum('renting')} tone="text-ar-renting" />
        </div>
      )}

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-ar-subtle px-4 py-3.5">
          <div role="group" aria-label={t('status.label')} className="flex gap-2 overflow-x-auto">
            {(['', ...ORDER_STATUSES] as const).map((s) => {
              const active = status === s;
              const count = counts[s];
              return (
                <button
                  key={s || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ status: s || null })}
                  className={`h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-sm ${
                    active ? 'bg-ar-ink font-semibold text-ar-page' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'
                  }`}
                >
                  {t(`status.${s || 'all'}`)}
                  {typeof count === 'number' && <span className={`ml-1 tabular-nums ${active ? 'opacity-80' : 'text-ar-muted'}`}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <OrdersTable
          rows={rows}
          loading={list.loading}
          failed={list.failed}
          onRetry={() => setNonce((n) => n + 1)}
          emptyText={status ? tp('orders.emptyStatus') : tp('orders.empty')}
          weekdays={weekdays}
          t={t}
          money={money}
          skeletonRows={Math.min(limit, 6)}
        />

        {list.total > 0 && (
          <TableFooter
            page={Math.min(page, list.totalPages)}
            limit={limit}
            total={list.total}
            totalPages={list.totalPages}
            onPage={(p) => update({ page: p > 1 ? p : null })}
            onLimit={(n) => update({ limit: n === 10 ? null : n })}
            t={t}
          />
        )}
      </section>
    </div>
  );
}
