'use client';

/**
 * Đặt online (#1124 PR3): booking requests from the public shop page. Tabs by status (Chờ xác nhận first), the
 * count on each tab from GET /api/booking-requests; a row opens the request. Mockup: tab "Đặt đơn online".
 */
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@rentalshop/hooks';
import { bookingRequestsApi, type BookingRequestStatus, type ShopBookingList } from '@rentalshop/utils';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { cardClass, outlineBtn, Skeleton, type T } from '../list/parts';
import { BOOKING_TABS, bookingRowView, canSeeBookings } from './online-model';

export default function OnlineBookingListPage() {
  const t = useTranslations('orders.web') as unknown as T;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user } = useAuth();
  const raw = (params.get('status') || 'PENDING').toUpperCase();
  const status = (BOOKING_TABS as string[]).includes(raw) ? (raw as BookingRequestStatus) : 'PENDING';
  const [data, setData] = useState<ShopBookingList | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [nonce, setNonce] = useState(0);
  const allowed = canSeeBookings(user?.role);

  useEffect(() => {
    if (!allowed) return;
    let live = true;
    setState('loading');
    bookingRequestsApi
      .list({ status, limit: 50 })
      .then((res) => {
        if (!live) return;
        if (res.success && res.data) {
          setData(res.data);
          setState('ready');
        } else setState('failed');
      })
      .catch(() => live && setState('failed'));
    return () => {
      live = false;
    };
  }, [status, nonce, allowed]);

  const pick = useCallback(
    (s: BookingRequestStatus) => router.push(s === 'PENDING' ? pathname : `${pathname}?status=${s}`, { scroll: false }),
    [router, pathname],
  );

  if (user && !allowed) {
    return <p className="mx-auto max-w-[1280px] px-8 pt-6 text-ar-muted">{t('online.noAccess')}</p>;
  }

  const rows = (data?.requests || []).map((r) => bookingRowView(r));
  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex flex-col gap-1">
          <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-ar-primary-ink no-underline">
            <ShellIcon d={ICONS.chevronLeft} size={16} />
            {t('online.backToOrders')}
          </Link>
          <h1 className="m-0 text-2xl font-bold">{t('online.title')}</h1>
          <span className="text-sm text-ar-muted">{t('online.subtitle')}</span>
        </span>
        <Link href="/settings?tab=merchant#dat-online" className={outlineBtn}>
          {t('online.settings')}
        </Link>
      </div>

      <div role="tablist" aria-label={t('online.title')} className="flex gap-6 overflow-x-auto border-b border-ar-line">
        {BOOKING_TABS.map((key) => {
          const count = data?.counts?.[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={status === key}
              onClick={() => pick(key)}
              className={`-mb-px flex h-11 shrink-0 items-center gap-1.5 border-b-2 text-[15px] ${
                status === key ? 'border-ar-primary font-bold text-ar-ink' : 'border-transparent font-medium text-ar-ink-2 hover:text-ar-ink'
              }`}
            >
              {t(`online.status.${key}`)}
              {count > 0 && (
                <span className={`rounded-full px-1.5 text-xs font-bold ${key === 'PENDING' ? 'bg-ar-danger text-white' : 'bg-ar-subtle text-ar-ink-2'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <section className={`${cardClass} overflow-hidden`} aria-live="polite">
        {state === 'failed' ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm text-ar-muted">
            <span>{t('online.loadFailed')}</span>
            <button type="button" onClick={() => setNonce((n) => n + 1)} className={outlineBtn}>
              {t('retry')}
            </button>
          </div>
        ) : state === 'loading' ? (
          <div className="flex flex-col gap-2 px-5 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="m-0 px-5 py-6 text-center text-[15px] text-ar-muted">{t(`online.empty.${status}`)}</p>
        ) : (
          <ul className="m-0 list-none p-0" data-booking-list>
            {rows.map((r) => (
              <li key={r.id} className="border-t border-ar-subtle first:border-t-0">
                <Link href={`/orders/online/${r.id}`} className={`flex flex-wrap items-center gap-3 px-5 py-3 text-ar-ink no-underline hover:bg-ar-subtle ${r.closed ? 'opacity-60' : ''}`}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-medium">{r.name}</span>
                    <span className="text-sm text-ar-muted">
                      {[r.code, t('online.items', { count: r.itemCount }), r.outletName, r.range].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5 text-sm">
                    <span className="font-semibold">{t(`online.status.${r.status}`)}</span>
                    {r.hoursLeft != null && <span className="text-ar-muted">{t('online.hoursLeft', { hours: r.hoursLeft })}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
