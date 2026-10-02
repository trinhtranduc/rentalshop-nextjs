'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, PackageCheck, Phone, RotateCcw, Wallet } from 'lucide-react';
import { useFormatCurrency } from '@rentalshop/ui';
import { useDashboardTranslations } from '@rentalshop/hooks';
import { analyticsApi, formatFullDateByLocale } from '@rentalshop/utils';
import type { OutletOperations, OutletOperationsList, OutletOperationsOrder } from '@rentalshop/utils';

type TabKey = 'pickupsToday' | 'returnsToday' | 'overdueReturns' | 'noShows';

const TABS: { key: TabKey; icon: React.ElementType; tone: string; activeTone: string }[] = [
  { key: 'pickupsToday', icon: PackageCheck, tone: 'text-blue-700', activeTone: 'border-blue-600 bg-blue-50' },
  { key: 'returnsToday', icon: RotateCcw, tone: 'text-emerald-700', activeTone: 'border-emerald-600 bg-emerald-50' },
  { key: 'overdueReturns', icon: AlertTriangle, tone: 'text-red-700', activeTone: 'border-red-600 bg-red-50' },
  { key: 'noShows', icon: CalendarClock, tone: 'text-amber-700', activeTone: 'border-amber-600 bg-amber-50' },
];

export interface OutletOperationsState {
  data: OutletOperations | null;
  loading: boolean;
  failed: boolean;
  reload: () => void;
}

/** One request feeds both the panel and the "returns in the next 3 days" card (#350). */
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

/**
 * "Việc hôm nay" for the outlet team (#350): what to hand over, take back, chase, or cancel today.
 * Managers also get the deposit and fee totals ("Tiền trong ca"); the API sends `cash: null` to staff.
 */
