'use client';

/**
 * Đơn hàng (#516). "Tất cả đơn" reads GET /api/orders; "Việc cần làm" and "Chưa lấy đồ" read
 * GET /api/analytics/outlet-operations. Row mapping lives in ./orders-model (unit-tested).
 * Every filter is kept in the URL.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFormatCurrency, useToast } from '@rentalshop/ui';
import { useCanExportData } from '@rentalshop/hooks';
import { formatDateKeyInTimeZone, getLocalDateKey, ordersApi, SHOP_TIMEZONE } from '@rentalshop/utils';
import type { OrderFilters } from '@rentalshop/types';
import { DateRangeField } from '../components/date-range/RangeCalendar';
import { ICONS, ShellIcon } from '../components/shell/Icon';
import { useOutletOperations } from '../dashboard/OutletOperationsPanel';
import {
  CREATED_PRESETS,
  ORDER_STATUSES,
  ORDERS_TABS,
  SORT_KEYS,
  SORTS,
  addDaysKey,
  buildOpsRows,
  buildOrderRow,
  createdRange,
  opsCounts,
  parsePage,
  parsePageSize,
  parsePreset,
  parseSort,
  parseStatus,
  parseTab,
  parseType,
  type CreatedPreset,
  type OrderRowLike,
  type OrderTypeFilter,
  type SortKey,
} from './orders-model';
import { FilterMenu, OrdersTable, TableFooter, cardClass, outlineBtn, primaryBtn, type T } from './list/parts';

interface ListState {
  rows: OrderRowLike[];
  total: number;
  totalPages: number;
  loading: boolean;
  failed: boolean;
}

/** One page of GET /api/orders; idle when `filters` is null. */
function useOrdersPage(filters: OrderFilters | null, nonce: number): ListState {
  const [state, setState] = useState<ListState>({ rows: [], total: 0, totalPages: 1, loading: !!filters, failed: false });
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
          setState({
            rows: (data.orders || []) as OrderRowLike[],
            total: data.total || 0,
            totalPages: Math.max(1, data.totalPages || 1),
            loading: false,
            failed: false,
          });
        } else setState((s) => ({ ...s, loading: false, failed: true }));
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, failed: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);
  return state;
}

/** Count per status chip under the other filters (one `limit=1` request each; `total` is the count). */
function useStatusCounts(base: OrderFilters | null, nonce: number): Record<string, number | null> {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const key = base ? JSON.stringify(base) : '';
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const filters = JSON.parse(key) as OrderFilters;
    const keys = ['', ...ORDER_STATUSES];
    Promise.all(
      keys.map((status) =>
        ordersApi
          .searchOrders({ ...filters, status: (status || undefined) as OrderFilters['status'], page: 1, limit: 1 })
          .then((res) => (res.success && res.data ? (res.data as { total?: number }).total ?? null : null))
          .catch(() => null),
      ),
    ).then((totals) => {
      if (!cancelled) setCounts(Object.fromEntries(keys.map((k, i) => [k, totals[i]])));
    });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);
  return counts;
}


