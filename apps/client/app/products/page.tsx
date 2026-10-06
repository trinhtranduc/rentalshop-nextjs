'use client';

/**
 * Sản phẩm (#526). Reads GET /api/products (one page) and GET /api/categories (chips with counts).
 * Row mapping and selection live in ./list/list-model (unit-tested). Every filter is kept in the URL.
 * Add / edit / detail are their own pages (/products/add, /products/[id]/edit, /products/[id]).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ImageSearchDialog, useFormatCurrency, useToast } from '@rentalshop/ui';
import { useAuth, useCanExportData, useOutletsData, usePermissions } from '@rentalshop/hooks';
import { categoriesApi, formatDateKeyInTimeZone, productsApi, SHOP_TIMEZONE } from '@rentalshop/utils';
import type { Product, ProductFilters } from '@rentalshop/types';
import { ICONS, ShellIcon } from '../components/shell/Icon';
import { FilterMenu, TableFooter, cardClass, outlineBtn, primaryBtn, type T } from '../orders/list/parts';
import { Modal } from '../orders/create/parts';
import { ProductsTable, SelectionBar } from './list/parts';
import {
  EMPTY_SELECTION,
  SORT_KEYS,
  buildRow,
  filterKey,
  pageCheckState,
  parseListQuery,
  scopedOutletFor,
  selectedCount,
  toApiFilters,
  toggleOne,
  togglePage,
  type ProductLike,
  type ProductRow,
  type Selection,
  type SortKey,
} from './list/list-model';

/** Board icon paths that the shell icon set does not have. */
const UPLOAD_ICON = 'M12 20V9M7 14l5-5 5 5M5 4h14';
const CAMERA_ICON = 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z';

/** Most ids the export / delete of "all matching" collects (API page cap). */
const MAX_COLLECT = 3000;

interface ListState {
  products: ProductLike[];
  total: number;
  totalPages: number;
  loading: boolean;
  failed: boolean;
}

type ProductsData = { products?: ProductLike[]; total?: number; totalPages?: number };

function useProductsPage(filters: ProductFilters, nonce: number): ListState {
  const [state, setState] = useState<ListState>({ products: [], total: 0, totalPages: 1, loading: true, failed: false });
  const key = JSON.stringify(filters);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, failed: false }));
    productsApi
      .searchProducts(JSON.parse(key) as ProductFilters)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          const data = res.data as unknown as ProductsData;
          setState({ products: data.products || [], total: data.total || 0, totalPages: Math.max(1, data.totalPages || 1), loading: false, failed: false });
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

