'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Phone, Wallet } from 'lucide-react';
import { CollectionReturnModal, useFormatCurrency, useToast } from '@rentalshop/ui';
import { useDashboardTranslations } from '@rentalshop/hooks';
import { analyticsApi, ordersApi, SHOP_TIMEZONE } from '@rentalshop/utils';
import type { OutletOperations, OutletOperationsOrder } from '@rentalshop/utils';

type GroupKey = 'overdueReturns' | 'pickupsToday' | 'returnsToday' | 'noShows';
type FilterKey = 'all' | GroupKey;

/** Most urgent first: this is also the order of the combined "all" list. */
const GROUPS: GroupKey[] = ['overdueReturns', 'pickupsToday', 'returnsToday', 'noShows'];
const COLLAPSED_ROWS = 6;

/** Timeline window on the Today dashboard, in shop hours (Asia/Ho_Chi_Minh). */
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;

export interface OutletOperationsState {
  data: OutletOperations | null;
  loading: boolean;
  failed: boolean;
  reload: () => void;
}

/** One request feeds the panel, the cash card, the "returns soon" card and the sparkline (#350). */
export function useOutletOperations(outletIds?: number[]): OutletOperationsState {
  const [data, setData] = useState<OutletOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const outletKey = (outletIds || []).join(',');

  const reload = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await analyticsApi.getOutletOperations(outletKey ? outletKey.split(',').map(Number) : undefined);
      if (res.success && res.data) setData(res.data);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [outletKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, failed, reload };
}

// Shop clock, independent of the browser timezone
const clockFormat = new Intl.DateTimeFormat('en-GB', { timeZone: SHOP_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false });
const dayMonthFormat = new Intl.DateTimeFormat('en-GB', { timeZone: SHOP_TIMEZONE, day: '2-digit', month: '2-digit' });

const formatClock = (iso: string | null) => (iso ? clockFormat.format(new Date(iso)) : '');
const formatDayMonth = (iso: string | null) => (iso ? dayMonthFormat.format(new Date(iso)) : '');

/** Position of an instant on the timeline, 0–100 (clamped), from its shop-clock hour. */
function timelinePercent(date: Date): number {
  const [h, m] = clockFormat.format(date).split(':').map(Number);
  const hours = h + m / 60;
  const pct = ((hours - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * 100;
  return Math.min(100, Math.max(0, pct));
}

/** Small trend line (80×24). Decorative: callers give the numbers in an aria-label. */
export function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const width = 80;
  const height = 24;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const y = (v: number) => height - 3 - (v / max) * (height - 6);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const avg = values.slice(0, -1).reduce((sum, v) => sum + v, 0) / (values.length - 1);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" className={`shrink-0 overflow-visible ${className}`}>
      <line x1="0" x2={width} y1={y(avg)} y2={y(avg)} stroke="#d1d5db" strokeDasharray="2 2" />
      <polyline points={points} fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={width} cy={y(values[values.length - 1])} r="2.75" fill="#1d4ed8" />
    </svg>
  );
}