export function OutletOperationsPanel({ state }: { state: OutletOperationsState }) {
  const t = useDashboardTranslations();
  const locale = useLocale() as 'en' | 'vi';
  const formatMoney = useFormatCurrency();
  const { data, loading, failed, reload: load } = state;
  const [activeTab, setActiveTab] = useState<TabKey>('pickupsToday');

  // Open the most urgent non-empty list first, once per load
  useEffect(() => {
    if (!data) return;
    const firstNonEmpty = (['overdueReturns', 'pickupsToday', 'returnsToday', 'noShows'] as TabKey[]).find(
      (key) => data[key].count > 0
    );
    if (firstNonEmpty) setActiveTab(firstNonEmpty);
  }, [data]);

  const formatDate = (value: string | null) => (value ? formatFullDateByLocale(value, locale) : '');
  // `date` is already a Vietnam day key: format the string, never through Date (browser timezone)
  const formatDayKey = (key: string) => {
    const [y, m, d] = key.split('-');
    return `${d}/${m}/${y}`;
  };

  if (loading && !data) {
    return <div className="mb-6 h-40 rounded-lg border border-gray-200 bg-white animate-pulse" />;
  }
  if (failed || !data) {
    return (
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 flex items-center justify-between">
        <span>{t('operations.loadFailed')}</span>
        <button type="button" onClick={load} className="text-blue-700 font-medium">
          {t('operations.retry')}
        </button>
      </div>
    );
  }

  const active: OutletOperationsList = data[activeTab];

  const renderRow = (order: OutletOperationsOrder) => (
    <li key={order.id} className="py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/orders/${order.orderNumber}`} className="font-medium text-gray-900 hover:text-blue-700 whitespace-nowrap">
            #{order.orderNumber}
          </Link>
          {activeTab === 'pickupsToday' &&
            (order.isReadyToDeliver ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
                <CheckCircle2 className="h-3 w-3" />
                {t('operations.ready')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 whitespace-nowrap">
                <Clock className="h-3 w-3" />
                {t('operations.notReady')}
              </span>
            ))}
          {activeTab === 'overdueReturns' && order.daysOverdue ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 whitespace-nowrap">
              {t('operations.daysOverdue', { days: order.daysOverdue })}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-gray-700 truncate">
          {order.customerName || t('operations.walkIn')}
          {order.customerPhone && (
            <a href={`tel:${order.customerPhone}`} className="ml-2 inline-flex items-center gap-1 text-blue-700 hover:underline">
              <Phone className="h-3 w-3" />
              {order.customerPhone}
            </a>
          )}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 truncate">
          {t('operations.items', { count: order.itemCount })}
          {order.productNames ? ` · ${order.productNames}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right text-xs text-gray-500">
        <div className="whitespace-nowrap">
          {activeTab === 'pickupsToday' || activeTab === 'noShows'
            ? `${t('operations.pickup')}: ${formatDate(order.pickupPlanAt)}`
            : `${t('operations.return')}: ${formatDate(order.returnPlanAt)}`}
        </div>
        {(order.depositAmount > 0 || order.securityDeposit > 0) && (
          <div className="mt-0.5 whitespace-nowrap text-gray-700">
            {t('operations.deposit')}: {formatMoney(order.depositAmount + order.securityDeposit)}
          </div>
        )}
      </div>
    </li>
  );

  const cash = data.cash;

  return (
    <div className={`mb-6 grid grid-cols-1 gap-4 ${cash ? 'lg:grid-cols-3' : ''}`}>
      {/* min-w-0: long product names must truncate instead of widening the grid on phones */}
      <section className={`min-w-0 rounded-lg border border-gray-200 bg-white ${cash ? 'lg:col-span-2' : ''}`}>
        <header className="flex items-baseline justify-between px-4 pt-4">
          <h2 className="text-base font-semibold text-gray-900">{t('operations.title')}</h2>
          <span className="text-xs text-gray-500">{formatDayKey(data.date)}</span>
        </header>
        <div className="grid grid-cols-2 gap-2 px-4 pt-3 sm:grid-cols-4">
          {TABS.map(({ key, icon: Icon, tone, activeTone }) => {
            const selected = key === activeTab;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                aria-pressed={selected}
                className={`rounded-md border px-3 py-2 text-left transition-colors ${
                  selected ? activeTone : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className={`flex items-center gap-1.5 text-xs font-medium ${tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {t(`operations.tabs.${key}`)}
                </span>
                <span className="mt-1 block text-2xl font-bold text-gray-900">{data[key].count}</span>
              </button>
            );
          })}
        </div>
        <div className="px-4 pb-2">
          {active.orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">{t(`operations.empty.${activeTab}`)}</p>
          ) : (
            <ul className="divide-y divide-gray-100">{active.orders.map(renderRow)}</ul>
          )}
          {active.count > active.orders.length && (
            <p className="pb-2 text-center text-xs text-gray-500">
              {t('operations.more', { count: active.count - active.orders.length })}
            </p>
          )}
        </div>
      </section>

      {cash && (
        <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Wallet className="h-4 w-4 text-gray-500" />
            {t('operations.cash.title')}
          </h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-gray-600">{t('operations.cash.depositsHeld')}</dt>
              <dd className="text-xl font-bold text-gray-900">
                {formatMoney(cash.depositsHeld.depositAmount + cash.depositsHeld.securityDeposit)}
              </dd>
              <dd className="text-xs text-gray-500">{t('operations.cash.orders', { count: cash.depositsHeld.orders })}</dd>
            </div>
            <div>
              <dt className="text-gray-600">{t('operations.cash.depositsDueToday')}</dt>
              <dd className="text-xl font-bold text-gray-900">
                {formatMoney(cash.depositsDueToday.depositAmount + cash.depositsDueToday.securityDeposit)}
              </dd>
              <dd className="text-xs text-gray-500">{t('operations.cash.orders', { count: cash.depositsDueToday.orders })}</dd>
            </div>
            <div>
              <dt className="text-gray-600">{t('operations.cash.feesToday')}</dt>
              <dd className="text-xl font-bold text-gray-900">
                {formatMoney(cash.feesToday.lateFee + cash.feesToday.damageFee)}
              </dd>
              <dd className="text-xs text-gray-500">
                {t('operations.cash.feesBreakdown', {
                  late: formatMoney(cash.feesToday.lateFee),
                  damage: formatMoney(cash.feesToday.damageFee),
                })}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}

/**
 * Rentals due back in the next 3 days (#350), replacing the old "active rentals" list that
 * repeated the stat card. Today's returns live in the panel above, so they are not repeated here.
 */
export function UpcomingReturnsCard({ state }: { state: OutletOperationsState }) {
  const t = useDashboardTranslations();
  const locale = useLocale() as 'en' | 'vi';
  const formatMoney = useFormatCurrency();
  const list = state.data?.returnsSoon;

  return (
    <section className="min-w-0 rounded-lg border border-gray-200 bg-white">
      <header className="flex items-baseline justify-between px-4 pt-4">
        <h2 className="text-base font-semibold text-gray-900">{t('operations.returnsSoon.title')}</h2>
        {list && <span className="text-xs text-gray-500">{t('operations.cash.orders', { count: list.count })}</span>}
      </header>
      <div className="px-4 pb-2">
        {!list ? (
          <div className="my-4 h-24 rounded-md bg-gray-50 animate-pulse" />
        ) : list.orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">{t('operations.returnsSoon.empty')}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.orders.slice(0, 8).map((order) => (
              <li key={order.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/orders/${order.orderNumber}`} className="font-medium text-gray-900 hover:text-blue-700 whitespace-nowrap">
                    #{order.orderNumber}
                  </Link>
                  <p className="mt-0.5 text-sm text-gray-700 truncate">
                    {order.customerName || t('operations.walkIn')}
                    {order.customerPhone && (
                      <a href={`tel:${order.customerPhone}`} className="ml-2 inline-flex items-center gap-1 text-blue-700 hover:underline">
                        <Phone className="h-3 w-3" />
                        {order.customerPhone}
                      </a>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-gray-500">
                  <div className="whitespace-nowrap font-medium text-gray-700">
                    {t('operations.return')}: {order.returnPlanAt ? formatFullDateByLocale(order.returnPlanAt, locale) : ''}
                  </div>
                  {(order.depositAmount > 0 || order.securityDeposit > 0) && (
                    <div className="mt-0.5 whitespace-nowrap">
                      {t('operations.deposit')}: {formatMoney(order.depositAmount + order.securityDeposit)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {list && list.count > 8 && (
          <p className="pb-2 text-center text-xs text-gray-500">{t('operations.more', { count: list.count - 8 })}</p>
        )}
      </div>
    </section>
  );
}
