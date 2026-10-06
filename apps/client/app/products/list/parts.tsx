'use client';

/**
 * Pieces of the Sản phẩm list (#526) on the shell tokens: product table (cards on phones),
 * row action menu, selection bar.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { Skeleton, type Money, type T } from '../../orders/list/parts';
import type { ProductRow, Selection } from './list-model';

/** Board icon for a product without a photo. */
export const PRODUCT_ICON = 'M8 3l4 3 4-3 4 4-3 3v11H7V10L4 7z';

const th = 'px-2 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted';
const checkbox = 'h-[18px] w-[18px] cursor-pointer accent-ar-primary';
const smallOutline =
  'inline-flex h-9 items-center justify-center whitespace-nowrap rounded-[10px] border border-ar-line bg-ar-surface px-3 text-sm font-semibold text-ar-ink no-underline hover:bg-ar-subtle';

export function Thumb({ row, t, size = 44 }: { row: ProductRow; t: T; size?: number }) {
  return (
    <span
      role="img"
      aria-label={t('row.image', { name: row.name })}
      style={{ width: size, height: size }}
      className="flex flex-none items-center justify-center overflow-hidden rounded-[10px] border border-ar-line bg-ar-subtle text-ar-muted"
    >
      {row.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.image} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <ShellIcon d={PRODUCT_ICON} size={18} />
      )}
    </span>
  );
}

function PriceCell({ value, money, muted }: { value: number | null; money: Money; muted?: boolean }) {
  if (value == null) return <span className="text-ar-faint">—</span>;
  return <span className={`whitespace-nowrap tabular-nums ${muted ? 'text-ar-muted' : 'text-ar-ink'}`}>{money(value)}</span>;
}

/** "Thuê theo lần": fixed price, or the hourly price of older products ("x/giờ"). */
function OnceCell({ row, money, t }: { row: ProductRow; money: Money; t: T }) {
  if (row.prices.once != null) return <PriceCell value={row.prices.once} money={money} />;
  if (row.prices.hour != null) return <span className="whitespace-nowrap tabular-nums">{t('price.perHour', { price: money(row.prices.hour) })}</span>;
  return <PriceCell value={null} money={money} />;
}

export function StockCell({ row, t }: { row: ProductRow; t: T }) {
  const s = row.stock;
  return (
    <span className="flex flex-col">
      <span className={`whitespace-nowrap text-[15px] font-semibold tabular-nums ${s.out ? 'text-ar-danger' : 'text-ar-done'}`}>
        {s.out ? t('stock.out') : t('stock.left', { available: s.available, total: s.total })}
      </span>
      {s.renting > 0 && <span className="whitespace-nowrap text-sm text-ar-muted">{t('stock.renting', { count: s.renting })}</span>}
    </span>
  );
}

// ----------------------------------------------------------------------------
// Row menu
// ----------------------------------------------------------------------------

