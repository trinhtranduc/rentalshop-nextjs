'use client';

/**
 * Khách hàng (#526). GET /api/customers (search by word prefix without accents, scoped to the
 * caller's merchant by the API), page and page size in the URL, row selection for the Excel export,
 * and a detail panel on wide screens. Pure mapping lives in ./customers-model (unit-tested).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFormatCurrency, useToast } from '@rentalshop/ui';
import { usePermissions } from '@rentalshop/hooks';
import { customersApi, getLocalDateKey } from '@rentalshop/utils';
import { useShopToday } from '../hooks/useShopToday';
import { ICONS, ShellIcon } from '../components/shell/Icon';
import { TableFooter, cardClass, outlineBtn, primaryBtn } from '../orders/list/parts';
import {
  canSelectAll,
  customerName,
  exportFileName,
  pageSelection,
  parsePage,
  parsePageSize,
  parseQuery,
  toggleOne,
  togglePage,
  type CustomerRowLike,
  type ExportPeriod,
} from './customers-model';
import { CustomerPanel, CustomersTable, DeleteDialog, ExportDialog, PanelSkeleton, SelectionBar, useWide, type T } from './list/parts';

interface ListState {
  rows: CustomerRowLike[];
  total: number;
  totalPages: number;
  loading: boolean;
  failed: boolean;
}

function useCustomersPage(q: string, page: number, limit: number, nonce: number): ListState {
  const [state, setState] = useState<ListState>({ rows: [], total: 0, totalPages: 1, loading: true, failed: false });
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, failed: false }));
    customersApi
      .searchCustomers({ q: q || undefined, page, limit })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          const data = res.data as unknown as { customers?: CustomerRowLike[]; total?: number; totalPages?: number };
          setState({
            rows: data.customers || [],
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
  }, [q, page, limit, nonce]);
  return state;
}

function download(blob: Blob, name: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('customers.web') as unknown as T;
  const to = useTranslations('orders.web') as unknown as T;
  const money = useFormatCurrency();
  const { toastSuccess, toastError } = useToast();
  const { canManageCustomers, canExportCustomers } = usePermissions();
  const wide = useWide();

  const weekdays = useMemo(() => to('weekdays').split(','), [to]);
  const todayKey = useShopToday();

  // URL state
  const q = parseQuery(searchParams.get('q'));
  const page = parsePage(searchParams.get('page'));
  const limit = parsePageSize(searchParams.get('limit'));

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

  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const list = useCustomersPage(q, page, limit, nonce);

  // A page past the end (after a delete or a narrower search) goes back to the last one
  useEffect(() => {
    if (!list.loading && !list.failed && page > list.totalPages) update({ page: list.totalPages > 1 ? list.totalPages : null });
  }, [list.loading, list.failed, list.totalPages, page, update]);

  // Search box: typed text goes to the URL after a pause
  const [draft, setDraft] = useState(q);
  const pushed = useRef(q);
  useEffect(() => {
    if (q !== pushed.current) {
      pushed.current = q;
      setDraft(q);
    }
  }, [q]);
  useEffect(() => {
    const next = draft.trim();
    if (next === pushed.current) return;
    const timer = setTimeout(() => {
      pushed.current = next;
      update({ q: next || null });
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, update]);

  // Selection survives paging; a new search starts over
  const [selected, setSelected] = useState<Set<number>>(new Set());
  useEffect(() => setSelected(new Set()), [q]);
  const pageIds = useMemo(() => list.rows.map((c) => c.id), [list.rows]);
  const pageState = pageSelection(pageIds, selected);

  const [allLoading, setAllLoading] = useState(false);
  const selectAll = async () => {
    setAllLoading(true);
    try {
      const res = await customersApi.searchCustomers({ q: q || undefined, page: 1, limit: Math.max(1, list.total) });
      if (res.success && res.data) {
        const data = res.data as unknown as { customers?: CustomerRowLike[] };
        setSelected(new Set((data.customers || []).map((c) => c.id)));
      }
    } catch {
      toastError(t('loadFailed'));
    } finally {
      setAllLoading(false);
    }
  };

  // Export: the chosen rows, or (nothing chosen) customers added in a period, as before
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const runExport = async (params: { customerIds?: number[]; period?: ExportPeriod }) => {
    setExporting(true);
    try {
      const blob = await customersApi.exportCustomers({ format: 'excel', ...params });
      download(blob, exportFileName(todayKey, params.customerIds?.length || 0));
      toastSuccess(t('exportDone'));
      setExportOpen(false);
    } catch {
      toastError(t('exportFailed'));
    } finally {
      setExporting(false);
    }
  };
  const exportSelected = () => runExport({ customerIds: [...selected] });

  // Detail panel: the clicked row, else the first row of the page
  const [focusId, setFocusId] = useState<number | null>(null);
  const focus = list.rows.find((c) => c.id === focusId) || list.rows[0] || null;
  const openRow = useCallback(
    (id: number) => {
      if (!wide) return false;
      setFocusId(id);
      return true;
    },
    [wide],
  );

  const [toDelete, setToDelete] = useState<CustomerRowLike | null>(null);

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold text-ar-ink">
          {t('title')}
          {list.total > 0 && <span className="text-base font-normal text-ar-muted"> · {list.total}</span>}
        </h1>
        <div className="flex flex-wrap gap-2">
          {canManageCustomers && (
            <Link href="/customers/import" className={outlineBtn}>
              {t('importExcel')}
            </Link>
          )}
          {canExportCustomers && (
            <button
              type="button"
              onClick={() => (selected.size > 0 ? exportSelected() : setExportOpen(true))}
              disabled={exporting}
              className={outlineBtn}
            >
              <ShellIcon d={ICONS.download} size={18} />
              {selected.size > 0 ? t('exportCount', { count: selected.size }) : t('export')}
            </button>
          )}
          <Link href="/customers/add" className={primaryBtn}>
            <ShellIcon d={ICONS.plus} size={18} />
            {t('create')}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <section className={`${cardClass} min-w-0 flex-[3_1_520px] overflow-hidden`}>
          {selected.size > 0 && (
            <SelectionBar
              count={selected.size}
              total={list.total}
              canAll={canSelectAll(list.total, selected.size)}
              allLoading={allLoading}
              onAll={selectAll}
              onClear={() => setSelected(new Set())}
              onExport={exportSelected}
              exporting={exporting}
              canExport={canExportCustomers}
              t={t}
            />
          )}
          <div className="flex flex-wrap items-center gap-2 border-b border-ar-subtle px-4 py-3.5">
            <label className="flex h-9 min-w-0 flex-[1_1_240px] items-center gap-2 rounded-[10px] border border-ar-line px-2.5 text-ar-muted focus-within:border-ar-primary">
              <ShellIcon d={ICONS.search} size={16} />
              <input
                type="search"
                aria-label={t('search.label')}
                placeholder={t('search.placeholder')}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ar-ink outline-none placeholder:text-ar-muted"
              />
              {draft && (
                <button
                  type="button"
                  aria-label={t('search.clear')}
                  onClick={() => setDraft('')}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ar-muted hover:bg-ar-subtle"
                >
                  <ShellIcon d={ICONS.close} size={14} />
                </button>
              )}
            </label>
          </div>

          <CustomersTable
            rows={list.rows}
            loading={list.loading}
            failed={list.failed}
            onRetry={reload}
            emptyText={q ? t('emptySearch', { q }) : t('empty')}
            selected={selected}
            pageState={pageState}
            onTogglePage={() => setSelected((s) => togglePage(pageIds, s))}
            onToggle={(id) => setSelected((s) => toggleOne(id, s))}
            focusId={wide ? focus?.id ?? null : null}
            onOpen={openRow}
            todayKeyOf={getLocalDateKey}
            t={t}
            skeletonRows={Math.min(limit, 10)}
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

        {wide && (
          <div className="min-w-0 flex-[2_1_360px]">
            {focus ? (
              <CustomerPanel
                key={focus.id}
                customer={focus}
                canDelete={canManageCustomers}
                onDelete={() => setToDelete(focus)}
                todayKey={todayKey}
                weekdays={weekdays}
                t={t}
                to={to}
                money={money}
              />
            ) : (
              list.loading && <PanelSkeleton />
            )}
          </div>
        )}
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} onExport={(period) => runExport({ period })} exporting={exporting} t={t} />
      <DeleteDialog
        customer={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={() => {
          toastSuccess(t('delete.done'), toDelete ? customerName(toDelete) : undefined);
          setSelected((s) => {
            const next = new Set(s);
            if (toDelete) next.delete(toDelete.id);
            return next;
          });
          setToDelete(null);
          setFocusId(null);
          reload();
        }}
        t={t}
      />
    </div>
  );
}
