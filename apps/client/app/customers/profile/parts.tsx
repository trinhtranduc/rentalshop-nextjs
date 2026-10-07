'use client';

/** #541 parts shared by the customer profile, form and orders pages, on `ar-*` tokens. */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { customersApi, getLocalDateKey, loyaltyApi } from '@rentalshop/utils';
import type { LoyaltyCustomerSummary, LoyaltyTransaction } from '@rentalshop/types';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { Skeleton, cardClass, outlineBtn, type Money, type T } from '../../orders/list/parts';
import { dayText, type CustomerSummary } from '../customers-model';
import type { CustomerLike } from '../customer-form-model';

export const pageClass = 'mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8';

export interface CustomerRecord extends CustomerLike {
  id: number;
  createdAt?: string | Date | null;
}

export interface CustomerState {
  customer: CustomerRecord | null;
  loading: boolean;
  /** 'notFound' for an unknown id or another shop's customer, 'error' for anything else. */
  failed: 'notFound' | 'error' | null;
}

/** GET /api/customers/{id}, fetched fresh on every visit (the profile must show an edit at once). */
export function useCustomer(id: number | null, nonce = 0): CustomerState {
  const [state, setState] = useState<CustomerState>({ customer: null, loading: true, failed: null });
  useEffect(() => {
    if (!id) {
      setState({ customer: null, loading: false, failed: 'notFound' });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, failed: null }));
    customersApi
      .getCustomerById(id)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setState({ customer: res.data as unknown as CustomerRecord, loading: false, failed: null });
        else {
          const code = (res as { code?: string }).code;
          setState({ customer: null, loading: false, failed: code === 'CUSTOMER_NOT_FOUND' || code === 'INVALID_CUSTOMER_ID_FORMAT' ? 'notFound' : 'error' });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ customer: null, loading: false, failed: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);
  return state;
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex min-h-8 items-center gap-1 self-start text-sm font-semibold text-ar-primary-ink no-underline hover:underline">
      <ShellIcon d={ICONS.chevronLeft} size={16} />
      {label}
    </Link>
  );
}

/** Not found / failed to load, with a way back to the list. */
export function LoadProblem({ failed, onRetry, t }: { failed: 'notFound' | 'error'; onRetry: () => void; t: T }) {
  return (
    <section role="alert" className={`${cardClass} flex flex-col items-start gap-3 px-5 py-6`}>
      <p className="m-0 text-[15px] text-ar-ink">{failed === 'notFound' ? t('form.notFound') : t('form.loadFailed')}</p>
      <div className="flex flex-wrap gap-2">
        {failed === 'error' && (
          <button type="button" onClick={onRetry} className={outlineBtn}>
            {t('retry')}
          </button>
        )}
        <Link href="/customers" className={outlineBtn}>
          {t('form.toList')}
        </Link>
      </div>
    </section>
  );
}

/** Số đơn · Đã chi · Đang thuê, as on the list panel. Đã chi leaves out cancelled orders. */
export function StatsGrid({ summary, loading, t, money }: { summary: CustomerSummary; loading: boolean; t: T; money: Money }) {
  const stat = (label: string, value: string | number | null) => (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-ar-surface-muted px-3 py-2.5">
      <span className="text-sm text-ar-muted">{label}</span>
      {loading ? <Skeleton className="mt-1 h-5 w-14" /> : <span className="truncate text-lg font-bold tabular-nums">{value === null ? '—' : value}</span>}
    </div>
  );
  return (
    <div className="grid grid-cols-3 gap-2">
      {stat(t('detail.orders'), summary.orders)}
      {stat(t('detail.spent'), summary.spent === null ? null : money(summary.spent))}
      {stat(t('detail.renting'), summary.renting)}
    </div>
  );
}

export function Avatar({ text }: { text: string }) {
  return (
    <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-ar-renting-bg text-[17px] font-bold text-ar-renting">
      {text}
    </span>
  );
}