/** Categories with their product counts (search mode of GET /api/categories returns `_count`). */
function useCategoryChips(nonce: number) {
  const [state, setState] = useState<{ list: Array<{ id: number; name: string; count: number | null }>; total: number | null }>({ list: [], total: null });
  useEffect(() => {
    let cancelled = false;
    categoriesApi
      .getCategoriesPaginated(1, 100)
      .then((res) => {
        if (cancelled || !res.success || !res.data) return;
        const data = res.data as unknown as { categories?: Array<{ id: number; name: string; _count?: { products?: number } }>; total?: number };
        const list = (data.categories || []).map((c) => ({ id: c.id, name: c.name, count: typeof c._count?.products === 'number' ? c._count.products : null }));
        setState({ list, total: typeof data.total === 'number' ? data.total : list.length });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [nonce]);
  return state;
}

/**
 * Products in the shop (no filters), for the "Tất cả sản phẩm · N" tab: the list total when the list is
 * unfiltered, else one `limit=1` request (refreshed after deletes).
 */
function useCatalogTotal(filtered: boolean, unfilteredTotal: number | null, nonce: number): number | null {
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    if (unfilteredTotal !== null) setTotal(unfilteredTotal);
  }, [unfilteredTotal]);
  useEffect(() => {
    if (!filtered) return;
    let cancelled = false;
    productsApi
      .searchProducts({ page: 1, limit: 1 } as ProductFilters)
      .then((res) => {
        if (!cancelled && res.success && res.data) setTotal((res.data as unknown as ProductsData).total ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [filtered, nonce]);
  return total;
}

function saveBlob(blob: Blob, name: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function ProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('products.web') as unknown as T;
  const money = useFormatCurrency();
  const { toastSuccess, toastError } = useToast();
  const { user } = useAuth();
  const canExport = useCanExportData();
  const { canManageProducts, canCreateProducts, canUpdateProducts } = usePermissions();
  const { outlets } = useOutletsData();

  const query = useMemo(() => parseListQuery((k) => searchParams.get(k)), [searchParams]);
  const fkey = filterKey(query);

  const update = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === '') params.delete(k);
        else params.set(k, String(v));
      }
      if (!('page' in patch)) params.delete('page');
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Data
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const apiFilters = useMemo(() => toApiFilters(query) as unknown as ProductFilters, [query]);
  const list = useProductsPage(apiFilters, nonce);
  const categories = useCategoryChips(nonce);
  const unfiltered = !query.q && !query.categoryId;
  const catalogTotal = useCatalogTotal(!unfiltered, unfiltered && !list.loading && !list.failed ? list.total : null, nonce);

  // Photo search results replace the list until cleared
  const [imageOpen, setImageOpen] = useState(false);
  const [imageResults, setImageResults] = useState<ProductLike[] | null>(null);

  const typedUser = user as unknown as { role?: string; outletId?: number; outlet?: { id?: number } } | null;
  const scopedOutlet = scopedOutletFor(query.outletId, typedUser ? { role: typedUser.role, outletId: typedUser.outletId ?? typedUser.outlet?.id } : null);
  const source = imageResults ?? list.products;
  const rows: ProductRow[] = useMemo(() => source.map((p) => buildRow(p, scopedOutlet)), [source, scopedOutlet]);
  const total = imageResults ? imageResults.length : list.total;

  // A page past the end goes back to the last one
  useEffect(() => {
    if (!imageResults && !list.loading && !list.failed && query.page > list.totalPages) update({ page: list.totalPages > 1 ? list.totalPages : null });
  }, [imageResults, list.loading, list.failed, list.totalPages, query.page, update]);

  // Search box: typed text goes to the URL after a short pause
  // (the box follows the URL only when the URL changed from elsewhere, so typing is never overwritten)
  const [draft, setDraft] = useState(query.q);
  const pushedQ = useRef(query.q);
  useEffect(() => {
    if (query.q !== pushedQ.current) {
      pushedQ.current = query.q;
      setDraft(query.q);
    }
  }, [query.q]);
  const pushQ = useCallback(
    (value: string) => {
      pushedQ.current = value;
      update({ q: value || null });
    },
    [update],
  );
  useEffect(() => {
    if (draft.trim() === pushedQ.current) return;
    const id = window.setTimeout(() => pushQ(draft.trim()), 350);
    return () => window.clearTimeout(id);
  }, [draft, pushQ]);

  // Selection (cleared when the filters change)
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  useEffect(() => setSelection(EMPTY_SELECTION), [fkey, imageResults]);
  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const selCount = selectedCount(selection, total);
  const selectable = canExport || canManageProducts;

  /** Ids for "all matching" (export / delete without picking rows). */
  const collectIds = useCallback(async (): Promise<number[]> => {
    if (imageResults) return imageResults.map((p) => p.id);
    const res = await productsApi.searchProducts({ ...apiFilters, page: 1, limit: MAX_COLLECT } as ProductFilters);
    if (!res.success || !res.data) throw new Error('collect');
    return ((res.data as unknown as ProductsData).products || []).map((p) => p.id);
  }, [apiFilters, imageResults]);

  const [exporting, setExporting] = useState(false);
  const exportExcel = async (useSelection: boolean) => {
    setExporting(true);
    try {
      const productIds = useSelection && !selection.all ? selection.ids : await collectIds();
      if (productIds.length === 0) return;
      // Ids travel in the query string: one file per 600 so the URL stays well under server header limits
      const day = formatDateKeyInTimeZone(new Date(), SHOP_TIMEZONE);
      const parts: number[][] = [];
      for (let i = 0; i < productIds.length; i += 600) parts.push(productIds.slice(i, i + 600));
      for (let i = 0; i < parts.length; i++) {
        const blob = await productsApi.exportProducts({ format: 'excel', productIds: parts[i] });
        saveBlob(blob, parts.length > 1 ? `san-pham-${day}-${i + 1}.xlsx` : `san-pham-${day}.xlsx`);
      }
      toastSuccess(t('exportDone'));
    } catch {
      toastError(t('exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  // Delete: one row from its menu, or the selection
  const [confirm, setConfirm] = useState<{ kind: 'one'; row: ProductRow } | { kind: 'many' } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const runDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.kind === 'one') {
        const res = await productsApi.deleteProduct(confirm.row.id);
        if (!res.success) throw new Error('delete');
        toastSuccess(t('delete.done', { count: 1 }));
      } else {
        const ids = selection.all ? await collectIds() : selection.ids;
        const res = await productsApi.batchDeleteProducts(ids);
        if (!res.success || !res.data) throw new Error('delete');
        const { deleted, failed } = res.data;
        if (deleted === 0) throw new Error('delete');
        if (failed > 0) toastError(t('delete.partial', { deleted, failed }));
        else toastSuccess(t('delete.done', { count: deleted }));
        setSelection(EMPTY_SELECTION);
      }
      setConfirm(null);
      if (imageResults) setImageResults(null);
      reload();
    } catch {
      toastError(t('delete.failed'));
    } finally {
      setDeleting(false);
    }
  };

  // Image search index sync (was the "Sync image search" menu item)
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [moreOpen]);
  const [syncing, setSyncing] = useState(false);
  const syncImages = async () => {
    setMoreOpen(false);
    setSyncing(true);
    try {
      const res = await productsApi.syncEmbeddings();
      if (!res.success || !res.data) throw new Error('sync');
      const queued = res.data.queued;
      toastSuccess(queued === 0 ? t('sync.indexed') : t('sync.queued', { count: queued }));
    } catch {
      toastError(t('sync.failed'));
    } finally {
      setSyncing(false);
    }
  };

  const role = typedUser?.role;
  const showOutletFilter = (role === 'MERCHANT' || role === 'ADMIN') && outlets.length > 1;
  const chip = (active: boolean) =>
    `h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-sm ${active ? 'bg-ar-ink font-semibold text-ar-page' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'}`;

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold text-ar-ink">{t('title')}</h1>
        <div className="flex flex-wrap gap-2">
          {canExport && (
            <button type="button" onClick={() => exportExcel(false)} disabled={exporting || total === 0} className={outlineBtn}>
              <ShellIcon d={ICONS.download} size={18} />
              {exporting ? t('exporting') : t('export')}
            </button>
          )}
          {canManageProducts && (
            <Link href="/products/import" className={outlineBtn}>
              <ShellIcon d={UPLOAD_ICON} size={18} />
              {t('importExcel')}
            </Link>
          )}
          {canCreateProducts && (
            <Link href="/products/add" className={primaryBtn}>
              <ShellIcon d={ICONS.plus} size={18} />
              {t('add')}
            </Link>
          )}
          {canManageProducts && (
            <div ref={moreRef} className="relative">
              <button
                type="button"
                aria-label={t('more.label')}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((o) => !o)}
                className={`${outlineBtn} w-10 px-0`}
              >
                <ShellIcon d={ICONS.more} size={18} />
              </button>
              {moreOpen && (
                <div role="menu" className="absolute right-0 z-30 mt-1 min-w-[220px] rounded-xl border border-ar-line-soft bg-ar-surface p-1 shadow-ar">
                  <button type="button" role="menuitem" disabled={syncing} onClick={syncImages} className="flex h-9 w-full items-center rounded-lg px-3 text-left text-sm text-ar-ink hover:bg-ar-subtle disabled:opacity-50">
                    {syncing ? t('more.syncing') : t('more.syncImages')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div role="tablist" aria-label={t('tabs.label')} className="flex gap-6 overflow-x-auto border-b border-ar-line">
        <span role="tab" aria-selected="true" className="-mb-px flex h-11 shrink-0 items-center border-b-2 border-ar-primary text-[15px] font-bold text-ar-ink">
          {t('tabs.all')}
          {catalogTotal !== null && <span className="font-normal tabular-nums text-ar-muted">&nbsp;· {catalogTotal}</span>}
        </span>
        <Link
          role="tab"
          aria-selected="false"
          href="/categories"
          className="-mb-px flex h-11 shrink-0 items-center border-b-2 border-transparent text-[15px] font-medium text-ar-ink-2 no-underline hover:text-ar-ink"
        >
          {t('tabs.categories')}
          {categories.total !== null && <span className="tabular-nums">&nbsp;· {categories.total}</span>}
        </Link>
      </div>

      <section className={`${cardClass} overflow-hidden`}>
        {selectable && selCount > 0 && (
          <SelectionBar
            count={selCount}
            total={total}
            all={selection.all}
            onSelectAll={() => setSelection({ ids: pageIds, all: true })}
            onClear={() => setSelection(EMPTY_SELECTION)}
            canExport={canExport}
            exporting={exporting}
            onExport={() => exportExcel(true)}
            canDelete={canManageProducts}
            onDelete={() => setConfirm({ kind: 'many' })}
            t={t}
          />
        )}

        <div className="flex flex-wrap items-center gap-2 border-b border-ar-subtle px-4 py-3.5">
          <label className="flex h-9 min-w-0 flex-[1_1_220px] items-center gap-2 rounded-[10px] border border-ar-line px-2.5 text-ar-muted sm:max-w-[300px]">
            <ShellIcon d={ICONS.search} size={16} />
            <input
              type="search"
              aria-label={t('search.label')}
              placeholder={t('search.placeholder')}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') pushQ(draft.trim());
              }}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ar-ink outline-none placeholder:text-ar-faint"
            />
          </label>
          <button type="button" onClick={() => setImageOpen(true)} className="flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border border-ar-line bg-ar-surface px-3 text-sm text-ar-ink hover:bg-ar-subtle">
            <ShellIcon d={CAMERA_ICON} size={16} />
            {t('imageSearch.open')}
          </button>
          <div role="group" aria-label={t('category.label')} className="flex min-w-0 max-w-full flex-1 gap-2 overflow-x-auto">
            <button type="button" aria-pressed={!query.categoryId} onClick={() => update({ category: null })} className={chip(!query.categoryId)}>
              {t('category.all')}
            </button>
            {categories.list.map((c) => {
              const active = query.categoryId === c.id;
              return (
                <button key={c.id} type="button" aria-pressed={active} onClick={() => update({ category: active ? null : c.id })} className={chip(active)}>
                  {c.name}
                  {c.count !== null && <span className={`ml-1 tabular-nums ${active ? 'opacity-80' : 'text-ar-muted'}`}>{c.count}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {showOutletFilter && (
              <FilterMenu<string>
                label={t('outlet.label')}
                value={query.outletId ? String(query.outletId) : 'all'}
                options={[{ value: 'all', label: t('outlet.all') }, ...(outlets as Array<{ id: number; name: string }>).map((o) => ({ value: String(o.id), label: o.name }))]}
                onChange={(v) => update({ outlet: v === 'all' ? null : v })}
              />
            )}
            <FilterMenu<SortKey>
              label={t('sort.label')}
              value={query.sort}
              options={SORT_KEYS.map((v) => ({ value: v, label: t(`sort.${v}`) }))}
              onChange={(v) => update({ sort: v === 'name' ? null : v })}
            />
          </div>
        </div>

        {imageResults && (
          <div className="flex border-b border-ar-subtle px-4 py-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-ar-primary-soft py-1 pl-3 pr-1 text-sm font-semibold text-ar-primary-ink">
              {t('imageSearch.result', { count: imageResults.length })}
              <button
                type="button"
                aria-label={t('imageSearch.clear')}
                onClick={() => setImageResults(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-ar-surface"
              >
                <ShellIcon d={ICONS.close} size={14} />
              </button>
            </span>
          </div>
        )}

        <ProductsTable
          rows={rows}
          loading={!imageResults && list.loading}
          failed={!imageResults && list.failed}
          onRetry={reload}
          emptyText={unfiltered && !imageResults ? t('empty') : t('emptyFiltered')}
          selectable={selectable}
          selection={selection}
          pageState={pageCheckState(selection, pageIds)}
          onToggleRow={(id) => setSelection((s) => toggleOne(s, id, pageIds))}
          onTogglePage={() => setSelection((s) => togglePage(s, pageIds))}
          canEdit={canUpdateProducts}
          canDelete={canManageProducts}
          onDelete={(row) => setConfirm({ kind: 'one', row })}
          t={t}
          money={money}
          skeletonRows={Math.min(query.limit, 10)}
        />

        {!imageResults && list.total > 0 && (
          <TableFooter
            page={Math.min(query.page, list.totalPages)}
            limit={query.limit}
            total={list.total}
            totalPages={list.totalPages}
            onPage={(p) => update({ page: p > 1 ? p : null })}
            onLimit={(n) => update({ limit: n === 10 ? null : n })}
            t={t}
          />
        )}
      </section>

      <Modal
        open={!!confirm}
        title={t('delete.title')}
        onClose={() => !deleting && setConfirm(null)}
        closeLabel={t('close')}
        footer={
          <>
            <button type="button" onClick={() => setConfirm(null)} disabled={deleting} className={outlineBtn}>
              {t('delete.cancel')}
            </button>
            <button
              type="button"
              onClick={runDelete}
              disabled={deleting}
              className="inline-flex h-10 items-center rounded-[10px] bg-ar-danger px-4 text-[15px] font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {deleting ? t('delete.deleting') : t('delete.confirm')}
            </button>
          </>
        }
      >
        <p className="m-0 text-[15px] text-ar-ink">
          {confirm?.kind === 'one' ? t('delete.one', { name: confirm.row.name }) : t('delete.many', { count: selCount })}
        </p>
      </Modal>

      {imageOpen && (
        <ImageSearchDialog
          open={imageOpen}
          onOpenChange={setImageOpen}
          categoryId={query.categoryId}
          onSearchResult={(products: Product[]) => setImageResults(products as unknown as ProductLike[])}
          onViewProduct={(p: Product) => router.push(`/products/${p.id}`)}
          onEditProduct={canUpdateProducts ? (p: Product) => router.push(`/products/${p.id}/edit`) : undefined}
        />
      )}
    </div>
  );
}