export function RowMenu({
  row,
  canDelete,
  onDelete,
  t,
}: {
  row: ProductRow;
  canDelete: boolean;
  onDelete: (row: ProductRow) => void;
  t: T;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const item = 'flex h-9 w-full items-center rounded-lg px-3 text-left text-sm no-underline';
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('row.more', { name: row.name })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ar-muted hover:bg-ar-subtle"
      >
        <ShellIcon d={ICONS.more} size={18} />
      </button>
      {open && (
        <div id={id} role="menu" className="absolute right-0 z-30 mt-1 min-w-[220px] rounded-xl border border-ar-line-soft bg-ar-surface p-1 text-left shadow-ar">
          <Link role="menuitem" href={`/products/${row.id}`} className={`${item} text-ar-ink hover:bg-ar-subtle`}>
            {t('row.view')}
          </Link>
          <Link role="menuitem" href={`/products/${row.id}/orders`} className={`${item} text-ar-ink hover:bg-ar-subtle`}>
            {t('row.orders')}
          </Link>
          {canDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete(row);
              }}
              className={`${item} text-ar-danger hover:bg-ar-danger-soft`}
            >
              {t('row.delete')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Table
// ----------------------------------------------------------------------------

export function ProductsTable({
  rows,
  loading,
  failed,
  onRetry,
  emptyText,
  selectable,
  selection,
  pageState,
  onToggleRow,
  onTogglePage,
  canEdit,
  canDelete,
  onDelete,
  t,
  money,
  skeletonRows = 6,
}: {
  rows: ProductRow[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  emptyText: string;
  selectable: boolean;
  selection: Selection;
  pageState: 'all' | 'some' | 'none';
  onToggleRow: (id: number) => void;
  onTogglePage: () => void;
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (row: ProductRow) => void;
  t: T;
  money: Money;
  skeletonRows?: number;
}) {
  const headRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headRef.current) headRef.current.indeterminate = pageState === 'some';
  }, [pageState]);

  if (failed) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-6 text-[15px] text-ar-muted">
        <span>{t('loadFailed')}</span>
        <button type="button" onClick={onRetry} className="h-9 rounded-[10px] border border-ar-line px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle">
          {t('retry')}
        </button>
      </div>
    );
  }
  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col gap-3 px-4 py-4" aria-busy="true">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <p className="m-0 px-5 py-8 text-center text-[15px] text-ar-muted">{emptyText}</p>;

  const isSelected = (id: number) => selection.all || selection.ids.includes(id);
  const actions = (r: ProductRow) => (
    <span className="flex items-center justify-end gap-1">
      {canEdit && (
        <Link href={`/products/${r.id}/edit`} className={smallOutline}>
          {t('row.edit')}
        </Link>
      )}
      <RowMenu row={r} canDelete={canDelete} onDelete={onDelete} t={t} />
    </span>
  );

  return (
    <div className={loading ? 'opacity-60 transition-opacity' : undefined} aria-busy={loading || undefined}>
      {/* Wide screens: the board's table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] border-collapse text-[15px]">
          <thead>
            <tr className="bg-ar-surface-muted text-left">
              {selectable && (
                <th scope="col" className="w-7 py-2.5 pl-4">
                  <input ref={headRef} type="checkbox" aria-label={t('selectPage')} checked={pageState === 'all'} onChange={onTogglePage} className={checkbox} />
                </th>
              )}
              <th scope="col" className={`${th} ${selectable ? '' : 'pl-4'}`}>{t('cols.product')}</th>
              <th scope="col" className={th}>{t('cols.category')}</th>
              <th scope="col" className={`${th} text-right`}>{t('cols.once')}</th>
              <th scope="col" className={`${th} text-right`}>{t('cols.day')}</th>
              <th scope="col" className={`${th} text-right`}>{t('cols.sale')}</th>
              <th scope="col" className={th}>{t('cols.today')}</th>
              <th scope="col" className="py-2.5 pl-2 pr-4">
                <span className="sr-only">{t('cols.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t border-ar-subtle ${isSelected(r.id) ? 'bg-ar-primary-soft/40' : 'hover:bg-ar-surface-muted'}`}>
                {selectable && (
                  <td className="w-7 py-2.5 pl-4">
                    <input type="checkbox" aria-label={t('selectRow', { name: r.name })} checked={isSelected(r.id)} onChange={() => onToggleRow(r.id)} className={checkbox} />
                  </td>
                )}
                <td className={`px-2 py-2.5 ${selectable ? '' : 'pl-4'}`}>
                  <Link href={`/products/${r.id}`} className="flex items-center gap-3 text-inherit no-underline">
                    <Thumb row={r} t={t} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-semibold text-ar-ink hover:text-ar-primary-ink">{r.name}</span>
                      {r.code && <span className="text-xs tabular-nums text-ar-muted">{r.code}</span>}
                    </span>
                  </Link>
                </td>
                <td className="px-2 py-2.5 text-ar-ink-2">{r.category || '—'}</td>
                <td className="px-2 py-2.5 text-right">
                  <OnceCell row={r} money={money} t={t} />
                </td>
                <td className="px-2 py-2.5 text-right">
                  <PriceCell value={r.prices.day} money={money} />
                </td>
                <td className="px-2 py-2.5 text-right">
                  <PriceCell value={r.prices.sale} money={money} muted />
                </td>
                <td className="px-2 py-2.5">
                  <StockCell row={r} t={t} />
                </td>
                <td className="py-2.5 pl-2 pr-4 text-right">{actions(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per product, same facts */}
      <ul className="m-0 list-none p-0 md:hidden">
        {rows.map((r) => {
          const prices = [
            r.prices.once != null ? `${money(r.prices.once)} · ${t('cols.once').toLowerCase()}` : '',
            r.prices.hour != null ? t('price.perHour', { price: money(r.prices.hour) }) : '',
            r.prices.day != null ? `${money(r.prices.day)} · ${t('cols.day').toLowerCase()}` : '',
          ].filter(Boolean);
          return (
            <li key={r.id} className={`flex items-start gap-3 border-t border-ar-subtle px-4 py-3 first:border-t-0 ${isSelected(r.id) ? 'bg-ar-primary-soft/40' : ''}`}>
              {selectable && (
                <input
                  type="checkbox"
                  aria-label={t('selectRow', { name: r.name })}
                  checked={isSelected(r.id)}
                  onChange={() => onToggleRow(r.id)}
                  className={`${checkbox} mt-3 flex-none`}
                />
              )}
              <Link href={`/products/${r.id}`} className="flex min-w-0 flex-1 gap-3 text-inherit no-underline">
                <Thumb row={r} t={t} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold text-ar-ink">{r.name}</span>
                  <span className="truncate text-xs tabular-nums text-ar-muted">{[r.code, r.category].filter(Boolean).join(' · ')}</span>
                  {prices.length > 0 && <span className="text-sm tabular-nums text-ar-ink">{prices.join(' · ')}</span>}
                  {r.prices.sale != null && (
                    <span className="text-sm tabular-nums text-ar-muted">
                      {t('cols.sale')}: {money(r.prices.sale)}
                    </span>
                  )}
                  <span className="mt-0.5">
                    <StockCell row={r} t={t} />
                  </span>
                </span>
              </Link>
              <span className="flex-none">{actions(r)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Selection bar
// ----------------------------------------------------------------------------

export function SelectionBar({
  count,
  total,
  all,
  onSelectAll,
  onClear,
  canExport,
  exporting,
  onExport,
  canDelete,
  onDelete,
  t,
}: {
  count: number;
  total: number;
  all: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  canExport: boolean;
  exporting: boolean;
  onExport: () => void;
  canDelete: boolean;
  onDelete: () => void;
  t: T;
}) {
  const link = 'h-8 rounded-lg px-2 text-sm font-semibold hover:bg-ar-surface';
  return (
    <div role="region" aria-label={t('selection.region')} className="flex flex-wrap items-center gap-2.5 border-b border-ar-line bg-ar-primary-soft px-4 py-2.5">
      <span className="text-[15px] font-bold text-ar-primary-ink">{t('selection.count', { count })}</span>
      {!all && total > count && (
        <button type="button" onClick={onSelectAll} className={`${link} text-ar-primary`}>
          {t('selection.selectAll', { total })}
        </button>
      )}
      <button type="button" onClick={onClear} className={`${link} text-ar-ink-2`}>
        {t('selection.clear')}
      </button>
      <span className="flex-1" />
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-9 items-center rounded-[10px] border border-ar-line bg-ar-surface px-3.5 text-sm font-semibold text-ar-danger hover:bg-ar-danger-soft"
        >
          {t('selection.delete', { count })}
        </button>
      )}
      {canExport && (
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-ar-primary px-3.5 text-sm font-semibold text-ar-on-primary hover:opacity-95 disabled:opacity-50"
        >
          <ShellIcon d={ICONS.download} size={16} />
          {exporting ? t('exporting') : t('exportSelected', { count })}
        </button>
      )}
    </div>
  );
}
