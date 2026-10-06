'use client';

/**
 * Phân quyền thêm cho nhân viên (#542). Pick outlet staff (GET /api/users?role=OUTLET_STAFF, scoped by
 * the API), switch the extra permissions, save with POST /api/users/permissions/bulk. With one staff
 * picked the switches start from GET /api/users/{id}/permissions.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@rentalshop/hooks';
import { useToast } from '@rentalshop/ui';
import { authenticatedFetch, parseApiResponse, usersApi } from '@rentalshop/utils';
import { Skeleton, cardClass, outlineBtn, primaryBtn, type T } from '../../orders/list/parts';
import { staffContact, staffInitials, staffName, type StaffLike } from '../users-model';
import {
  EXTRA_PERMISSION_GROUPS,
  canManagePermissions,
  groupState,
  permissionLabelKey,
  permissionPayload,
  permissionsFromRows,
  toggleGroup,
  type Switches,
} from './permissions-model';
import { NoAccess, PageHead, Switch, pageClass, smallBtn } from './parts';

interface StaffState {
  rows: StaffLike[];
  loading: boolean;
  failed: boolean;
}

function useOutletStaff(enabled: boolean, nonce: number): StaffState {
  const [state, setState] = useState<StaffState>({ rows: [], loading: true, failed: false });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, failed: false }));
    usersApi
      .getUsers({ role: 'OUTLET_STAFF' }, { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data as StaffLike[] | { users?: StaffLike[] } | undefined;
        const rows = Array.isArray(data) ? data : data?.users;
        if (res?.success && Array.isArray(rows)) setState({ rows, loading: false, failed: false });
        else setState({ rows: [], loading: false, failed: true });
      })
      .catch(() => {
        if (!cancelled) setState({ rows: [], loading: false, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, nonce]);
  return state;
}

export default function PermissionsPage() {
  const t = useTranslations('users.web') as unknown as T;
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const allowed = canManagePermissions(user?.role);

  const [nonce, setNonce] = useState(0);
  const staff = useOutletStaff(!!user && allowed, nonce);
  const [picked, setPicked] = useState<number[]>([]);
  const [switches, setSwitches] = useState<Switches>({});
  const [loadingOne, setLoadingOne] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  // One staff picked: start from what is stored for them. Several: start from all off.
  const single = picked.length === 1 ? picked[0] : null;
  useEffect(() => {
    setReadFailed(false);
    if (single === null) {
      setSwitches({});
      return;
    }
    let cancelled = false;
    setLoadingOne(true);
    usersApi
      .getUserPermissions(single)
      .then((res) => {
        if (cancelled) return;
        setSwitches(res?.success ? permissionsFromRows(res.data) : {});
        setReadFailed(!res?.success);
      })
      .catch(() => {
        if (cancelled) return;
        setSwitches({});
        setReadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingOne(false);
      });
    return () => {
      cancelled = true;
    };
  }, [single]);

  const togglePick = useCallback((id: number) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }, []);

  const allPicked = staff.rows.length > 0 && staff.rows.every((r) => picked.includes(r.id));
  const disabled = picked.length === 0 || loadingOne || saving;
  const pickedNames = useMemo(() => staff.rows.filter((r) => picked.includes(r.id)).map(staffName), [staff.rows, picked]);

  const save = async () => {
    if (picked.length === 0) return;
    setSaving(true);
    try {
      const res = await authenticatedFetch('/api/users/permissions/bulk', {
        method: 'POST',
        body: JSON.stringify({ userIds: picked, permissions: permissionPayload(switches) }),
      });
      const data = await parseApiResponse<unknown>(res);
      if (data.success) toastSuccess(t('permissions.savedTitle'), t('permissions.saved', { count: picked.length }));
      // Errors: parseApiResponse raises the global API error toast.
    } catch {
      toastError(t('permissions.errorTitle'), t('permissions.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (user && !allowed) return <NoAccess title={t('permissions.title')} text={t('permissions.noAccess')} />;

  return (
    <div className={pageClass}>
      <PageHead
        back={t('title')}
        title={t('permissions.title')}
        hint={t('permissions.hint')}
        action={
          <Link href="/users/role-permissions" className={`${outlineBtn} h-9 text-sm`}>
            {t('rolesCard.rolePermissions')}
          </Link>
        }
      />

      <div className="flex flex-wrap items-start gap-4">
        {/* Who */}
        <section className={`${cardClass} min-w-0 flex-[1_1_320px] overflow-hidden`} aria-labelledby="perm-pick-title">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ar-subtle px-5 py-3.5">
            <h2 id="perm-pick-title" className="m-0 text-lg font-bold">
              {t('permissions.pickTitle')}
              {picked.length > 0 && <span className="text-sm font-normal text-ar-muted"> · {t('permissions.picked', { count: picked.length })}</span>}
            </h2>
            {staff.rows.length > 0 && (
              <button type="button" className={smallBtn} onClick={() => setPicked(allPicked ? [] : staff.rows.map((r) => r.id))}>
                {allPicked ? t('permissions.pickNone') : t('permissions.pickAll')}
              </button>
            )}
          </div>
          {staff.failed ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-6 text-[15px] text-ar-muted">
              <span>{t('loadFailed')}</span>
              <button type="button" onClick={() => setNonce((n) => n + 1)} className={smallBtn}>
                {t('retry')}
              </button>
            </div>
          ) : staff.loading ? (
            <div className="flex flex-col gap-3 px-5 py-4" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : staff.rows.length === 0 ? (
            <p className="m-0 px-5 py-8 text-center text-[15px] text-ar-muted">{t('permissions.noStaff')}</p>
          ) : (
            <ul className="m-0 max-h-[560px] list-none overflow-y-auto p-0">
              {staff.rows.map((row) => {
                const on = picked.includes(row.id);
                return (
                  <li key={row.id} className="border-t border-ar-subtle first:border-t-0">
                    <label className={`flex cursor-pointer items-center gap-3 px-5 py-2.5 ${on ? 'bg-ar-primary-soft' : 'hover:bg-ar-subtle'} ${row.isActive === false ? 'opacity-[.55]' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => togglePick(row.id)} className="h-4 w-4 flex-none accent-[rgb(var(--ar-primary))]" />
                      <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ar-subtle text-sm font-bold text-ar-ink-2">
                        {staffInitials(row)}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold text-ar-ink">{staffName(row)}</span>
                        <span className="truncate text-sm tabular-nums text-ar-muted">
                          {[staffContact(row), row.outlet?.name].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* What */}
        <section className={`${cardClass} min-w-0 flex-[2_1_480px] overflow-hidden`} aria-labelledby="perm-switch-title" aria-busy={loadingOne || undefined}>
          <div className="flex flex-col gap-1 border-b border-ar-subtle px-5 py-3.5">
            <h2 id="perm-switch-title" className="m-0 text-lg font-bold">
              {t('permissions.switchTitle')}
            </h2>
            <p className="m-0 text-sm text-ar-muted">
              {picked.length === 0
                ? t('permissions.pickFirst')
                : picked.length === 1
                  ? t('permissions.forOne', { name: pickedNames[0] || '' })
                  : t('permissions.forMany', { count: picked.length })}
            </p>
            {readFailed && (
              <p role="status" className="m-0 rounded-lg bg-ar-late-bg px-3 py-2 text-sm text-ar-late">
                {t('permissions.readFailed')}
              </p>
            )}
          </div>
          <div className={`flex flex-col ${loadingOne ? 'opacity-60' : ''}`}>
            {EXTRA_PERMISSION_GROUPS.map((group) => {
              const state = groupState(switches, group.id);
              return (
                <div key={group.id} className="border-t border-ar-subtle px-5 py-3.5 first:border-t-0">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">{t(`permissions.groups.${group.id}`)}</h3>
                    <button type="button" disabled={disabled} onClick={() => setSwitches((s) => toggleGroup(s, group.id))} className="h-8 rounded-lg px-2 text-sm font-semibold text-ar-primary hover:bg-ar-subtle disabled:opacity-40">
                      {state === 'all' ? t('permissions.allOff') : t('permissions.allOn')}
                    </button>
                  </div>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {group.keys.map((key) => {
                      const k = permissionLabelKey(key);
                      return (
                        <li key={key} className="flex items-center justify-between gap-4 rounded-xl py-1.5">
                          <span className="flex min-w-0 flex-col">
                            <span id={`perm-${k}`} className="text-[15px] font-semibold text-ar-ink">
                              {t(`permissionKeys.${k}.label`)}
                            </span>
                            <span id={`perm-${k}-desc`} className="text-sm text-ar-muted">
                              {t(`permissionKeys.${k}.desc`)}
                            </span>
                          </span>
                          <Switch
                            checked={switches[key] === true}
                            disabled={disabled}
                            labelledBy={`perm-${k}`}
                            describedBy={`perm-${k}-desc`}
                            onChange={(v) => setSwitches((s) => ({ ...s, [key]: v }))}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ar-subtle bg-ar-surface-muted px-5 py-3.5">
            <button type="button" onClick={() => setPicked([])} disabled={picked.length === 0 || saving} className={`${outlineBtn} h-11 rounded-xl px-[18px]`}>
              {t('permissions.cancel')}
            </button>
            <button type="button" onClick={save} disabled={disabled} className={`${primaryBtn} h-11 rounded-xl px-[22px]`}>
              {saving ? t('permissions.saving') : t('permissions.save')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
