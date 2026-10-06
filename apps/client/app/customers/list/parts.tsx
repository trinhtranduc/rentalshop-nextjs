'use client';

/** #526 Khách hàng: table / cards, selection bar, detail panel and the export dialog, on `ar-*` tokens. */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { customersApi, getLocalDateKey, ordersApi } from '@rentalshop/utils';
import type { OrderFilters } from '@rentalshop/types';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { Skeleton, StatusTag, scheduleText, outlineBtn, primaryBtn, type Money, type T } from '../../orders/list/parts';
import { Modal } from '../../orders/create/parts';
import { buildOrderRow, formatDayLabel, type OrderRowLike } from '../../orders/orders-model';
import {
  EXPORT_PERIODS,
  addressLine,
  customerName,
  dayText,
  formatPhone,
  initials,
  summaryOf,
  type CustomerRowLike,
  type CustomerSummary,
  type ExportPeriod,
  type PageSelection,
} from '../customers-model';

export type { T, Money };

const th = 'px-2 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted';
const check = 'h-[18px] w-[18px] cursor-pointer accent-[rgb(var(--ar-primary))]';
const linkBtn = 'h-8 rounded-lg px-2 text-sm font-semibold hover:bg-ar-surface';

export const WIDE_QUERY = '(min-width: 1024px)';

/** True on screens wide enough for the detail panel next to the list. */
export function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

function Checkbox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className={check}
    />
  );
}

// ----------------------------------------------------------------------------
// Selection bar
// ----------------------------------------------------------------------------

