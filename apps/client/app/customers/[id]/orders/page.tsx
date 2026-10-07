'use client';

/**
 * Đơn của khách (#541): the Đơn hàng table filtered to one customer. GET /api/customers/{id}/orders
 * (role-scoped by the API; summary.totalAmount leaves out cancelled orders) and the PICKUPED count.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFormatCurrency } from '@rentalshop/ui';
import { getLocalDateKey, ordersApi } from '@rentalshop/utils';
import { useShopToday } from '../../../hooks/useShopToday';
import type { OrderFilters } from '@rentalshop/types';
import { ICONS, ShellIcon } from '../../../components/shell/Icon';
import { OrdersTable, Skeleton, TableFooter, cardClass, primaryBtn, type T } from '../../../orders/list/parts';
import { buildOrderRow, type OrderRowLike } from '../../../orders/orders-model';
import { customerName, parsePage, parsePageSize, summaryOf, type CustomerSummary } from '../../customers-model';
import { parseCustomerId } from '../../customer-form-model';
import { BackLink, LoadProblem, StatsGrid, pageClass, useCustomer } from '../../profile/parts';

interface OrdersState {
  rows: OrderRowLike[];
  total: number;
  totalPages: number;
  summary: CustomerSummary;
  loading: boolean;
  failed: boolean;
}

function useOrders(id: number | null, page: number, limit: number, nonce: number): OrdersState {
  const empty: CustomerSummary = { orders: null, spent: null, renting: null };
  const [state, setState] = useState<OrdersState>({ rows: [], total: 0, totalPages: 1, summary: empty, loading: true, failed: false });
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, failed: false }));
    Promise.all([
      ordersApi.getOrdersByCustomer(id, page, limit).catch(() => null),
      ordersApi
        .searchOrders({ customerId: id, status: 'PICKUPED' as OrderFilters['status'], page: 1, limit: 1 })
        .then((r) => (r.success && r.data ? ((r.data as { total?: number }).total ?? null) : null))
        .catch(() => null),
    ]).then(([res, renting]) => {
      if (cancelled) return;
      if (res && res.success && res.data) {
        const data = res.data as unknown as { orders?: OrderRowLike[]; total?: number; totalPages?: number; summary?: { totalOrders?: number; totalAmount?: number } };
        setState({
          rows: data.orders || [],
          total: data.total || 0,
          totalPages: Math.max(1, data.totalPages || 1),
          summary: summaryOf(data, renting),
          loading: false,
          failed: false,
        });
      } else setState((s) => ({ ...s, loading: false, failed: true, summary: summaryOf(null, renting) }));
    });
    return () => {
      cancelled = true;
    };
  }, [id, page, limit, nonce]);
  return state;
}

export default function CustomerOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('customers.web') as unknown as T;
  const to = useTranslations('orders.web') as unknown as T;
  const money = useFormatCurrency();
  const id = parseCustomerId(params.id as string | string[] | undefined);

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
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [customerNonce, setCustomerNonce] = useState(0);
  const { customer, loading: customerLoading, failed } = useCustomer(id, customerNonce);
  const [nonce, setNonce] = useState(0);
  const list = useOrders(customer ? customer.id : null, page, limit, nonce);

  const weekdays = useMemo(() => to('weekdays').split(','), [to]);
  const todayKey = useShopToday();
  const rows = useMemo(() => list.rows.map((o) => buildOrderRow(o, todayKey, getLocalDateKey)), [list.rows, todayKey]);

  // A page past the end goes back to the last one
  useEffect(() => {
    if (!list.loading && !list.failed && list.total > 0 && page > list.totalPages) update({ page: list.totalPages > 1 ? list.totalPages : null });
  }, [list.loading, list.failed, list.total, list.totalPages, page, update]);

  if (customerLoading) {
    return (
      <div className={pageClass}>
        <BackLink href="/customers" label={t('form.backList')} />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }
  if (failed || !customer) {
    return (
      <div className={pageClass}>
        <BackLink href="/customers" label={t('form.backList')} />
        <LoadProblem failed={failed || 'notFound'} onRetry={() => setCustomerNonce((n) => n + 1)} t={t} />
      </div>
    );
  }

  const name = customerName(customer) || t('noName');

  return (
    <div className={pageClass}>
      <BackLink href={`/customers/${customer.id}`} label={name} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 min-w-0 text-2xl font-bold text-ar-ink">
          {t('orders.title', { name })}
          {list.total > 0 && <span className="text-base font-normal text-ar-muted"> · {list.total}</span>}
        </h1>
        <Link href="/orders/create" className={primaryBtn}>
          <ShellIcon d={ICONS.plus} size={18} />
          {t('orders.create')}
        </Link>
      </div>

      <section className={`${cardClass} flex flex-col gap-2.5 px-5 py-4`}>
        <StatsGrid summary={list.summary} loading={list.loading && list.summary.orders === null} t={t} money={money} />
        <span className="text-sm text-ar-muted">{t('detail.spentNote')}</span>
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        {list.failed ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-6 text-[15px] text-ar-muted">
            <span>{t('orders.loadFailed')}</span>
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className="h-9 rounded-[10px] border border-ar-line px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle"
            >
              {t('retry')}
            </button>
          </div>
        ) : (
          <OrdersTable
            rows={rows}
            loading={list.loading}
            failed={false}
            onRetry={() => setNonce((n) => n + 1)}
            emptyText={t('orders.empty')}
            weekdays={weekdays}
            t={to}
            money={money}
            skeletonRows={Math.min(limit, 10)}
          />
        )}
        {list.total > 0 && (
          <TableFooter
            page={Math.min(page, list.totalPages)}
            limit={limit}
            total={list.total}
            totalPages={list.totalPages}
            onPage={(p) => update({ page: p > 1 ? p : null })}
            onLimit={(n) => update({ limit: n === 10 ? null : n })}
            t={to}
          />
        )}
      </section>
    </div>
  );
}