export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('orders.web') as unknown as T;
  const money = useFormatCurrency();
  const canExport = useCanExportData();
  const { toastSuccess, toastError } = useToast();

  const weekdays = useMemo(() => t('weekdays').split(','), [t]);
  const todayKey = useMemo(() => formatDateKeyInTimeZone(new Date(), SHOP_TIMEZONE), []);

  // URL state
  const tab = parseTab(searchParams.get('tab'));
  const status = parseStatus(searchParams.get('status'));
  const type = parseType(searchParams.get('type'));
  const preset = parsePreset(searchParams.get('created'));
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const sort = parseSort(searchParams.get('sort'));
  const page = parsePage(searchParams.get('page'));
  const limit = parsePageSize(searchParams.get('limit'));
  const q = (searchParams.get('q') || '').trim();
  const range = useMemo(() => createdRange(preset, todayKey, { from, to }), [preset, todayKey, from, to]);

  const update = useCallback(
    (patch: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '' || v === undefined) params.delete(k);
        else params.set(k, String(v));
      }
      if (!('page' in patch)) params.delete('page');
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Filters shared by the page and the chip counts
  const base: OrderFilters = useMemo(
    () => ({
      search: q || undefined,
      orderType: (type || undefined) as OrderFilters['orderType'],
      startDate: range?.startDate,
      endDate: range?.endDate,
    }),
    [q, type, range],
  );
  const pageFilters: OrderFilters = useMemo(
    () => ({ ...base, status: (status || undefined) as OrderFilters['status'], page, limit, ...SORTS[sort] }),
    [base, status, page, limit, sort],
  );

  const [nonce, setNonce] = useState(0);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const list = useOrdersPage(tab === 'all' ? pageFilters : null, nonce);
  const counts = useStatusCounts(tab === 'all' ? base : null, nonce);
  const ops = useOutletOperations();
  const badges = opsCounts(ops.data);

  const rows = useMemo(() => {
    if (tab === 'all') return list.rows.map((o) => buildOrderRow(o, todayKey, getLocalDateKey));
    return buildOpsRows(ops.data, tab, todayKey, getLocalDateKey);
  }, [tab, list.rows, ops.data, todayKey]);

  // A page past the end (after a filter shrank the list) goes back to the last one
  useEffect(() => {
    if (tab === 'all' && !list.loading && !list.failed && page > list.totalPages) update({ page: list.totalPages > 1 ? list.totalPages : null });
  }, [tab, list.loading, list.failed, list.totalPages, page, update]);

  // Orders ticked for "Xuất Excel" (#526); kept across pages and filters until cleared
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const selection = useMemo(
    () => ({
      ids: selected,
      toggle: (id: number) =>
        setSelected((cur) => {
          const next = new Set(cur);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      setMany: (ids: number[], on: boolean) =>
        setSelected((cur) => {
          const next = new Set(cur);
          ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
          return next;
        }),
    }),
    [selected],
  );

  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    setExporting(true);
    try {
      const chosen = Array.from(selected);
      const blob = await ordersApi.exportOrders(
        chosen.length
          ? { format: 'excel', orderIds: chosen }
          : {
              format: 'excel',
              dateField: 'createdAt',
              ...(range ? { period: 'custom' as const, startDate: range.startDate, endDate: range.endDate } : { period: '1year' as const }),
              status: status || undefined,
              orderType: type || undefined,
            },
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `don-hang-${todayKey}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toastSuccess(t('exportDone'));
    } catch {
      toastError(t('exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const [draft, setDraft] = useState({ from: range?.startDate ?? addDaysKey(todayKey, -6), to: range?.endDate ?? todayKey });
  useEffect(() => {
    if (range) setDraft({ from: range.startDate, to: range.endDate });
  }, [range]);

  const tabLabel = (key: (typeof ORDERS_TABS)[number]) => {
    const count = key === 'todo' ? badges.todo : key === 'noshow' ? badges.noshow : 0;
    return (
      <>
        {t(`tabs.${key}`)}
        {key === 'todo' && count > 0 && (
          <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-ar-danger px-1.5 text-xs font-bold text-white">{count}</span>
        )}
        {key === 'noshow' && count > 0 && <span className="text-sm font-bold text-ar-danger">{count}</span>}
      </>
    );
  };

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold text-ar-ink">{t('title')}</h1>
        <div className="flex flex-wrap gap-2">
          {canExport && tab === 'all' && (
            <>
              {selected.size > 0 && (
                <button type="button" onClick={() => setSelected(new Set())} className={outlineBtn}>
                  {t('select.clear')}
                </button>
              )}
              <button type="button" onClick={exportExcel} disabled={exporting} className={outlineBtn}>
                <ShellIcon d={ICONS.download} size={18} />
                {exporting ? t('exporting') : selected.size > 0 ? t('select.export', { count: selected.size }) : t('export')}
              </button>
            </>
          )}
          <Link href="/orders/create" className={primaryBtn}>
            <ShellIcon d={ICONS.plus} size={18} />
            {t('create')}
          </Link>
        </div>
      </div>

      <div role="tablist" aria-label={t('tabs.label')} className="flex gap-6 overflow-x-auto border-b border-ar-line">
        {ORDERS_TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => update({ tab: key === 'all' ? null : key })}
            className={`-mb-px flex h-11 shrink-0 items-center gap-1.5 border-b-2 text-[15px] ${
              tab === key ? 'border-ar-primary font-bold text-ar-ink' : 'border-transparent font-medium text-ar-ink-2 hover:text-ar-ink'
            }`}
          >
            {tabLabel(key)}
          </button>
        ))}
      </div>

      {q && (
        <div className="flex">
          <span className="inline-flex items-center gap-1 rounded-full bg-ar-primary-soft py-1 pl-3 pr-1 text-sm font-semibold text-ar-primary-ink">
            {t('search.result', { q })}
            <button
              type="button"
              aria-label={t('search.clear')}
              onClick={() => update({ q: null })}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-ar-surface"
            >
              <ShellIcon d={ICONS.close} size={14} />
            </button>
          </span>
        </div>
      )}

      <section className={`${cardClass} overflow-hidden`}>
        {tab === 'all' && (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-ar-subtle px-4 py-3.5">
              <div role="group" aria-label={t('status.label')} className="flex flex-wrap gap-2">
                {(['', ...ORDER_STATUSES] as const).map((s) => {
                  const active = status === s;
                  const count = counts[s];
                  return (
                    <button
                      key={s || 'all'}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update({ status: s || null })}
                      className={`h-9 whitespace-nowrap rounded-full px-3 text-sm ${
                        active ? 'bg-ar-ink font-semibold text-ar-page' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'
                      }`}
                    >
                      {t(`status.${s || 'all'}`)}
                      {typeof count === 'number' && <span className={`ml-1 tabular-nums ${active ? 'opacity-80' : 'text-ar-muted'}`}>{count}</span>}
                    </button>
                  );
                })}
              </div>
              <span className="flex-1" />
              <div className="flex flex-wrap gap-2">
                <FilterMenu<OrderTypeFilter | 'all'>
                  label={t('type.label')}
                  value={type || 'all'}
                  options={(['all', 'RENT', 'SALE'] as const).map((v) => ({ value: v, label: t(`type.${v}`) }))}
                  onChange={(v) => update({ type: v === 'all' ? null : v })}
                />
                <FilterMenu<CreatedPreset>
                  label={t('created.label')}
                  value={preset}
                  options={CREATED_PRESETS.map((v) => ({
                    value: v,
                    label: v === 'custom' && preset === 'custom' && range ? `${range.startDate.slice(8)}/${range.startDate.slice(5, 7)} – ${range.endDate.slice(8)}/${range.endDate.slice(5, 7)}` : t(`created.${v}`),
                  }))}
                  onChange={(v) =>
                    update(v === 'custom' ? { created: 'custom', from: draft.from, to: draft.to } : { created: v === 'any' ? null : v, from: null, to: null })
                  }
                />
                <FilterMenu<SortKey>
                  label={t('sort.label')}
                  value={sort}
                  options={SORT_KEYS.map((v) => ({ value: v, label: t(`sort.${v}`) }))}
                  onChange={(v) => update({ sort: v === 'newest' ? null : v })}
                />
              </div>
            </div>
            {preset === 'custom' && (
              <div className="flex justify-end border-b border-ar-subtle px-4 py-3">
                <DateRangeField
                  from={draft.from}
                  to={draft.to}
                  todayKey={todayKey}
                  max={todayKey}
                  align="end"
                  ariaLabel={t('created.label')}
                  className="h-9 text-sm sm:w-auto"
                  onChange={(f, tt) => update({ created: 'custom', from: f, to: tt })}
                />
              </div>
            )}
          </>
        )}

        <OrdersTable
          rows={rows}
          loading={tab === 'all' ? list.loading : ops.loading}
          failed={tab === 'all' ? list.failed : ops.failed}
          onRetry={tab === 'all' ? retry : ops.reload}
          emptyText={t(`empty.${tab}`)}
          weekdays={weekdays}
          t={t}
          money={money}
          skeletonRows={tab === 'all' ? Math.min(limit, 10) : 4}
          selection={canExport && tab === 'all' ? selection : undefined}
        />

        {tab === 'all' && list.total > 0 && (
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