export function SelectionBar({
  count,
  total,
  canAll,
  allLoading,
  onAll,
  onClear,
  onExport,
  exporting,
  canExport,
  t,
}: {
  count: number;
  total: number;
  canAll: boolean;
  allLoading: boolean;
  onAll: () => void;
  onClear: () => void;
  onExport: () => void;
  exporting: boolean;
  canExport: boolean;
  t: T;
}) {
  return (
    <div role="region" aria-label={t('selection.label')} className="flex flex-wrap items-center gap-2.5 border-b border-ar-primary/30 bg-ar-primary-soft px-4 py-2.5">
      <span className="text-[15px] font-bold text-ar-primary-ink">{t('selection.count', { count })}</span>
      {canAll && (
        <button type="button" onClick={onAll} disabled={allLoading} className={`${linkBtn} text-ar-primary-ink disabled:opacity-50`}>
          {t('selection.all', { total })}
        </button>
      )}
      <button type="button" onClick={onClear} className={`${linkBtn} text-ar-ink-2`}>
        {t('selection.clear')}
      </button>
      <span className="flex-1" />
      {canExport && (
        <button type="button" onClick={onExport} disabled={exporting} className={`${primaryBtn} h-9 text-sm`}>
          <ShellIcon d={ICONS.download} size={16} />
          {exporting ? t('exporting') : t('exportCount', { count })}
        </button>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Table and cards
// ----------------------------------------------------------------------------

export function CustomersTable({
  rows,
  loading,
  failed,
  onRetry,
  emptyText,
  selected,
  pageState,
  onTogglePage,
  onToggle,
  focusId,
  onOpen,
  todayKeyOf,
  t,
  skeletonRows,
}: {
  rows: CustomerRowLike[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  emptyText: string;
  selected: ReadonlySet<number>;
  pageState: PageSelection;
  onTogglePage: () => void;
  onToggle: (id: number) => void;
  focusId: number | null;
  /** Row click: the panel on wide screens; returns false to let the link open the page. */
  onOpen: (id: number) => boolean;
  todayKeyOf: (iso: string) => string;
  t: T;
  skeletonRows: number;
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
  if (rows.length === 0) return <p className="m-0 px-5 py-8 text-center text-[15px] text-ar-muted">{emptyText}</p>;

  const href = (c: CustomerRowLike) => `/customers/${c.id}`;
  const nameOf = (c: CustomerRowLike) => customerName(c) || t('noName');
  const created = (c: CustomerRowLike) => {
    if (!c.createdAt) return '';
    const iso = c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt);
    return dayText(todayKeyOf(iso));
  };
  const open = (c: CustomerRowLike) => {
    if (!onOpen(c.id)) router.push(href(c));
  };

  return (
    <div className={loading ? 'opacity-60 transition-opacity' : undefined} aria-busy={loading || undefined}>
      <table className="hidden w-full border-collapse text-[15px] md:table">
        <thead>
          <tr className="bg-ar-surface-muted text-left">
            <th scope="col" className="w-[28px] py-2.5 pl-4">
              <Checkbox checked={pageState === 'all'} indeterminate={pageState === 'some'} onChange={onTogglePage} label={t('selection.page')} />
            </th>
            <th scope="col" className={th}>{t('cols.customer')}</th>
            <th scope="col" className={`${th} text-right`}>{t('cols.orders')}</th>
            <th scope="col" className={`${th} hidden xl:table-cell`}>{t('cols.address')}</th>
            <th scope="col" className={`${th} pr-4`}>{t('cols.created')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const on = selected.has(c.id);
            const focused = focusId === c.id;
            return (
              <tr
                key={c.id}
                onClick={() => open(c)}
                aria-current={focused ? 'true' : undefined}
                className={`cursor-pointer border-t border-ar-subtle ${focused ? 'bg-ar-primary-soft' : on ? 'bg-ar-primary-soft/50' : 'hover:bg-ar-surface-muted'}`}
              >
                <td className="w-[28px] py-2.5 pl-4">
                  <Checkbox checked={on} onChange={() => onToggle(c.id)} label={t('selection.one', { name: nameOf(c) })} />
                </td>
                <td className="px-2 py-2.5">
                  <Link
                    href={href(c)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && onOpen(c.id)) e.preventDefault();
                    }}
                    className="flex flex-col gap-0.5 text-inherit no-underline"
                  >
                    <span className={`font-semibold ${customerName(c) ? 'text-ar-ink' : 'text-ar-muted'}`}>{nameOf(c)}</span>
                    {c.phone && <span className="text-sm tabular-nums text-ar-muted">{formatPhone(c.phone)}</span>}
                  </Link>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">{c.orderCount ?? 0}</td>
                <td className="hidden max-w-[260px] truncate px-2 py-2.5 text-sm text-ar-ink-2 xl:table-cell">{addressLine(c)}</td>
                <td className="whitespace-nowrap py-2.5 pl-2 pr-4 text-sm tabular-nums text-ar-ink-2">{created(c)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Phones: one card per customer, opening the customer page */}
      <ul className="m-0 list-none p-0 md:hidden">
        {rows.map((c) => (
          <li key={c.id} className={`flex items-start gap-3 border-t border-ar-subtle px-4 py-3 first:border-t-0 ${selected.has(c.id) ? 'bg-ar-primary-soft/50' : ''}`}>
            <span className="pt-0.5">
              <Checkbox checked={selected.has(c.id)} onChange={() => onToggle(c.id)} label={t('selection.one', { name: nameOf(c) })} />
            </span>
            <Link href={href(c)} className="flex min-w-0 flex-1 flex-col gap-0.5 text-inherit no-underline">
              <span className="flex items-baseline justify-between gap-3">
                <span className={`truncate font-semibold ${customerName(c) ? 'text-ar-ink' : 'text-ar-muted'}`}>{nameOf(c)}</span>
                <span className="shrink-0 text-sm tabular-nums text-ar-muted">
                  {c.orderCount ?? 0} {t('cols.orders').toLowerCase()}
                </span>
              </span>
              {c.phone && <span className="text-sm tabular-nums text-ar-muted">{formatPhone(c.phone)}</span>}
              {addressLine(c) && <span className="truncate text-sm text-ar-ink-2">{addressLine(c)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Detail panel
// ----------------------------------------------------------------------------

interface PanelData {
  loading: boolean;
  failed: boolean;
  orders: OrderRowLike[];
  summary: CustomerSummary;
}

function useCustomerOrders(id: number | null, nonce: number): PanelData {
  const [state, setState] = useState<PanelData>({ loading: !!id, failed: false, orders: [], summary: { orders: null, spent: null, renting: null } });
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState({ loading: true, failed: false, orders: [], summary: { orders: null, spent: null, renting: null } });
    Promise.all([
      ordersApi.getOrdersByCustomer(id, 1, 5).catch(() => null),
      ordersApi
        .searchOrders({ customerId: id, status: 'PICKUPED' as OrderFilters['status'], page: 1, limit: 1 })
        .then((r) => (r.success && r.data ? ((r.data as { total?: number }).total ?? null) : null))
        .catch(() => null),
    ]).then(([res, renting]) => {
      if (cancelled) return;
      if (res && res.success && res.data) {
        const data = res.data as unknown as { orders?: OrderRowLike[]; total?: number; summary?: { totalOrders?: number; totalAmount?: number } };
        setState({ loading: false, failed: false, orders: data.orders || [], summary: summaryOf(data, renting) });
      } else setState({ loading: false, failed: true, orders: [], summary: summaryOf(null, renting) });
    });
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);
  return state;
}

export function CustomerPanel({
  customer,
  canDelete,
  onDelete,
  todayKey,
  weekdays,
  t,
  to,
  money,
}: {
  customer: CustomerRowLike;
  canDelete: boolean;
  onDelete: () => void;
  todayKey: string;
  weekdays: string[];
  t: T;
  /** `orders.web` messages, for the order status and schedule. */
  to: T;
  money: Money;
}) {
  const data = useCustomerOrders(customer.id, 0);
  const name = customerName(customer) || t('noName');
  const sub = [formatPhone(customer.phone), addressLine(customer)].filter(Boolean).join(' · ');
  const stat = (label: string, value: string | number | null) => (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-ar-surface-muted px-3 py-2.5">
      <span className="text-sm text-ar-muted">{label}</span>
      {data.loading ? (
        <Skeleton className="mt-1 h-5 w-14" />
      ) : (
        <span className="truncate text-lg font-bold tabular-nums">{value === null ? '—' : value}</span>
      )}
    </div>
  );

  return (
    <section aria-label={t('detail.label')} className="overflow-hidden rounded-2xl border border-ar-line-soft bg-ar-surface shadow-ar">
      <div className="flex flex-col gap-3.5 px-5 pb-4 pt-[18px]">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-ar-renting-bg text-[17px] font-bold text-ar-renting">
            {initials(customerName(customer) || customer.phone || '?')}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <Link href={`/customers/${customer.id}`} className="truncate text-xl font-bold text-ar-ink no-underline hover:underline">
              {name}
            </Link>
            {sub && <span className="truncate text-sm tabular-nums text-ar-muted">{sub}</span>}
          </span>
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              aria-label={t('detail.call', { name })}
              className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] border border-ar-line text-ar-ink hover:bg-ar-subtle"
            >
              <ShellIcon d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" size={18} />
            </a>
          )}
          <Link href={`/customers/${customer.id}/edit`} className={`${outlineBtn} flex-none px-3 text-sm`}>
            {t('detail.edit')}
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stat(t('detail.orders'), data.summary.orders)}
          {stat(t('detail.spent'), data.summary.spent === null ? null : money(data.summary.spent))}
          {stat(t('detail.renting'), data.summary.renting)}
        </div>
        <span className="text-sm text-ar-muted">{t('detail.spentNote')}</span>
      </div>
      <div className="border-t border-ar-subtle bg-ar-surface-muted px-5 pb-1.5 pt-2.5">
        <span className="text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">{t('detail.ordersTitle')}</span>
      </div>
      {data.loading ? (
        <div className="flex flex-col gap-3 px-5 py-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : data.failed ? (
        <p className="m-0 px-5 py-4 text-sm text-ar-muted">{t('detail.ordersFailed')}</p>
      ) : data.orders.length === 0 ? (
        <p className="m-0 px-5 py-4 text-sm text-ar-muted">{t('detail.noOrders')}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {data.orders.map((o) => {
            const r = buildOrderRow(o, todayKey, getLocalDateKey);
            const created = r.createdKey ? to('row.created', { day: formatDayLabel(r.createdKey, weekdays) }) : '';
            return (
              <li key={o.id} className={r.cancelled ? 'opacity-[.55]' : undefined}>
                <Link href={`/orders/${o.orderNumber}`} className="flex items-center gap-3 border-t border-ar-subtle px-5 py-3 text-inherit no-underline hover:bg-ar-surface-muted">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <StatusTag status={r.status} t={to} />
                      <span className="text-sm tabular-nums text-ar-muted">
                        #{o.orderNumber}
                        {created && ` · ${created}`}
                      </span>
                    </span>
                    <span className="text-[15px] font-medium tabular-nums">{scheduleText(r.schedule, to, weekdays)}</span>
                  </span>
                  <span className={`whitespace-nowrap text-[15px] font-bold tabular-nums ${r.cancelled ? 'text-ar-muted line-through' : ''}`}>{money(r.total)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ar-subtle px-5 py-3 text-sm font-semibold">
        <Link href={`/customers/${customer.id}/orders`} className="text-ar-primary-ink no-underline hover:underline">
          {t('detail.allOrders')}
        </Link>
        <Link href={`/customers/${customer.id}`} className="text-ar-primary-ink no-underline hover:underline">
          {t('detail.profile')}
        </Link>
        <span className="flex-1" />
        {canDelete && (
          <button type="button" onClick={onDelete} className="h-8 rounded-lg px-1 text-sm font-semibold text-ar-danger hover:underline">
            {t('detail.delete')}
          </button>
        )}
      </div>
    </section>
  );
}

export function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ar-line-soft bg-ar-surface p-5 shadow-ar" aria-busy="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-6 flex-1" />
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Dialogs
// ----------------------------------------------------------------------------

export function ExportDialog({
  open,
  onClose,
  onExport,
  exporting,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onExport: (period: ExportPeriod) => void;
  exporting: boolean;
  t: T;
}) {
  const [period, setPeriod] = useState<ExportPeriod>('1month');
  return (
    <Modal
      open={open}
      title={t('exportDialog.title')}
      onClose={onClose}
      closeLabel={t('close')}
      footer={
        <>
          <button type="button" onClick={onClose} className={outlineBtn}>
            {t('cancel')}
          </button>
          <button type="button" onClick={() => onExport(period)} disabled={exporting} className={primaryBtn}>
            <ShellIcon d={ICONS.download} size={18} />
            {exporting ? t('exporting') : t('export')}
          </button>
        </>
      }
    >
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-[15px] text-ar-ink">{t('exportDialog.hint')}</legend>
        {EXPORT_PERIODS.map((p) => (
          <label
            key={p}
            className={`flex h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-[15px] ${
              period === p ? 'border-ar-primary bg-ar-primary-soft font-semibold text-ar-primary-ink' : 'border-ar-line text-ar-ink hover:bg-ar-subtle'
            }`}
          >
            <input type="radio" name="export-period" value={p} checked={period === p} onChange={() => setPeriod(p)} className="h-4 w-4 accent-[rgb(var(--ar-primary))]" />
            {t(`exportDialog.period.${p}`)}
          </label>
        ))}
      </fieldset>
      <p className="mb-0 mt-3 text-sm text-ar-muted">{t('exportDialog.tip')}</p>
    </Modal>
  );
}

export function DeleteDialog({
  customer,
  onClose,
  onDeleted,
  t,
}: {
  customer: CustomerRowLike | null;
  onClose: () => void;
  onDeleted: () => void;
  t: T;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [customer]);
  const remove = async () => {
    if (!customer) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await customersApi.deleteCustomer(customer.id);
      // A refused delete (active orders) is toasted by the global API error handler
      if (res.success) onDeleted();
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={!!customer}
      title={t('delete.title')}
      onClose={onClose}
      closeLabel={t('close')}
      footer={
        <>
          <button type="button" onClick={onClose} className={outlineBtn}>
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-[10px] bg-ar-danger px-3.5 text-[15px] font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {busy ? t('delete.deleting') : t('delete.confirm')}
          </button>
        </>
      }
    >
      <p className="m-0 text-[15px]">{t('delete.body', { name: customer ? customerName(customer) || formatPhone(customer.phone) || t('noName') : '' })}</p>
      {failed && (
        <p role="alert" className="mb-0 mt-3 text-sm font-semibold text-ar-danger">
          {t('delete.failed')}
        </p>
      )}
    </Modal>
  );
}
