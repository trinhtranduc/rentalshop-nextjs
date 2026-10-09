'use client';

/**
 * Nhân viên (#528, board Nhan-vien). Reads GET /api/users (the API scopes it: a merchant sees
 * the outlet roles of every outlet, an outlet admin only their outlet; OUTLET_STAFF has no
 * `users.view`). Outlet chips for merchants, role / status filters, search and paging live in
 * the URL. "Sửa" opens /users/[id]; ⋯ locks, unlocks or deletes; "Thêm nhân viên" → /users/add.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@rentalshop/hooks';
import { useToast } from '@rentalshop/ui';
import { apiUrls, authenticatedFetch, getLocalDateKey, outletsApi, SHOP_TIMEZONE, usersApi } from '@rentalshop/utils';
import { ICONS, ShellIcon } from '../components/shell/Icon';
import { shortDayLabel } from '../components/shell/notification-groups';
import { FilterMenu, Skeleton, TableFooter, cardClass, outlineBtn, primaryBtn, type T } from '../orders/list/parts';
import { Modal } from '../orders/create/parts';
import {
  canFilterByOutlet,
  canManageRow,
  canSeeStaffPage,
  lastSeen,
  parseOutletParam,
  parseStaffPage,
  parseStaffPageSize,
  readStaffPage,
  staffQuery,
  roleTone,
  staffContact,
  staffInitials,
  staffName,
  type StaffFilters,
  type StaffLike,
} from './users-model';
import { ROLE_CLASS, dangerBtn } from './staff-parts';

const timeFormatter = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: SHOP_TIMEZONE });

type Outlet = { id: number; name: string };
type Confirm = { kind: 'activate' | 'deactivate' | 'delete'; row: StaffLike } | null;

interface ListState {
  rows: StaffLike[];
  total: number;
  totalPages: number;
  loading: boolean;
  failed: boolean;
}

/** GET /api/users as raw JSON, so `pagination.total` survives (see `staffQuery`). */
async function searchStaff(filters: StaffFilters): Promise<unknown> {
  const query = staffQuery(filters);
  const res = await authenticatedFetch(query ? `${apiUrls.users.list}?${query}` : apiUrls.users.list);
  return res.json();
}

