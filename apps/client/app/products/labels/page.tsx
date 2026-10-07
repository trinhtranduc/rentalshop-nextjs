'use client';

/**
 * In tem mã vạch (#623). Pick products (search reads GET /api/products, same scope as the list), set
 * copies, preview at the label size from Cài đặt → Máy in, print through the browser dialog.
 * Products without a printable code are skipped and listed with a link to edit them. No writes.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePermissions } from '@rentalshop/hooks';
import { productsApi } from '@rentalshop/utils';
import type { ProductFilters } from '@rentalshop/types';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { cardClass, outlineBtn, primaryBtn, Skeleton, type T } from '../../orders/list/parts';
import { usePrintSettings } from '../../components/usePrintSettings';
import { settingsHref } from '../../settings/settings-model';
import { labelLayout, labelSizeText } from '../../../lib/print-settings';
import { LabelPage, LabelPrintRoot } from './LabelSheet';
import {
  buildPrintJob,
  isPicked,
  pageCheck,
  parseIdsParam,
  setCopies,
  toLabelProduct,
  toPages,
  togglePagePicks,
  togglePick,
  type LabelProduct,
  type Picks,
} from './labels-model';

const PRINTER = 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z';
const PAGE_SIZE = 20;
/** Pages drawn in the on-screen preview (the print has all of them). */
const PREVIEW_PAGES = 12;

const checkbox = 'h-[18px] w-[18px] cursor-pointer accent-ar-primary';
const smallBtn =
  'inline-flex h-8 items-center justify-center rounded-lg border border-ar-line bg-ar-surface px-2.5 text-sm font-semibold text-ar-ink hover:bg-ar-subtle disabled:opacity-40';

type ProductsData = { products?: Array<{ id: number; name?: string | null; barcode?: string | null }>; total?: number; totalPages?: number };

