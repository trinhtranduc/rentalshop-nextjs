'use client';

/**
 * Chi nhánh (#545) on the shop shell. Same endpoints as the old page: the list is GET /api/outlets
 * (now through `outletsApi.searchOutlets`, so q / page / sort reach the API: the old
 * `useOutletsWithFilters` called `getOutlets()`, which drops every filter), `outletsApi.createOutlet`,
 * `outletsApi.updateOutlet` (fields, receipt note, isActive). Bank accounts → /outlets/[id]/bank-accounts.
 * The page is in the nav for the shop owner only; the API scopes what an outlet user gets (as before).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth, usePermissions } from '@rentalshop/hooks';
import { useToast } from '@rentalshop/ui';
import { outletsApi } from '@rentalshop/utils';
import type { OutletFilters } from '@rentalshop/types';
import { ICONS, ShellIcon } from '../components/shell/Icon';
import { Skeleton, TableFooter, cardClass, outlineBtn, primaryBtn, type T } from '../orders/list/parts';
import { Modal } from '../orders/create/parts';
import { OutletFormDialog, RowMenu, smallBtn } from './parts';
import {
  EMPTY_OUTLET_FORM,
  formatOutletDate,
  nextSort,
  outletActions,
  outletAddress,
  outletCreatePayload,
  outletFormFrom,
  outletUpdatePayload,
  parseOutletParams,
  type OutletForm,
  type OutletLike,
  type OutletSortBy,
} from './outlets-model';

const dangerBtn =
  'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[10px] bg-ar-danger px-3.5 text-[15px] font-semibold text-white hover:opacity-95 disabled:opacity-50';

interface ListData {
  outlets: OutletLike[];
  total: number;
  totalPages: number;
}

/** GET /api/outlets with the filters; `refetch` reloads the same page. */
function useOutletList(filters: OutletFilters | null) {
  const [state, setState] = useState<{ data: ListData | null; loading: boolean; error: boolean }>({ data: null, loading: true, error: false });
  const [nonce, setNonce] = useState(0);
  const key = filters ? JSON.stringify(filters) : '';
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    outletsApi
      .searchOutlets(JSON.parse(key) as OutletFilters)
      .then((res) => {
        if (cancelled) return;
        const d = res?.success ? (res.data as unknown as { outlets?: OutletLike[]; total?: number; totalPages?: number }) : null;
        if (d) setState({ data: { outlets: d.outlets || [], total: d.total || 0, totalPages: d.totalPages || 1 }, loading: false, error: false });
        else setState((s) => ({ ...s, loading: false, error: true }));
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);
  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, refetch };
}

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; row: OutletLike }
  | { kind: 'view'; row: OutletLike }
  | { kind: 'disable'; row: OutletLike }
  | null;

