'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { formatDayLabel, pageWindow, rangeOf, PAGE_SIZES, type OrderRow, type RowNote, type RowPay, type Schedule } from '../orders-model';

/** `t` from `useTranslations('orders')`, scoped to `web.*` by the caller. */
export type T = (key: string, values?: Record<string, string | number>) => string;
export type Money = (amount: number | null | undefined) => string;

export const cardClass = 'rounded-2xl border border-ar-line-soft bg-ar-surface shadow-ar';
export const outlineBtn =
  'inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-ar-line bg-ar-surface px-3.5 text-[15px] font-semibold text-ar-ink no-underline hover:bg-ar-subtle disabled:opacity-50';
export const primaryBtn =
  'inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] bg-ar-primary px-3.5 text-[15px] font-semibold text-ar-on-primary no-underline hover:opacity-95 disabled:opacity-50';

export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-lg bg-ar-subtle ${className}`} />;
}

// ----------------------------------------------------------------------------
// Pills and texts
// ----------------------------------------------------------------------------

const STATUS_CLASS: Record<string, string> = {
  RESERVED: 'bg-ar-reserved-bg text-ar-reserved',
  PICKUPED: 'bg-ar-renting-bg text-ar-renting',
  RETURNED: 'bg-ar-done-bg text-ar-done',
  COMPLETED: 'bg-ar-done-bg text-ar-done',
  CANCELLED: 'bg-ar-cancelled-bg text-ar-cancelled',
};

export function StatusTag({ status, t }: { status: string; t: T }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-[7px] px-2 py-[3px] text-sm font-bold ${STATUS_CLASS[status] || STATUS_CLASS.CANCELLED}`}>
      {t(`status.${STATUS_CLASS[status] ? status : 'CANCELLED'}`)}
    </span>
  );
}

export function NoteTag({ note, t }: { note: RowNote | null; t: T }) {
  if (!note) return null;
  const cls =
    note.kind === 'late' || note.kind === 'overduePickup'
      ? 'bg-ar-late-bg text-ar-late'
      : note.kind === 'unprepared'
        ? 'bg-ar-unprepared-bg text-ar-unprepared'
        : 'bg-ar-subtle text-ar-ink-2';
  const text = 'days' in note ? t(`note.${note.kind}`, { days: note.days }) : t(`note.${note.kind}`);
  return <span className={`inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs ${cls}`}>{text}</span>;
}

export function PayText({ pay, t, money }: { pay: RowPay | null; t: T; money: Money }) {
  if (!pay) return null;
  const cls =
    pay.kind === 'fee' || (pay.kind === 'due' && pay.urgent)
      ? 'text-ar-danger'
      : pay.kind === 'due'
        ? 'text-ar-unprepared'
        : pay.kind === 'refund'
          ? 'text-ar-renting'
          : 'text-ar-muted';
  const text = pay.kind === 'noRevenue' ? t('pay.noRevenue') : t(`pay.${pay.kind}`, { amount: money(pay.amount) });
  return <span className={`whitespace-nowrap text-sm tabular-nums ${cls}`}>{text}</span>;
}

export function scheduleText(s: Schedule | null, t: T, weekdays: string[]): string {
  if (!s) return '';
  const d = (key: string | null) => (key ? formatDayLabel(key, weekdays) : '');
  switch (s.kind) {
    case 'pickupReturn':
      if (!s.pickup) return s.ret ? t('row.returnOn', { day: d(s.ret) }) : '';
      return s.ret ? t('row.pickupReturn', { pickup: d(s.pickup), ret: d(s.ret) }) : t('row.pickupOnly', { pickup: d(s.pickup) });
    case 'return':
      return t('row.returnOn', { day: d(s.day) });
    case 'due':
      return t('row.dueOn', { day: d(s.day) });
    case 'returned':
      return t('row.returnedOn', { day: d(s.day) });
    case 'sale':
      return t('row.saleOn', { day: d(s.day) });
    case 'cancelled':
      return t('row.cancelledOn', { day: d(s.day) });
  }
}

function subline(r: OrderRow, t: T, weekdays: string[]): string {
  const extra = r.detail || (r.createdKey ? t('row.created', { day: formatDayLabel(r.createdKey, weekdays) }) : '');
  return extra ? `#${r.orderNumber} · ${extra}` : `#${r.orderNumber}`;
}

