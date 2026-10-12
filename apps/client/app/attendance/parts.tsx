'use client';

/**
 * Attendance web (#908): shared frame (tabs, access, outlet), small UI pieces and data hooks.
 * Look follows the approved mockup (`.agent/changes/907-attendance-api/mockup.html`, part "Web").
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@rentalshop/hooks';
import { outletsApi } from '@rentalshop/utils';
import { Modal } from '../orders/create/parts';
import { cardClass, outlineBtn, primaryBtn } from '../orders/list/parts';
import { canUseAttendanceWeb, defaultOutlet, hasAttendance, isOwnerRole, monthLabel } from './attendance-model';
import { useMerchantModules } from './useMerchantModules';

export type AttT = (key: string, values?: Record<string, string | number>) => string;

export { cardClass, outlineBtn, primaryBtn };
export const smallBtn =
  'inline-flex h-8 items-center justify-center whitespace-nowrap rounded-[9px] border border-ar-line-strong bg-ar-surface px-2.5 text-[13px] font-semibold text-ar-ink no-underline hover:bg-ar-subtle disabled:opacity-50';
export const smallDangerBtn = `${smallBtn} text-ar-danger`;
export const dangerBtn =
  'inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] bg-ar-danger px-3.5 text-[15px] font-semibold text-white hover:opacity-95 disabled:opacity-50';
export const inputClass =
  'h-10 w-full rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-[15px] text-ar-ink placeholder:text-ar-faint focus:border-ar-primary focus:outline-none disabled:opacity-60';
export const labelClass = 'flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-ar-ink-2';
export const thClass = 'whitespace-nowrap border-b border-ar-line bg-ar-surface-muted px-2 py-2 text-left text-[13px] font-semibold text-ar-muted';
export const tdClass = 'border-b border-ar-line-soft px-2 py-2 align-top tabular-nums';
export const container = 'mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8';

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

const PILL: Record<string, string> = {
  ok: 'bg-[#D1FAE5] text-[#047857]',
  bad: 'bg-[#FEE2E2] text-[#B91C1C]',
  late: 'bg-[#FEF3C7] text-[#92400E]',
  ot: 'bg-[#EDE9FE] text-[#5B21B6]',
  blue: 'bg-[#EFF6FF] text-[#1E40AF]',
  gray: 'bg-[#F1F5F9] text-[#475569]',
};

export function Pill({ tone, children }: { tone: keyof typeof PILL | string; children: React.ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-[2px] text-xs font-semibold ${PILL[tone] || PILL.gray}`}>{children}</span>;
}

export function Note({ tone = 'i', children }: { tone?: 'i' | 'w' | 'e'; children: React.ReactNode }) {
  const cls =
    tone === 'w'
      ? 'bg-[#FEF3C7] text-[#92400E]'
      : tone === 'e'
        ? 'bg-[#FEF2F2] text-[#991B1B]'
        : 'border border-dashed border-ar-line-strong bg-ar-surface-muted text-ar-ink-2';
  return <div className={`rounded-[10px] px-3 py-2.5 text-[13px] ${cls}`}>{children}</div>;
}

export function Seg<V extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: V; label: string }>;
  /** One value, or a list for multi-select. */
  value: V | V[] | null;
  onChange: (value: V) => void;
  label?: string;
}) {
  const on = (v: V) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-[10px] bg-ar-subtle p-[3px]">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={on(o.value)}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-2.5 py-1.5 text-[13px] ${on(o.value) ? 'bg-ar-surface font-semibold text-ar-ink shadow-sm' : 'text-ar-muted hover:text-ar-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Kpi({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'red' | 'amber' | 'violet' }) {
  const color = tone === 'red' ? 'text-[#B91C1C]' : tone === 'amber' ? 'text-[#92400E]' : tone === 'violet' ? 'text-[#5B21B6]' : '';
  return (
    <div className={`${cardClass} px-3.5 py-3`}>
      <small className={`text-xs ${color || 'text-ar-muted'}`}>{label}</small>
      <b className={`mt-0.5 block text-2xl tabular-nums ${color}`}>{value}</b>
    </div>
  );
}