export function CallButton({ phone, label }: { phone: string; label: string }) {
  return (
    <a
      href={`tel:${phone}`}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle"
    >
      <ShellIcon d={ICONS.phone} size={18} />
    </a>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-64 min-w-0 flex-[2_1_560px] rounded-2xl" />
        <Skeleton className="h-48 min-w-0 flex-[1_1_320px] rounded-2xl" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Điểm thưởng (only asked for when the shop's loyalty program is active)
// ----------------------------------------------------------------------------

interface LoyaltyData {
  loading: boolean;
  summary: LoyaltyCustomerSummary | null;
  transactions: LoyaltyTransaction[];
}

function useLoyalty(customerId: number, enabled: boolean): LoyaltyData {
  const [state, setState] = useState<LoyaltyData>({ loading: enabled, summary: null, transactions: [] });
  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, summary: null, transactions: [] });
      return;
    }
    let cancelled = false;
    setState({ loading: true, summary: null, transactions: [] });
    Promise.all([
      loyaltyApi.getCustomerSummary(customerId).catch(() => null),
      loyaltyApi.getCustomerTransactions(customerId, { page: 1, limit: 5 }).catch(() => null),
    ]).then(([s, tx]) => {
      if (cancelled) return;
      setState({
        loading: false,
        summary: s && s.success && s.data ? s.data : null,
        transactions: tx && tx.success && tx.data ? tx.data.transactions || [] : [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, enabled]);
  return state;
}

export function LoyaltyCard({ customerId, enabled, t }: { customerId: number; enabled: boolean; t: T }) {
  const data = useLoyalty(customerId, enabled);
  if (!enabled || (!data.loading && !data.summary)) return null;
  const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('vi-VN');
  const s = data.summary;
  const stat = (label: string, value: string) => (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-ar-surface-muted px-3 py-2.5">
      <span className="text-sm text-ar-muted">{label}</span>
      {data.loading ? <Skeleton className="mt-1 h-5 w-12" /> : <span className="truncate text-lg font-bold tabular-nums">{value}</span>}
    </div>
  );
  return (
    <section aria-labelledby="loyalty-title" className={`${cardClass} overflow-hidden`}>
      <div className="flex flex-col gap-3.5 px-5 pb-4 pt-[18px]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="loyalty-title" className="m-0 text-lg font-bold">
            {t('profile.loyalty.title')}
          </h2>
          {s?.tier?.name && <span className="rounded-[7px] bg-ar-reserved-bg px-2 py-[3px] text-sm font-bold text-ar-reserved">{s.tier.name}</span>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stat(t('profile.loyalty.points'), num(s?.points))}
          {stat(t('profile.loyalty.earned'), num(s?.totalEarned))}
          {stat(t('profile.loyalty.redeemed'), num(s?.totalRedeemed))}
        </div>
      </div>
      {!data.loading && (
        <>
          <div className="border-t border-ar-subtle bg-ar-surface-muted px-5 pb-1.5 pt-2.5">
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">{t('profile.loyalty.history')}</span>
          </div>
          {data.transactions.length === 0 ? (
            <p className="m-0 px-5 py-4 text-sm text-ar-muted">{t('profile.loyalty.noHistory')}</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {data.transactions.map((tx) => {
                const iso = tx.createdAt instanceof Date ? tx.createdAt.toISOString() : String(tx.createdAt);
                const day = dayText(getLocalDateKey(iso));
                return (
                  <li key={tx.id} className="flex items-center gap-3 border-t border-ar-subtle px-5 py-2.5 first:border-t-0">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15px]">{tx.description || tx.type}</span>
                      <span className="truncate text-sm tabular-nums text-ar-muted">{[day, tx.outletName].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className={`whitespace-nowrap text-[15px] font-bold tabular-nums ${tx.points >= 0 ? 'text-ar-done' : 'text-ar-danger'}`}>
                      {tx.points >= 0 ? '+' : ''}
                      {num(tx.points)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