function ProgressBar({ label, done, total, barClass }: { label: string; done: number; total: number; barClass: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold tabular-nums text-gray-900">
          {done}/{total}
        </span>
      </div>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * "Việc hôm nay" for the outlet team (#350): progress of today's handovers and returns, the hours they
 * are booked for, and one line per order that needs someone, most urgent first.
 */
export function OutletOperationsPanel({ state }: { state: OutletOperationsState }) {
  const t = useDashboardTranslations();
  const { data, loading, failed, reload: load } = state;
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const { toastSuccess, toastError } = useToast();
  // Hand-over / take-back straight from the list, with the same dialog as the order page
  const [action, setAction] = useState<{ mode: 'collection' | 'return'; order: any } | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  const openAction = async (mode: 'collection' | 'return', orderNumber: string, id: number) => {
    setOpeningId(id);
    try {
      const res = await ordersApi.getOrderByNumber(orderNumber);
      if (res.success && res.data) setAction({ mode, order: res.data });
      else toastError(t('operations.actions.failed'), res.error || '');
    } finally {
      setOpeningId(null);
    }
  };

  const confirmAction = async (overrides?: { damageFee?: number }) => {
    if (!action) return;
    const { mode, order } = action;
    if (mode === 'collection') {
      const res = await ordersApi.pickupOrder(order.id);
      if (!res.success) throw new Error(res.error || 'pickup failed');
    } else {
      // returnOrder only changes the status: save the damage fee first
      const fee = overrides?.damageFee ?? 0;
      if (fee !== (order.damageFee || 0)) {
        const saved = await ordersApi.updateOrderSettings(order.id, { damageFee: fee });
        if (!saved.success) throw new Error(saved.error || 'damage fee failed');
      }
      const res = await ordersApi.returnOrder(order.id);
      if (!res.success) throw new Error(res.error || 'return failed');
    }
    toastSuccess(mode === 'collection' ? t('operations.actions.handedOver') : t('operations.actions.takenBack'), `#${order.orderNumber}`);
    setAction(null);
    load();
  };

  // Keep the "now" marker roughly in place on a dashboard left open all day
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    if (!data) return [] as { group: GroupKey; order: OutletOperationsOrder }[];
    const groups = filter === 'all' ? GROUPS : [filter];
    return groups.flatMap((group) => data[group].orders.map((order) => ({ group, order })));
  }, [data, filter]);

  if (loading && !data) {
    return <div className="h-72 rounded-lg border border-gray-200 bg-white animate-pulse" />;
  }
  if (failed || !data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 flex items-center justify-between">
        <span>{t('operations.loadFailed')}</span>
        <button type="button" onClick={load} className="min-h-[32px] px-2 text-blue-700 font-medium">
          {t('operations.retry')}
        </button>
      </div>
    );
  }

  const done = data.doneToday ?? { pickups: 0, returns: 0 };
  const notReady = data.pickupsToday.orders.filter((o) => !o.isReadyToDeliver).length;
  const totalCount = GROUPS.reduce((sum, key) => sum + data[key].count, 0);
  const filterCount = filter === 'all' ? totalCount : data[filter].count;
  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);
  const hiddenLoaded = rows.length - visibleRows.length;
  const notLoaded = filterCount - rows.length;

  const marks = [
    ...data.pickupsToday.orders
      .filter((o) => o.pickupPlanAt)
      .map((o) => ({ key: `p-${o.id}`, kind: 'pickup' as const, at: new Date(o.pickupPlanAt as string), order: o })),
    ...data.returnsToday.orders
      .filter((o) => o.returnPlanAt)
      .map((o) => ({ key: `r-${o.id}`, kind: 'return' as const, at: new Date(o.returnPlanAt as string), order: o })),
  ];
  const ticks = [7, 10, 13, 16, 19, 22];
  const nowPct = timelinePercent(now);

  const status = (group: GroupKey, order: OutletOperationsOrder) => {
    switch (group) {
      case 'overdueReturns':
        return { text: t('operations.daysOverdue', { days: order.daysOverdue ?? 1 }), tone: 'font-semibold text-red-700' };
      case 'pickupsToday':
        return { text: t('operations.row.pickupAt', { time: formatClock(order.pickupPlanAt) }), tone: 'text-gray-700' };
      case 'returnsToday':
        return { text: t('operations.row.returnAt', { time: formatClock(order.returnPlanAt) }), tone: 'text-gray-700' };
      default:
        return { text: t('operations.row.noShow', { date: formatDayMonth(order.pickupPlanAt) }), tone: 'font-medium text-amber-800' };
    }
  };

  // Left edge: how urgent the row is, also said in words in the status column
  const urgency = (group: GroupKey, order: OutletOperationsOrder) =>
    group === 'overdueReturns'
      ? (order.daysOverdue ?? 1) >= 3
        ? 'bg-red-600'
        : 'bg-red-300'
      : group === 'noShows'
      ? 'bg-amber-400'
      : 'bg-transparent';

  return (
    <section className="min-w-0 rounded-lg border border-gray-200 bg-white" aria-labelledby="ops-title">
      <header className="flex items-baseline justify-between px-4 pt-4">
        <h2 id="ops-title" className="text-base font-semibold text-gray-900">
          {t('operations.title')}
        </h2>
        <span className="text-xs text-gray-500">{data.date.split('-').reverse().join('/')}</span>
      </header>

      {/* Progress replaces the four big counters */}
      <div className="grid grid-cols-2 gap-4 px-4 pt-3">
        <ProgressBar
          label={t('operations.progress.pickups')}
          done={done.pickups}
          total={done.pickups + data.pickupsToday.count}
          barClass="bg-blue-600"
        />
        <ProgressBar
          label={t('operations.progress.returns')}
          done={done.returns}
          total={done.returns + data.returnsToday.count}
          barClass="bg-emerald-600"
        />
      </div>

      {/* Still to prepare today, and what is coming tomorrow */}
      {(notReady > 0 || data.tomorrow) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pt-2 text-xs text-gray-700">
          {notReady > 0 && (
            <span className="font-medium text-amber-800">
              {t('operations.notReadyCount', { count: notReady, total: data.pickupsToday.count })}
            </span>
          )}
          {data.tomorrow && (
            <span>
              {t('operations.tomorrow', { pickups: data.tomorrow.pickups, returns: data.tomorrow.returns })}
            </span>
          )}
        </div>
      )}

      {/* Booked hours today: when the shop will be busy */}
      <div className="px-4 pt-4">
        <p className="sr-only">
          {t('operations.timeline.summary', { pickups: data.pickupsToday.count, returns: data.returnsToday.count })}
        </p>
        <div aria-hidden="true">
          <div className="relative h-4 text-[11px] tabular-nums text-gray-500">
            {ticks.map((hour) => (
              <span
                key={hour}
                className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                style={{ left: `${((hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * 100}%` }}
              >
                {hour}h
              </span>
            ))}
          </div>
          <div className="relative mt-1.5 h-4">
            <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-gray-200" />
            <div className="absolute top-0 h-4 w-0.5 bg-red-500" style={{ left: `${nowPct}%` }} title={t('operations.timeline.now')} />
            {marks.map((mark) => (
              <span
                key={mark.key}
                title={`${formatClock(mark.at.toISOString())} · #${mark.order.orderNumber} · ${mark.order.customerName || t('operations.walkIn')}`}
                className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  mark.kind === 'pickup' ? 'bg-blue-600' : 'border-[2.5px] border-emerald-600 bg-white'
                }`}
                style={{ left: `${timelinePercent(mark.at)}%` }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              {t('operations.timeline.pickup')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-emerald-600 bg-white" />
              {t('operations.timeline.return')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-0.5 bg-red-500" />
              {t('operations.timeline.now')}
            </span>
          </div>
        </div>
      </div>

      {/* Filter chips: one line, counts instead of big tiles */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto border-t border-gray-100 px-4 pt-3" role="group" aria-label={t('operations.title')}>
        {(['all', ...GROUPS] as FilterKey[]).map((key) => {
          const count = key === 'all' ? totalCount : data[key].count;
          const selected = key === filter;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key);
                setExpanded(false);
              }}
              aria-pressed={selected}
              className={`inline-flex min-h-[32px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors ${
                selected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              } ${!selected && count === 0 ? 'opacity-60' : ''}`}
            >
              {t(`operations.chips.${key}`)}
              <span className={`tabular-nums ${selected ? 'text-white' : key === 'overdueReturns' && count > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-2">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">{t(`operations.empty.${filter}`)}</p>
        ) : (
          <ul className="mt-1 divide-y divide-gray-100">
            {visibleRows.map(({ group, order }) => {
              const { text, tone } = status(group, order);
              const name = order.customerName || t('operations.walkIn');
              return (
                <li key={`${group}-${order.id}`} className="flex items-center gap-3 py-1.5">
                  <span className={`h-7 w-1 shrink-0 rounded-full ${urgency(group, order)}`} aria-hidden="true" />
                  <Link
                    href={`/orders/${order.orderNumber}`}
                    title={order.productNames || undefined}
                    className="grid min-h-[36px] min-w-0 flex-1 grid-cols-[minmax(0,7.5rem)_minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-3 rounded-md text-sm hover:bg-gray-50 max-sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <span className="truncate font-medium text-gray-900">#{order.orderNumber}</span>
                    <span className={`whitespace-nowrap ${tone}`}>
                      {text}
                      {group === 'pickupsToday' && order.isReadyToDeliver && (
                        <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-emerald-600" aria-label={t('operations.ready')} />
                      )}
                    </span>
                    <span className="truncate text-gray-600 max-sm:col-span-2 max-sm:-mt-1 max-sm:text-xs">{name}</span>
                  </Link>
                  {(() => {
                    const mode = group === 'pickupsToday' || group === 'noShows' ? 'collection' : 'return';
                    return (
                      <button
                        type="button"
                        onClick={() => openAction(mode, order.orderNumber, order.id)}
                        disabled={openingId === order.id}
                        className="inline-flex h-8 shrink-0 items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
                      >
                        {mode === 'collection' ? t('operations.actions.handOver') : t('operations.actions.takeBack')}
                      </button>
                    );
                  })()}
                  {order.customerPhone ? (
                    <a
                      href={`tel:${order.customerPhone}`}
                      aria-label={t('operations.call', { name })}
                      title={order.customerPhone}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="h-8 w-8 shrink-0" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {(hiddenLoaded > 0 || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mb-1 min-h-[32px] w-full text-center text-xs font-medium text-blue-700"
          >
            {expanded ? t('operations.showLess') : t('operations.showMore', { count: hiddenLoaded })}
          </button>
        )}
        {expanded && notLoaded > 0 && (
          <p className="pb-2 text-center text-xs text-gray-500">{t('operations.more', { count: notLoaded })}</p>
        )}
      </div>
      {action && (
        <CollectionReturnModal
          isOpen
          onClose={() => setAction(null)}
          order={action.order}
          settingsForm={{
            damageFee: action.order.damageFee || 0,
            securityDeposit: action.order.securityDeposit || 0,
            collateralType: action.order.collateralType || '',
            collateralDetails: action.order.collateralDetails || '',
            notes: action.order.notes || '',
          }}
          mode={action.mode}
          onConfirmPickup={() => confirmAction()}
          onConfirmReturn={(overrides) => confirmAction(overrides)}
        />
      )}
    </section>
  );
}

/**
 * Managers only: the security deposits (thế chấp) the shop holds, what goes back today, fees taken today.
 * The rental deposit (depositAmount) is a prepayment taken off the rent at pickup, never handed back,
 * so it is not counted here (order detail, iOS and Android use the same rule).
 */
export function ShiftCashCard({ state }: { state: OutletOperationsState }) {
  const t = useDashboardTranslations();
  const formatMoney = useFormatCurrency();
  const cash = state.data?.cash;
  if (!cash) return null;

  const held = cash.depositsHeld.securityDeposit;
  const backToday = cash.depositsDueToday.securityDeposit;
  const fees = cash.feesToday.lateFee + cash.feesToday.damageFee;
  const rows = [
    {
      key: 'held',
      label: t('operations.cash.held'),
      value: held,
      hint: t('operations.cash.heldHint', { count: cash.depositsHeld.orders }),
    },
    {
      key: 'back',
      label: t('operations.cash.backToday'),
      value: backToday,
      hint: t('operations.cash.backTodayHint', { count: cash.depositsDueToday.orders }),
    },
    {
      key: 'fees',
      label: t('operations.cash.feesToday'),
      value: fees,
      hint: t('operations.cash.feesBreakdown', { late: formatMoney(cash.feesToday.lateFee), damage: formatMoney(cash.feesToday.damageFee) }),
    },
  ];

  return (
    <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-4" aria-labelledby="cash-title">
      <h2 id="cash-title" className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <Wallet className="h-4 w-4 text-gray-500" aria-hidden="true" />
        {t('operations.cash.title')}
      </h2>
      <dl className="mt-2 divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-2.5">
            <dt className="text-sm font-medium text-gray-900">{row.label}</dt>
            <dd className="row-span-2 text-lg font-bold tabular-nums text-gray-900">{formatMoney(row.value)}</dd>
            <dd className="text-xs text-gray-600">{row.hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Rentals due back in the next 3 days (#350). Today's returns live in the panel, so they are not repeated here.
 * One line per order, like the panel.
 */
export function UpcomingReturnsCard({ state }: { state: OutletOperationsState }) {
  const t = useDashboardTranslations();
  const list = state.data?.returnsSoon;
  const limit = 5;

  return (
    <section className="min-w-0 rounded-lg border border-gray-200 bg-white" aria-labelledby="soon-title">
      <header className="flex items-baseline justify-between px-4 pt-4">
        <h2 id="soon-title" className="text-base font-semibold text-gray-900">
          {t('operations.returnsSoon.title')}
        </h2>
        {list && <span className="text-xs tabular-nums text-gray-500">{list.count}</span>}
      </header>
      <div className="px-4 pb-2">
        {!list ? (
          <div className="my-4 h-16 rounded-md bg-gray-50 animate-pulse" />
        ) : list.orders.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">{t('operations.returnsSoon.empty')}</p>
        ) : (
          <ul className="mt-1 divide-y divide-gray-100">
            {list.orders.slice(0, limit).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.orderNumber}`}
                  className="flex min-h-[36px] items-center gap-3 rounded-md text-sm hover:bg-gray-50"
                >
                  <span className="shrink-0 font-medium text-gray-900">#{order.orderNumber}</span>
                  <span className="min-w-0 flex-1 truncate text-gray-600">{order.customerName || t('operations.walkIn')}</span>
                  <span className="shrink-0 tabular-nums text-gray-700">{formatDayMonth(order.returnPlanAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {list && list.count > limit && (
          <p className="pb-2 text-center text-xs text-gray-500">{t('operations.more', { count: list.count - limit })}</p>
        )}
      </div>
    </section>
  );
}