// ----------------------------------------------------------------------------
// Table
// ----------------------------------------------------------------------------

const th = 'px-2 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted';

export function OrdersTable({
  rows,
  loading,
  failed,
  onRetry,
  emptyText,
  weekdays,
  t,
  money,
  skeletonRows = 6,
  selection,
}: {
  /** Row checkboxes for "Xuất Excel" of the chosen orders (#526). */
  selection?: { ids: Set<number>; toggle: (id: number) => void; setMany: (ids: number[], on: boolean) => void };
  rows: OrderRow[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  emptyText: string;
  weekdays: string[];
  t: T;
  money: Money;
  skeletonRows?: number;
}) {
  const router = useRouter();
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
  if (rows.length === 0) {
    return <p className="m-0 px-5 py-8 text-center text-[15px] text-ar-muted">{emptyText}</p>;
  }

  const href = (r: OrderRow) => `/orders/${r.orderNumber}`;
  const allOn = !!selection && rows.length > 0 && rows.every((r) => selection.ids.has(r.id));
  const box = (r: OrderRow) =>
    selection && (
      <input
        type="checkbox"
        checked={selection.ids.has(r.id)}
        onChange={() => selection.toggle(r.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={t('select.row', { number: r.orderNumber })}
        className="h-4 w-4 cursor-pointer accent-ar-primary"
      />
    );
  return (
    <div className={loading ? 'opacity-60 transition-opacity' : undefined} aria-busy={loading || undefined}>
      {/* Wide screens: the board's table */}
      <table className="hidden w-full border-collapse text-[15px] md:table">
        <thead>
          <tr className="bg-ar-surface-muted text-left">
            {selection && (
              <th scope="col" className={`${th} w-10 pl-4`}>
                <input
                  type="checkbox"
                  checked={allOn}
                  onChange={() => selection.setMany(rows.map((r) => r.id), !allOn)}
                  aria-label={t('select.page')}
                  className="h-4 w-4 cursor-pointer accent-ar-primary"
                />
              </th>
            )}
            <th scope="col" className={`${th} w-[120px] ${selection ? 'pl-2' : 'pl-4'}`}>{t('cols.status')}</th>
            <th scope="col" className={th}>{t('cols.customer')}</th>
            <th scope="col" className={th}>{t('cols.schedule')}</th>
            <th scope="col" className={th}>{t('cols.note')}</th>
            <th scope="col" className={`${th} text-right`}>{t('cols.total')}</th>
            <th scope="col" className={`${th} pr-4 text-right`}>{t('cols.pay')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => router.push(href(r))}
              className={`cursor-pointer border-t border-ar-subtle hover:bg-ar-surface-muted ${r.cancelled ? 'opacity-[.55]' : ''}`}
            >
              {selection && <td className="py-3 pl-4 pr-1 align-middle">{box(r)}</td>}
              <td className={`py-3 pr-2 align-middle ${selection ? 'pl-2' : 'pl-4'}`}>
                <StatusTag status={r.status} t={t} />
              </td>
              <td className="px-2 py-3 align-middle">
                <Link href={href(r)} onClick={(e) => e.stopPropagation()} className="flex flex-col gap-0.5 text-inherit no-underline">
                  <span className="font-semibold text-ar-ink">{r.name || t('row.walkIn')}</span>
                  <span className="max-w-[280px] truncate text-sm tabular-nums text-ar-muted">{subline(r, t, weekdays)}</span>
                </Link>
              </td>
              <td className="whitespace-nowrap px-2 py-3 align-middle tabular-nums text-ar-ink">{scheduleText(r.schedule, t, weekdays)}</td>
              <td className="px-2 py-3 align-middle">
                <NoteTag note={r.note} t={t} />
              </td>
              <td className="px-2 py-3 text-right align-middle">
                <span className={`whitespace-nowrap font-bold tabular-nums ${r.cancelled ? 'text-ar-muted line-through' : 'text-ar-ink'}`}>{money(r.total)}</span>
              </td>
              <td className="whitespace-nowrap py-3 pl-2 pr-4 text-right align-middle">
                <PayText pay={r.pay} t={t} money={money} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phones: one card per order, same facts */}
      <ul className="m-0 list-none p-0 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className={`flex items-start border-t border-ar-subtle first:border-t-0 ${r.cancelled ? 'opacity-[.55]' : ''}`}>
            {selection && <span className="flex-none py-3.5 pl-4">{box(r)}</span>}
            <Link href={href(r)} className="flex min-w-0 flex-1 flex-col gap-1.5 px-4 py-3 text-inherit no-underline">
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold text-ar-ink">{r.name || t('row.walkIn')}</span>
                  <span className="truncate text-sm tabular-nums text-ar-muted">{subline(r, t, weekdays)}</span>
                </span>
                <StatusTag status={r.status} t={t} />
              </span>
              <span className="text-sm tabular-nums text-ar-ink-2">{scheduleText(r.schedule, t, weekdays)}</span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`font-bold tabular-nums ${r.cancelled ? 'text-ar-muted line-through' : 'text-ar-ink'}`}>{money(r.total)}</span>
                <PayText pay={r.pay} t={t} money={money} />
                <NoteTag note={r.note} t={t} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Filter menus and footer
// ----------------------------------------------------------------------------

export function FilterMenu<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: Array<{ value: V; label: string }>;
  onChange: (value: V) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value)?.label ?? '';

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1 whitespace-nowrap rounded-[10px] border border-ar-line bg-ar-surface pl-3 pr-2.5 text-sm text-ar-ink hover:bg-ar-subtle"
      >
        <span className="text-ar-muted">{label}</span> {current}
        <ShellIcon d={ICONS.chevronDown} size={16} className="text-ar-muted" />
      </button>
      {open && (
        <ul
          id={id}
          role="listbox"
          aria-label={label}
          className="absolute right-0 z-30 m-0 mt-1 min-w-[190px] list-none rounded-xl border border-ar-line-soft bg-ar-surface p-1 shadow-ar"
        >
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (o.value !== value) onChange(o.value);
                }}
                className={`flex h-9 w-full items-center rounded-lg px-3 text-left text-sm ${
                  o.value === value ? 'bg-ar-primary-soft font-semibold text-ar-primary-ink' : 'text-ar-ink hover:bg-ar-subtle'
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TableFooter({
  page,
  limit,
  total,
  totalPages,
  onPage,
  onLimit,
  t,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPage: (page: number) => void;
  onLimit: (limit: number) => void;
  t: T;
}) {
  const { from, to } = rangeOf(page, limit, total);
  const pages = pageWindow(page, Math.max(1, totalPages));
  const nav = 'flex h-9 w-9 items-center justify-center rounded-[10px] border border-ar-line-soft bg-ar-surface text-ar-ink disabled:text-ar-faint';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ar-subtle px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-ar-muted">
          {t('footer.show')}
          <select
            aria-label={t('footer.perPageLabel')}
            value={limit}
            onChange={(e) => onLimit(Number(e.target.value))}
            className="h-9 cursor-pointer rounded-[10px] border border-ar-line bg-ar-surface pl-2.5 pr-7 text-sm font-semibold text-ar-ink"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {t('footer.perPage')}
        </label>
        <span className="text-sm tabular-nums text-ar-muted">{t('footer.range', { from, to, total })}</span>
      </div>
      <nav className="flex gap-1.5" aria-label={t('footer.pages')}>
        <button type="button" aria-label={t('footer.prev')} disabled={page <= 1} onClick={() => onPage(page - 1)} className={nav}>
          <ShellIcon d={ICONS.chevronLeft} size={16} />
        </button>
        {pages.map((p, i) =>
          p === 0 ? (
            <span key={`gap-${i}`} className="flex h-9 w-6 items-center justify-center text-ar-muted" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPage(p)}
              className={`h-9 min-w-[36px] rounded-[10px] px-2 text-sm tabular-nums ${
                p === page ? 'bg-ar-ink font-semibold text-ar-page' : 'border border-ar-line-soft bg-ar-surface text-ar-ink hover:bg-ar-subtle'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" aria-label={t('footer.next')} disabled={page >= totalPages} onClick={() => onPage(page + 1)} className={nav}>
          <ShellIcon d={ICONS.chevronRight} size={16} />
        </button>
      </nav>
    </div>
  );
}