function useStaffPage(filters: Record<string, unknown> | null, nonce: number): ListState {
  const [state, setState] = useState<ListState>({ rows: [], total: 0, totalPages: 1, loading: true, failed: false });
  const key = filters ? JSON.stringify(filters) : '';
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const f = JSON.parse(key) as Record<string, unknown>;
    setState((s) => ({ ...s, loading: true, failed: false }));
    searchStaff(f as StaffFilters)
      .then((res) => {
        if (cancelled) return;
        const page = readStaffPage<StaffLike>(res, Number(f.limit) || 20);
        if (page) setState({ ...page, loading: false, failed: false });
        else setState((s) => ({ ...s, loading: false, failed: true }));
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

/** Merchant only: outlets plus a head-count per outlet (one `limit=1` request each). */
function useOutletChips(enabled: boolean, nonce: number) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [counts, setCounts] = useState<Record<number, number | null>>({});
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    outletsApi
      .getOutlets()
      .then((res) => {
        const data = res?.data as { outlets?: Outlet[] } | Outlet[] | undefined;
        const list = (Array.isArray(data) ? data : data?.outlets || []).map((o) => ({ id: o.id, name: o.name }));
        if (cancelled) return;
        setOutlets(list);
        return Promise.all(
          list.map((o) =>
            searchStaff({ outletId: o.id, page: 1, limit: 1 })
              .then((r) => readStaffPage(r, 1)?.total ?? null)
              .catch(() => null),
          ),
        ).then((totals) => {
          if (!cancelled) setCounts(Object.fromEntries(list.map((o, i) => [o.id, totals[i]])));
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, nonce]);
  return { outlets, counts };
}

function RowMenu({ row, t, onPick }: { row: StaffLike; t: T; onPick: (kind: 'activate' | 'deactivate' | 'delete') => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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
  const item = 'flex h-9 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-ar-subtle';
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('more', { name: staffName(row) })}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ar-ink hover:bg-ar-subtle"
      >
        <ShellIcon d={ICONS.more} size={18} />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 z-30 m-0 mt-1 min-w-[200px] list-none rounded-xl border border-ar-line-soft bg-ar-surface p-1 text-left shadow-ar">
          <li role="none">
            <button
              role="menuitem"
              type="button"
              className={`${item} text-ar-ink`}
              onClick={() => {
                setOpen(false);
                onPick(row.isActive === false ? 'activate' : 'deactivate');
              }}
            >
              {row.isActive === false ? t('activate') : t('deactivate')}
            </button>
          </li>
          <li role="none">
            <button
              role="menuitem"
              type="button"
              className={`${item} text-ar-danger`}
              onClick={() => {
                setOpen(false);
                onPick('delete');
              }}
            >
              {t('delete')}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('users.web') as unknown as T;
  const tm = useTranslations('users.messages');
  const { user } = useAuth();
  const { toastSuccess } = useToast();

  const viewerRole = String(user?.role || '').toUpperCase();
  const allowed = canSeeStaffPage(viewerRole);
  const byOutlet = canFilterByOutlet(viewerRole);
  const weekdays = useMemo(() => t('weekdays').split(','), [t]);

  // URL state
  const q = (searchParams.get('q') || '').trim();
  const outletId = byOutlet ? parseOutletParam(searchParams.get('outlet')) : null;
  const role = ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'].includes(searchParams.get('role') || '') ? (searchParams.get('role') as string) : '';
  const status = ['active', 'inactive'].includes(searchParams.get('status') || '') ? (searchParams.get('status') as string) : '';
  const page = parseStaffPage(searchParams.get('page'));
  const limit = parseStaffPageSize(searchParams.get('limit'));

  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  const [nonce, setNonce] = useState(0);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);

  const update = useCallback(
    (patch: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '' || v === undefined) params.delete(k);
        else params.set(k, String(v));
      }
      if (!('page' in patch)) params.delete('page');
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const filters = useMemo(
    () =>
      allowed && user
        ? {
            q: q || undefined,
            search: q || undefined,
            role: role || undefined,
            status: status || undefined,
            outletId: outletId || undefined,
            page,
            limit,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          }
        : null,
    [allowed, user, q, role, status, outletId, page, limit],
  );
  const list = useStaffPage(filters, nonce);
  const { outlets, counts } = useOutletChips(allowed && byOutlet && !!user, nonce);

  // The owner is not in GET /api/users for a merchant (outlet roles only); the board pins them first.
  const owner: StaffLike | null =
    viewerRole === 'MERCHANT' && user && !q && !role && !status && !outletId && page === 1
      ? {
          id: Number(user.id),
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: 'MERCHANT',
          isActive: true,
        }
      : null;

  const lastSeenText = (row: StaffLike): string => {
    if (owner && row === owner) return t('lastSeen.current');
    const seen = lastSeen(row.lastLoginAt, new Date(), getLocalDateKey, (d) => timeFormatter.format(d));
    const text =
      seen.kind === 'today'
        ? t('lastSeen.today', { time: seen.time })
        : seen.kind === 'yesterday'
          ? t('lastSeen.yesterday', { time: seen.time })
          : seen.kind === 'day'
            ? shortDayLabel(seen.dateKey, weekdays)
            : '';
    if (row.isActive === false) return text ? `${t('lastSeen.locked')} · ${text}` : t('lastSeen.locked');
    return text || t('lastSeen.never');
  };

  const outletText = (row: StaffLike) => (row === owner ? t('allOutletsValue') : row.outlet?.name || '—');

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, row } = confirm;
    setBusy(true);
    try {
      const res =
        kind === 'activate'
          ? await usersApi.activateUser(row.id)
          : kind === 'deactivate'
            ? await usersApi.deactivateUser(row.id)
            : await usersApi.deleteUser(row.id);
      if (res.success) {
        // Same toasts as the old page (users.messages.*).
        const done = tm(kind === 'activate' ? 'activateSuccess' : kind === 'deactivate' ? 'deactivateSuccess' : 'deleteSuccess');
        toastSuccess(done, `${done} - "${staffName(row)}"`);
        setConfirm(null);
        setNonce((n) => n + 1);
      }
      // Errors: the global API error handler shows the toast.
    } catch {
      // Same: handled globally.
    } finally {
      setBusy(false);
    }
  };

  if (user && !allowed) {
    return (
      <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
        <h1 className="m-0 text-2xl font-bold">{t('title')}</h1>
        <p className={`${cardClass} m-0 px-5 py-6 text-[15px] text-ar-muted`}>{t('noAccess')}</p>
      </div>
    );
  }

  const rows: StaffLike[] = owner ? [owner, ...list.rows.filter((r) => r.id !== owner.id)] : list.rows;
  const headCount = list.total + (owner ? 1 : 0);
  const chip = (on: boolean) =>
    `h-9 whitespace-nowrap rounded-full px-3 text-sm ${on ? 'bg-ar-ink font-semibold text-ar-page' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'}`;
  const th = 'px-2 py-2.5 text-left text-xs font-bold uppercase tracking-[0.06em] text-ar-muted';
  const detailHref = (row: StaffLike) => (row === owner ? '/users?settings=profile' : `/users/${row.id}`);

  const roleTag = (row: StaffLike) => {
    const tone = roleTone(row.role);
    return <span className={`inline-block whitespace-nowrap rounded-[7px] px-2 py-[3px] text-sm font-bold ${ROLE_CLASS[tone]}`}>{t(`roles.${tone}`)}</span>;
  };
  const avatar = (row: StaffLike) => (
    <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ar-subtle text-sm font-bold text-ar-ink-2">
      {staffInitials(row)}
    </span>
  );
  const actions = (row: StaffLike) => (
    <span className="flex items-center justify-end gap-1">
      <Link href={detailHref(row)} className="inline-flex h-9 items-center rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-sm font-semibold text-ar-ink no-underline hover:bg-ar-subtle">
        {t('edit')}
      </Link>
      {row !== owner && canManageRow(row, user?.id ? Number(user.id) : null) && (
        <RowMenu row={row} t={t} onPick={(kind) => setConfirm({ kind, row })} />
      )}
    </span>
  );

  const emptyText = q || role || status || outletId ? t('emptySearch') : t('empty');

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold">
          {t('title')}
          {!list.loading && !list.failed && <span className="text-base font-normal text-ar-muted"> · {headCount}</span>}
        </h1>
        <Link href="/users/add" className={primaryBtn}>
          <ShellIcon d={ICONS.plus} size={18} />
          {t('add')}
        </Link>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <section className={`${cardClass} min-w-0 flex-[3_1_560px] overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-ar-subtle px-4 py-3.5">
            {byOutlet && outlets.length > 0 && (
              <div role="group" aria-label={t('outletFilter')} className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={!outletId} onClick={() => update({ outlet: null })} className={chip(!outletId)}>
                  {t('allOutlets')}
                </button>
                {outlets.map((o) => (
                  <button key={o.id} type="button" aria-pressed={outletId === o.id} onClick={() => update({ outlet: o.id })} className={chip(outletId === o.id)}>
                    {o.name}
                    {typeof counts[o.id] === 'number' && (
                      <span className={outletId === o.id ? 'opacity-80' : 'text-ar-muted'}> {counts[o.id]}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <span className="hidden flex-1 md:block" />
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                update({ q: draft.trim() || null });
              }}
              className="w-full md:w-auto"
            >
              <label className="flex h-9 items-center gap-2 rounded-[10px] bg-ar-subtle px-3 text-ar-muted focus-within:ring-2 focus-within:ring-ar-primary md:w-[240px]">
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
            <FilterMenu
              label={t('filters.role')}
              value={role || 'all'}
              options={[
                { value: 'all', label: t('filters.all') },
                { value: 'OUTLET_ADMIN', label: t('roles.admin') },
                { value: 'OUTLET_STAFF', label: t('roles.staff') },
                { value: 'OUTLET_INVENTORY', label: t('roles.inventory') },
              ]}
              onChange={(v) => update({ role: v === 'all' ? null : v })}
            />
            <FilterMenu
              label={t('filters.status')}
              value={status || 'all'}
              options={[
                { value: 'all', label: t('filters.all') },
                { value: 'active', label: t('filters.active') },
                { value: 'inactive', label: t('filters.inactive') },
              ]}
              onChange={(v) => update({ status: v === 'all' ? null : v })}
            />
          </div>

          {list.failed ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-6 text-[15px] text-ar-muted">
              <span>{t('loadFailed')}</span>
              <button type="button" onClick={() => setNonce((n) => n + 1)} className="h-9 rounded-[10px] border border-ar-line px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle">
                {t('retry')}
              </button>
            </div>
          ) : list.loading && list.rows.length === 0 ? (
            <div className="flex flex-col gap-3 px-4 py-4" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="m-0 px-5 py-8 text-center text-[15px] text-ar-muted">{emptyText}</p>
          ) : (
            <div className={list.loading ? 'opacity-60 transition-opacity' : undefined} aria-busy={list.loading || undefined}>
              <table className="hidden w-full border-collapse text-[15px] md:table">
                <thead>
                  <tr className="bg-ar-surface-muted">
                    <th scope="col" className={`${th} pl-4`}>{t('cols.staff')}</th>
                    <th scope="col" className={th}>{t('cols.role')}</th>
                    <th scope="col" className={th}>{t('cols.outlet')}</th>
                    <th scope="col" className={th}>{t('cols.lastLogin')}</th>
                    <th scope="col" className={`${th} pr-4`}>
                      <span className="sr-only">{t('cols.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row === owner ? 'owner' : row.id} className={`border-t border-ar-subtle ${row.isActive === false ? 'opacity-[.55]' : ''}`}>
                      <td className="py-2.5 pl-4 pr-2 align-middle">
                        <Link href={detailHref(row)} className="flex items-center gap-2.5 text-inherit no-underline">
                          {avatar(row)}
                          <span className="flex min-w-0 flex-col">
                            <span className="max-w-[260px] truncate font-semibold text-ar-ink">{staffName(row)}</span>
                            <span className="max-w-[260px] truncate text-sm tabular-nums text-ar-muted">{staffContact(row)}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 align-middle">{roleTag(row)}</td>
                      <td className="px-2 py-2.5 align-middle text-ar-ink-2">{outletText(row)}</td>
                      <td className="px-2 py-2.5 align-middle text-sm tabular-nums text-ar-muted">{lastSeenText(row)}</td>
                      <td className="py-2.5 pl-2 pr-4 text-right align-middle">{actions(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="m-0 list-none p-0 md:hidden">
                {rows.map((row) => (
                  <li
                    key={row === owner ? 'owner' : row.id}
                    className={`flex items-start gap-3 border-t border-ar-subtle px-4 py-3 first:border-t-0 ${row.isActive === false ? 'opacity-[.55]' : ''}`}
                  >
                    {avatar(row)}
                    <Link href={detailHref(row)} className="flex min-w-0 flex-1 flex-col gap-1 text-inherit no-underline">
                      <span className="truncate font-semibold text-ar-ink">{staffName(row)}</span>
                      <span className="truncate text-sm tabular-nums text-ar-muted">{staffContact(row)}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ar-ink-2">
                        {roleTag(row)}
                        <span>{outletText(row)}</span>
                      </span>
                      <span className="text-sm tabular-nums text-ar-muted">{lastSeenText(row)}</span>
                    </Link>
                    {actions(row)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!list.failed && list.total > 0 && (list.total > limit || page > 1) && (
            <TableFooter
              page={page}
              limit={limit}
              total={list.total}
              totalPages={list.totalPages}
              onPage={(p) => update({ page: p })}
              onLimit={(n) => update({ limit: n })}
              t={t}
            />
          )}
        </section>

        <aside className={`${cardClass} flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 px-5 py-4`}>
          <h2 className="m-0 text-lg font-bold">{t('rolesCard.title')}</h2>
          {(['owner', 'admin', 'staff'] as const).map((tone) => (
            <div key={tone} className="flex flex-col gap-1">
              <span className={`self-start rounded-[7px] px-2 py-[3px] text-sm font-bold ${ROLE_CLASS[tone]}`}>{t(`roles.${tone}`)}</span>
              <span className="text-sm leading-[21px] text-ar-ink-2">{t(`rolesCard.${tone}`)}</span>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 border-t border-ar-subtle pt-3">
            <Link href="/users/role-permissions" className={`${outlineBtn} h-9 text-sm`}>
              {t('rolesCard.rolePermissions')}
            </Link>
            <Link href="/users/permissions" className={`${outlineBtn} h-9 text-sm`}>
              {t('rolesCard.permissions')}
            </Link>
          </div>
        </aside>
      </div>

      <Modal
        open={!!confirm}
        title={confirm ? t(`confirm.${confirm.kind}Title`) : ''}
        onClose={() => (busy ? undefined : setConfirm(null))}
        closeLabel={t('confirm.close')}
        footer={
          <>
            <button type="button" onClick={() => setConfirm(null)} disabled={busy} className={outlineBtn}>
              {t('confirm.cancel')}
            </button>
            <button
              type="button"
              onClick={runConfirm}
              disabled={busy}
              className={confirm?.kind === 'activate' ? primaryBtn : dangerBtn}
            >
              {confirm ? t(confirm.kind) : ''}
            </button>
          </>
        }
      >
        <p className="m-0 text-[15px] text-ar-ink-2">{confirm ? t(`confirm.${confirm.kind}Body`, { name: staffName(confirm.row) }) : ''}</p>
      </Modal>
    </div>
  );
}