function useSearch(q: string, page: number) {
  const [state, setState] = useState<{ rows: LabelProduct[]; totalPages: number; loading: boolean; failed: boolean }>({
    rows: [],
    totalPages: 1,
    loading: true,
    failed: false,
  });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, failed: false }));
    productsApi
      .searchProducts({ search: q || undefined, page, limit: PAGE_SIZE, sortBy: 'name', sortOrder: 'asc' } as unknown as ProductFilters)
      .then((res) => {
        if (cancelled) return;
        if (!res.success || !res.data) throw new Error('load');
        const data = res.data as unknown as ProductsData;
        setState({ rows: (data.products || []).map(toLabelProduct), totalPages: Math.max(1, data.totalPages || 1), loading: false, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, failed: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [q, page, nonce]);
  return { ...state, retry: () => setNonce((n) => n + 1) };
}

export default function ProductLabelsPage() {
  const t = useTranslations('products.web.labels') as unknown as T;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canUpdateProducts } = usePermissions();
  const [settings] = usePrintSettings();
  const layout = useMemo(() => labelLayout(settings), [settings]);

  const [picks, setPicks] = useState<Picks>([]);

  // ?ids= (product detail, list selection): preselect those products once.
  const idsParam = searchParams.get('ids');
  const preselected = useRef(false);
  useEffect(() => {
    const ids = parseIdsParam(idsParam);
    if (preselected.current || ids.length === 0) return;
    preselected.current = true;
    Promise.all(ids.map((id) => productsApi.getProductById(id).catch(() => null))).then((list) => {
      const found = list.flatMap((res) => (res && res.success && res.data ? [toLabelProduct(res.data as unknown as { id: number; name?: string; barcode?: string })] : []));
      setPicks((cur) => found.reduce((acc, p) => (isPicked(acc, p.id) ? acc : togglePick(acc, p)), cur));
    });
  }, [idsParam]);

  // Search (typed text applies after a short pause)
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setQ(draft.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [draft]);
  const search = useSearch(q, page);

  const job = useMemo(() => buildPrintJob(picks), [picks]);
  const pages = useMemo(() => toPages(job.labels, layout.perRow), [job.labels, layout.perRow]);
  const pageState = pageCheck(picks, search.rows);
  const sizeHref = settingsHref(pathname, searchParams.toString(), 'printer');

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <Link href="/products" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-ar-muted no-underline hover:text-ar-ink">
        <ShellIcon d={ICONS.chevronLeft} size={16} />
        {t('back')}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold">{t('title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={sizeHref} scroll={false} className={outlineBtn}>
            {t('size', { size: labelSizeText(layout) })}
          </Link>
          <button type="button" onClick={() => window.print()} disabled={job.labels.length === 0} className={primaryBtn}>
            <ShellIcon d={PRINTER} size={18} />
            {job.labels.length > 0 ? t('print', { count: job.labels.length }) : t('printNone')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start">
        {/* Products */}
        <section className={`${cardClass} overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-3 border-b border-ar-subtle px-4 py-3.5">
            <label className="flex h-9 min-w-0 flex-[1_1_220px] items-center gap-2 rounded-[10px] border border-ar-line px-2.5 text-ar-muted">
              <ShellIcon d={ICONS.search} size={16} />
              <input
                type="search"
                aria-label={t('search')}
                placeholder={t('search')}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ar-ink outline-none placeholder:text-ar-faint"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ar-ink-2">
              <input
                type="checkbox"
                className={checkbox}
                checked={pageState === 'all'}
                ref={(el) => {
                  if (el) el.indeterminate = pageState === 'some';
                }}
                disabled={search.rows.length === 0}
                onChange={() => setPicks((cur) => togglePagePicks(cur, search.rows))}
              />
              {t('selectPage')}
            </label>
          </div>
          {search.failed ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-6 text-sm text-ar-muted">
              {t('loadFailed')}
              <button type="button" onClick={search.retry} className={smallBtn}>
                {t('retry')}
              </button>
            </div>
          ) : search.loading && search.rows.length === 0 ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : search.rows.length === 0 ? (
            <p className="m-0 px-4 py-8 text-center text-sm text-ar-muted">{t('empty')}</p>
          ) : (
            <ul className={`m-0 list-none p-0 ${search.loading ? 'opacity-60' : ''}`}>
              {search.rows.map((p) => (
                <li key={p.id} className="border-b border-ar-subtle last:border-b-0">
                  <label className="flex min-h-[52px] cursor-pointer items-center gap-3 px-4 py-2 hover:bg-ar-subtle">
                    <input type="checkbox" className={checkbox} checked={isPicked(picks, p.id)} onChange={() => setPicks((cur) => togglePick(cur, p))} />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{p.name}</span>
                    {p.barcode ? (
                      <span className="max-w-[45%] truncate font-mono text-sm tabular-nums text-ar-muted">{p.barcode}</span>
                    ) : (
                      <span className="text-sm text-ar-faint">{t('noCode')}</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {search.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t border-ar-subtle px-4 py-3">
              <span className="text-sm tabular-nums text-ar-muted">{t('page', { page, total: search.totalPages })}</span>
              <button type="button" aria-label={t('prev')} disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`${smallBtn} w-8 px-0`}>
                <ShellIcon d={ICONS.chevronLeft} size={16} />
              </button>
              <button
                type="button"
                aria-label={t('next')}
                disabled={page >= search.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={`${smallBtn} w-8 px-0`}
              >
                <ShellIcon d={ICONS.chevronRight} size={16} />
              </button>
            </div>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Picked products and copies */}
          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 border-b border-ar-subtle px-4 py-3">
              <h2 className="m-0 text-base font-bold">{t('picked', { count: picks.length })}</h2>
              {picks.length > 0 && (
                <button type="button" onClick={() => setPicks([])} className="h-8 rounded-lg px-2 text-sm font-semibold text-ar-ink-2 hover:bg-ar-subtle">
                  {t('clear')}
                </button>
              )}
            </div>
            {picks.length === 0 ? (
              <p className="m-0 px-4 py-6 text-sm text-ar-muted">{t('pickHint')}</p>
            ) : (
              <ul className="m-0 max-h-[320px] list-none overflow-y-auto p-0">
                {picks.map(({ product: p, copies }) => (
                  <li key={p.id} className="flex items-center gap-3 border-b border-ar-subtle px-4 py-2 last:border-b-0">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{p.name}</span>
                      <span className={`truncate font-mono text-xs ${p.barcode ? 'text-ar-muted' : 'text-ar-danger'}`}>{p.barcode || t('noCode')}</span>
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={99}
                      aria-label={t('copiesFor', { name: p.name })}
                      value={copies}
                      onChange={(e) => setPicks((cur) => setCopies(cur, p.id, e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="h-9 w-16 rounded-[10px] border border-ar-line-strong bg-ar-surface px-2 text-center text-sm tabular-nums text-ar-ink focus:border-ar-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label={t('remove', { name: p.name })}
                      onClick={() => setPicks((cur) => togglePick(cur, p))}
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-ar-muted hover:bg-ar-subtle"
                    >
                      <ShellIcon d={ICONS.close} size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {job.skipped.length > 0 && (
            <section role="status" className="rounded-2xl border border-ar-line bg-ar-surface-muted px-4 py-3 text-sm">
              <p className="m-0 font-semibold text-ar-ink">{t('skipped', { count: job.skipped.length })}</p>
              <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
                {job.skipped.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-ar-ink-2">
                      {s.name}
                      {s.reason === 'invalid' && <span className="text-ar-muted"> · {t('invalidCode')}</span>}
                    </span>
                    {canUpdateProducts && (
                      <Link href={`/products/${s.id}/edit`} className="flex-none font-semibold text-ar-primary no-underline hover:underline">
                        {t('edit')}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Preview at real size */}
          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 border-b border-ar-subtle px-4 py-3">
              <h2 className="m-0 text-base font-bold">{t('preview')}</h2>
              <span className="text-sm tabular-nums text-ar-muted">{t('labelCount', { count: job.labels.length })}</span>
            </div>
            <div className="flex max-h-[560px] flex-col items-center gap-3 overflow-auto bg-ar-subtle px-4 py-5">
              {pages.length === 0 ? (
                <p className="m-0 py-6 text-sm text-ar-muted">{t('previewEmpty')}</p>
              ) : (
                <>
                  {pages.slice(0, PREVIEW_PAGES).map((pg) => (
                    <div key={pg[0].key} className="flex-none rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.14),0_6px_16px_rgba(0,0,0,0.08)]">
                      <LabelPage labels={pg} layout={layout} />
                    </div>
                  ))}
                  {pages.length > PREVIEW_PAGES && (
                    <p className="m-0 text-sm text-ar-muted">{t('previewMore', { count: job.labels.length - PREVIEW_PAGES * layout.perRow })}</p>
                  )}
                </>
              )}
            </div>
            <p className="m-0 border-t border-ar-subtle px-4 py-3 text-xs text-ar-muted">{t('printHint')}</p>
          </section>
        </div>
      </div>

      <LabelPrintRoot labels={job.labels} layout={layout} />
    </div>
  );
}