export default function OutletsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('outlets.web') as unknown as T;
  const { user } = useAuth();
  const { canManageOutlets } = usePermissions();
  const { toastSuccess } = useToast();

  const { q, page, limit, sortBy, sortOrder } = parseOutletParams(searchParams);
  const merchantId = user?.merchant?.id || user?.merchantId;

  const filters: OutletFilters | null = useMemo(
    () => (merchantId ? { q: q || undefined, merchantId: Number(merchantId), page, limit, sortBy, sortOrder } : null),
    [q, merchantId, page, limit, sortBy, sortOrder],
  );
  const { data, loading, error, refetch } = useOutletList(filters);

  const update = useCallback(
    (patch: Record<string, string | number | null>, replace = false) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') params.delete(k);
        else params.set(k, String(v));
      }
      if (!('page' in patch)) params.delete('page');
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Search box: debounced into ?q= (the API searches name, city and phone).
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  useEffect(() => {
    const next = draft.trim();
    if (next === q) return;
    const id = window.setTimeout(() => update({ q: next || null }, true), 300);
    return () => window.clearTimeout(id);
  }, [draft, q, update]);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [working, setWorking] = useState(false);
  const busyRef = useRef(false);

  const rows = data?.outlets || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const sort = (column: OutletSortBy) => update({ ...nextSort({ sortBy, sortOrder }, column), page: null });

  const create = async (form: OutletForm) => {
    try {
      const res = await outletsApi.createOutlet(outletCreatePayload(form, Number(merchantId) || 0) as Parameters<typeof outletsApi.createOutlet>[0]);
      if (res.success) {
        toastSuccess(t('toast.created'), form.name.trim());
        setDialog(null);
        refetch();
        return true;
      }
    } catch {
      // The global API error handler shows the toast (as before).
    }
    return false;
  };

  const save = (row: OutletLike) => async (form: OutletForm) => {
    try {
      const res = await outletsApi.updateOutlet(row.id, outletUpdatePayload(row.id, form) as Parameters<typeof outletsApi.updateOutlet>[1]);
      if (res.success) {
        toastSuccess(t('toast.updated'), form.name.trim());
        setDialog(null);
        refetch();
        return true;
      }
    } catch {
      // Handled globally.
    }
    return false;
  };

  const setActive = async (row: OutletLike, isActive: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setWorking(true);
    try {
      const res = await outletsApi.updateOutlet(row.id, { id: row.id, isActive } as Parameters<typeof outletsApi.updateOutlet>[1]);
      if (res.success) {
        toastSuccess(isActive ? t('toast.enabled') : t('toast.disabled'), row.name);
        setDialog(null);
        refetch();
      }
    } catch {
      // Handled globally.
    } finally {
      busyRef.current = false;
      setWorking(false);
    }
  };

  const th = 'px-2 py-2.5 text-left text-xs font-bold uppercase tracking-[0.06em] text-ar-muted';
  const sortHeader = (column: OutletSortBy, label: string, extra = '') => (
    <th scope="col" className={`${th} ${extra}`} aria-sort={sortBy === column ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" onClick={() => sort(column)} aria-label={t('sortBy', { column: label })} className="inline-flex items-center gap-1 uppercase tracking-[0.06em] hover:text-ar-ink">
        {label}
        {sortBy === column && <span aria-hidden="true">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );

  const defaultTag = (row: OutletLike) =>
    row.isDefault ? (
      <span className="inline-block whitespace-nowrap rounded-[7px] bg-ar-reserved-bg px-2 py-[2px] text-xs font-bold text-ar-reserved">{t('default')}</span>
    ) : null;
  const statusTag = (row: OutletLike) =>
    row.isActive === false ? (
      <span className="inline-block whitespace-nowrap rounded-[7px] bg-ar-cancelled-bg px-2 py-[3px] text-sm font-bold text-ar-cancelled">{t('status.inactive')}</span>
    ) : (
      <span className="inline-block whitespace-nowrap rounded-[7px] bg-ar-done-bg px-2 py-[3px] text-sm font-bold text-ar-done">{t('status.active')}</span>
    );
  const staffText = (row: OutletLike) =>
    typeof row._count?.users === 'number' ? t('staffCount', { count: row._count.users }) : '';

  const actions = (row: OutletLike) => {
    const allowed = outletActions(row, canManageOutlets);
    return (
      <span className="flex items-center justify-end gap-1">
        {allowed.includes('edit') && (
          <button type="button" onClick={() => setDialog({ kind: 'edit', row })} className={smallBtn}>
            {t('edit')}
          </button>
        )}
        <RowMenu
          label={t('more', { name: row.name })}
          items={[
            { key: 'view', text: t('viewDetails'), onPick: () => setDialog({ kind: 'view', row }) },
            { key: 'bank', text: t('bankAccounts'), href: `/outlets/${row.id}/bank-accounts` },
            ...(allowed.includes('disable')
              ? [{ key: 'disable', text: t('disable'), danger: true, onPick: () => setDialog({ kind: 'disable', row }) }]
              : []),
            ...(allowed.includes('enable') ? [{ key: 'enable', text: t('enable'), onPick: () => setActive(row, true) }] : []),
          ]}
        />
      </span>
    );
  };

  const nameCell = (row: OutletLike) => (
    <span className="flex min-w-0 flex-col">
      <span className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={() => setDialog({ kind: 'view', row })} className="min-w-0 truncate text-left font-semibold text-ar-ink hover:underline">
          {row.name}
        </button>
        {defaultTag(row)}
      </span>
      {staffText(row) && <span className="text-sm text-ar-muted">{staffText(row)}</span>}
    </span>
  );

  const container = 'mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8';

  if (user && !merchantId) {
    return (
      <div className={container}>
        <h1 className="m-0 text-2xl font-bold">{t('title')}</h1>
        <p className={`${cardClass} m-0 px-5 py-6 text-[15px] text-ar-muted`}>{t('noSession')}</p>
      </div>
    );
  }

  const showFooter = !error && total > 0 && (total > limit || page > 1);
  const view = dialog?.kind === 'view' ? dialog.row : null;

  return (
    <div className={container}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold">
          {t('title')}
          {data && !error && !q && <span className="text-base font-normal text-ar-muted"> · {total}</span>}
        </h1>
        <button type="button" onClick={() => setDialog({ kind: 'add' })} className={primaryBtn}>
          <ShellIcon d={ICONS.plus} size={18} />
          {t('add')}
        </button>
      </div>

      <section className={`${cardClass} min-w-0 overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-ar-subtle px-4 py-3.5">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: draft.trim() || null });
            }}
            className="w-full md:w-auto"
          >
            <label className="flex h-9 items-center gap-2 rounded-[10px] bg-ar-subtle px-3 text-ar-muted focus-within:ring-2 focus-within:ring-ar-primary md:w-[320px]">
              <ShellIcon d={ICONS.search} size={16} />
              <input
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label={t('searchLabel')}
                placeholder={t('searchPlaceholder')}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ar-ink outline-none placeholder:text-ar-muted"
              />
            </label>
          </form>
        </div>

        {error ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-6 text-[15px] text-ar-muted">
            <span>{t('loadFailed')}</span>
            <button type="button" onClick={() => refetch()} className={smallBtn}>
              {t('retry')}
            </button>
          </div>
        ) : !data ? (
          <div className="flex flex-col gap-3 px-4 py-4" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="m-0 px-5 py-8 text-center text-[15px] text-ar-muted">{q ? t('emptySearch') : t('empty')}</p>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : undefined} aria-busy={loading || undefined}>
            <table className="hidden w-full table-fixed border-collapse text-[15px] lg:table">
              <thead>
                <tr className="bg-ar-surface-muted">
                  {sortHeader('name', t('cols.name'), 'w-[32%] pl-4')}
                  <th scope="col" className={th}>
                    {t('cols.address')}
                  </th>
                  <th scope="col" className={`${th} w-[140px]`}>
                    {t('cols.phone')}
                  </th>
                  <th scope="col" className={`${th} w-[120px]`}>
                    {t('cols.status')}
                  </th>
                  {sortHeader('createdAt', t('cols.createdAt'), 'w-[120px]')}
                  <th scope="col" className={`${th} w-[120px] pr-4`}>
                    <span className="sr-only">{t('cols.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={`border-t border-ar-subtle ${row.isActive === false ? 'opacity-[.6]' : ''}`}>
                    <td className="py-2.5 pl-4 pr-2 align-middle">{nameCell(row)}</td>
                    <td className="px-2 py-2.5 align-middle text-ar-ink-2">
                      <span className="line-clamp-2">{outletAddress(row) || <span className="text-ar-faint">—</span>}</span>
                    </td>
                    <td className="truncate px-2 py-2.5 align-middle tabular-nums text-ar-ink-2">{row.phone || <span className="text-ar-faint">—</span>}</td>
                    <td className="px-2 py-2.5 align-middle">{statusTag(row)}</td>
                    <td className="px-2 py-2.5 align-middle text-sm tabular-nums text-ar-muted">{formatOutletDate(row.createdAt)}</td>
                    <td className="py-2.5 pl-2 pr-4 text-right align-middle">{actions(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="m-0 list-none p-0 lg:hidden">
              {rows.map((row) => (
                <li key={row.id} className={`flex items-start gap-3 border-t border-ar-subtle px-4 py-3 first:border-t-0 ${row.isActive === false ? 'opacity-[.6]' : ''}`}>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    {nameCell(row)}
                    {outletAddress(row) && <span className="text-sm text-ar-ink-2">{outletAddress(row)}</span>}
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums text-ar-muted">
                      {statusTag(row)}
                      {row.phone && <span>{row.phone}</span>}
                    </span>
                  </span>
                  {actions(row)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showFooter && (
          <TableFooter page={page} limit={limit} total={total} totalPages={totalPages} onPage={(p) => update({ page: p })} onLimit={(n) => update({ limit: n })} t={t} />
        )}
      </section>

      <OutletFormDialog
        open={dialog?.kind === 'add'}
        mode="add"
        initial={EMPTY_OUTLET_FORM}
        onClose={() => setDialog(null)}
        onSubmit={create}
        t={t}
      />
      <OutletFormDialog
        open={dialog?.kind === 'edit'}
        mode="edit"
        initial={dialog?.kind === 'edit' ? outletFormFrom(dialog.row) : EMPTY_OUTLET_FORM}
        onClose={() => setDialog(null)}
        onSubmit={dialog?.kind === 'edit' ? save(dialog.row) : async () => false}
        t={t}
      />

      <Modal
        open={!!view}
        title={t('detail.title')}
        onClose={() => setDialog(null)}
        closeLabel={t('form.close')}
        footer={
          view ? (
            <>
              <Link href={`/outlets/${view.id}/bank-accounts`} className={outlineBtn}>
                {t('bankAccounts')}
              </Link>
              <button type="button" onClick={() => setDialog({ kind: 'edit', row: view })} className={primaryBtn}>
                {t('edit')}
              </button>
            </>
          ) : undefined
        }
      >
        {view && (
          <dl className="m-0 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-semibold text-ar-muted">{t('form.name')}</dt>
              <dd className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                {view.name}
                {defaultTag(view)}
                {statusTag(view)}
              </dd>
            </div>
            {(
              [
                ['phone', view.phone],
                ['addressGroup', outletAddress(view)],
                ['description', view.description],
                ['printNote', view.printNote],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1">
                <dt className="text-sm font-semibold text-ar-muted">{t(`form.${key}`)}</dt>
                <dd className={`m-0 whitespace-pre-wrap text-[15px] ${value ? 'text-ar-ink-2' : 'text-ar-faint'}`}>{value || t('detail.none')}</dd>
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-semibold text-ar-muted">{t('cols.createdAt')}</dt>
              <dd className="m-0 text-[15px] tabular-nums text-ar-ink-2">{formatOutletDate(view.createdAt)}</dd>
            </div>
          </dl>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'disable'}
        title={t('confirm.disableTitle')}
        onClose={() => (working ? undefined : setDialog(null))}
        closeLabel={t('form.close')}
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)} disabled={working} className={outlineBtn}>
              {t('confirm.cancel')}
            </button>
            <button type="button" onClick={() => dialog?.kind === 'disable' && setActive(dialog.row, false)} disabled={working} className={dangerBtn}>
              {working ? t('confirm.working') : t('confirm.disable')}
            </button>
          </>
        }
      >
        <p className="m-0 text-[15px] text-ar-ink-2">{dialog?.kind === 'disable' ? t('confirm.disableBody', { name: dialog.row.name }) : ''}</p>
      </Modal>
    </div>
  );
}