/** The shared Modal with a stable close callback (its effect refocuses on every new onClose). */
export function Dialog({
  open,
  title,
  sub,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  sub?: React.ReactNode;
  onClose: () => void;
  children?: React.ReactNode;
  footer: React.ReactNode;
  wide?: boolean;
}) {
  const t = useTranslations('attendance') as unknown as AttT;
  const ref = useRef(onClose);
  ref.current = onClose;
  const close = useCallback(() => ref.current(), []);
  return (
    <Modal open={open} title={title} onClose={close} closeLabel={t('common.close')} footer={footer} wide={wide}>
      <div className="flex flex-col gap-3.5">
        {sub && <p className="m-0 -mt-1 text-[13px] text-ar-muted">{sub}</p>}
        {children}
      </div>
    </Modal>
  );
}

export function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`${labelClass} ${full ? 'sm:col-span-2' : ''}`}>
      {label}
      {children}
    </label>
  );
}

export function weekdayLabels(t: AttT): string[] {
  return [1, 2, 3, 4, 5, 6, 7].map((d) => t(`weekday.${d}`));
}

/** Busy flag + one action at a time; API errors are toasted by the global handler. */
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    try {
      return await fn();
    } catch {
      return undefined;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);
  return { busy, run };
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export function useLoad<R>(loader: (() => Promise<R>) | null, deps: React.DependencyList) {
  const [state, setState] = useState<{ data: R | null; loading: boolean; error: boolean }>({ data: null, loading: !!loader, error: false });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!loader) {
      setState({ data: null, loading: false, error: false });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: false }));
    loader()
      .then((data) => alive && setState({ data, loading: false, error: false }))
      .catch(() => alive && setState((s) => ({ ...s, loading: false, error: true })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

/** Unwraps an ApiResponse; a failed one throws (the global handler already toasted it). */
export async function must<R>(promise: Promise<{ success: boolean; data?: R }>): Promise<R> {
  const res = await promise;
  if (!res?.success) throw new Error('request failed');
  return res.data as R;
}

export interface OutletOption {
  id: number;
  name: string;
  isDefault?: boolean;
  address?: string | null;
  phone?: string | null;
}

export interface AttendanceAccess {
  user: ReturnType<typeof useAuth>['user'];
  role: string;
  owner: boolean;
  allowed: boolean;
  ready: boolean;
  callerId: number | null;
}

export function useAttendanceAccess(): AttendanceAccess {
  const { user, loading } = useAuth();
  const modules = useMerchantModules(user);
  const role = (user?.role || '').toUpperCase();
  return {
    user,
    role,
    owner: isOwnerRole(role),
    allowed: canUseAttendanceWeb(role) && hasAttendance(modules),
    ready: !loading && !!user,
    callerId: user?.id != null ? Number(user.id) : null,
  };
}

/** Outlets the caller can pick (the API scopes an outlet admin to its outlet). */
export function useOutlets(enabled: boolean) {
  const { user } = useAuth();
  const merchantId = user?.merchant?.id || user?.merchantId;
  const { data, loading } = useLoad<OutletOption[]>(
    enabled && merchantId
      ? async () => {
          const res = await outletsApi.getOutlets({ merchantId: Number(merchantId), isActive: true, limit: 100 });
          const list = ((res?.data as unknown as { outlets?: OutletOption[] })?.outlets || []).map((o) => ({
            id: Number(o.id),
            name: o.name,
            isDefault: !!(o as { isDefault?: boolean }).isDefault,
            address: (o as { address?: string | null }).address ?? null,
            phone: o.phone ?? null,
          }));
          const own = user?.outletId != null ? Number(user.outletId) : null;
          return own != null && !isOwnerRole(user?.role) ? list.filter((o) => o.id === own) : list;
        }
      : null,
    [enabled, merchantId],
  );
  return { outlets: data || [], loading };
}

/** `?key=value` helpers that keep the other params. */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = useCallback(
    (patch: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, String(v));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  return { params, set };
}

export function useSelectedOutlet(outlets: OutletOption[]) {
  const { params, set } = useQueryState();
  // #918: no outlet in the URL → the shop's default outlet, not the first of the list
  const selected = defaultOutlet(outlets, Number(params.get('outletId')) || null);
  return { outlet: selected, setOutlet: (id: number) => set({ outletId: id }) };
}

// ---------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'timesheet', href: '/attendance' },
  { key: 'person', href: '/attendance/person' },
  { key: 'shifts', href: '/attendance/shifts' },
  { key: 'templates', href: '/attendance/templates' },
] as const;

/**
 * Container, tab strip and the access gate. Children render once the caller may use the screens and an outlet
 * is known.
 */
export function AttendanceFrame({
  children,
}: {
  children: (ctx: { access: AttendanceAccess; outlets: OutletOption[]; outlet: OutletOption }) => React.ReactNode;
}) {
  const t = useTranslations('attendance') as unknown as AttT;
  const pathname = usePathname();
  const params = useSearchParams();
  const access = useAttendanceAccess();
  const { outlets, loading } = useOutlets(access.allowed);
  const { outlet } = useSelectedOutlet(outlets);

  const keep = useMemo(() => {
    const q = new URLSearchParams();
    for (const k of ['outletId', 'month']) {
      const v = params.get(k);
      if (v) q.set(k, v);
    }
    const s = q.toString();
    return s ? `?${s}` : '';
  }, [params]);

  let body: React.ReactNode;
  if (!access.ready) body = <p className="m-0 text-ar-muted">{t('common.loading')}</p>;
  else if (!canUseAttendanceWeb(access.role)) body = <p className={`${cardClass} m-0 px-5 py-6 text-ar-muted`}>{t('common.noAccess')}</p>;
  else if (!access.allowed) body = <p className={`${cardClass} m-0 px-5 py-6 text-ar-muted`}>{t('common.notAvailable')}</p>;
  else if (loading) body = <p className="m-0 text-ar-muted">{t('common.loading')}</p>;
  else if (!outlet) body = <p className={`${cardClass} m-0 px-5 py-6 text-ar-muted`}>{t('common.noOutlet')}</p>;
  else body = children({ access, outlets, outlet });

  return (
    <div className={container}>
      {access.allowed && (
        <nav aria-label={t('title')} className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = tab.href === '/attendance' ? pathname === '/attendance' : pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.key}
                href={`${tab.href}${keep}`}
                aria-current={active ? 'page' : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-sm no-underline ${
                  active ? 'border-ar-primary bg-ar-primary font-semibold text-ar-on-primary' : 'border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'
                }`}
              >
                {t(`tabs.${tab.key}`)}
              </Link>
            );
          })}
        </nav>
      )}
      {body}
    </div>
  );
}

export function OutletPicker({ outlets, outlet }: { outlets: OutletOption[]; outlet: OutletOption }) {
  const t = useTranslations('attendance') as unknown as AttT;
  const { set } = useQueryState();
  if (outlets.length < 2) return <span className={`${outlineBtn} cursor-default font-normal`}>🏬 {outlet.name}</span>;
  return (
    <select aria-label={t('common.outlet')} value={outlet.id} onChange={(e) => set({ outletId: Number(e.target.value) })} className={`${outlineBtn} font-normal`}>
      {outlets.map((o) => (
        <option key={o.id} value={o.id}>
          🏬 {o.name}
        </option>
      ))}
    </select>
  );
}

export function MonthNav({ month, onChange }: { month: string; onChange: (delta: number) => void }) {
  const t = useTranslations('attendance') as unknown as AttT;
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={() => onChange(-1)} aria-label={t('common.prevMonth')} className={outlineBtn}>
        ‹
      </button>
      <span className={`${outlineBtn} cursor-default font-normal`}>{t('common.month', { month: monthLabel(month) })}</span>
      <button type="button" onClick={() => onChange(1)} aria-label={t('common.nextMonth')} className={outlineBtn}>
        ›
      </button>
    </span>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="m-0 text-[22px] font-bold">{title}</h1>
        {sub && <p className="m-0 mt-1 text-sm text-ar-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function DialogFooter({
  onCancel,
  onOk,
  okLabel,
  danger,
  busy,
  extra,
  okDisabled,
}: {
  onCancel: () => void;
  onOk: () => void;
  okLabel: string;
  danger?: boolean;
  busy?: boolean;
  extra?: React.ReactNode;
  okDisabled?: boolean;
}) {
  const t = useTranslations('attendance') as unknown as AttT;
  return (
    <>
      {extra && <span className="mr-auto flex gap-2">{extra}</span>}
      <button type="button" onClick={onCancel} disabled={busy} className={outlineBtn}>
        {t('common.cancel')}
      </button>
      <button type="button" onClick={onOk} disabled={busy || okDisabled} className={danger ? dangerBtn : primaryBtn}>
        {busy ? t('common.working') : okLabel}
      </button>
    </>
  );
}
