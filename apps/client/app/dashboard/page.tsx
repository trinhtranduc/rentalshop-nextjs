'use client';

/**
 * Tổng quan (#514). Money and rankings come from GET /api/analytics/period, the day's work from
 * GET /api/analytics/outlet-operations. Mapping lives in ./overview-model (unit-tested).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useFormatCurrency } from '@rentalshop/ui';
import { useAuth, useDashboardTranslations, usePermissions } from '@rentalshop/hooks';
import { analyticsApi, formatDateKeyInTimeZone, getLocalDateKey, SHOP_TIMEZONE } from '@rentalshop/utils';
import { DateRangeField } from '../components/date-range/RangeCalendar';
import { useOutletOperations } from './OutletOperationsPanel';
import {
  OVERVIEW_PERIODS,
  buildKpis,
  buildMoney,
  buildTodayRows,
  buildTodayWork,
  chartRange,
  formatRangeLabel,
  periodRange,
  type DayRange,
  type OverviewPeriod,
  type PeriodReportLike,
} from './overview-model';
import { CollectedChart, KpiCards, MoneyCards, TodayOrders, TodayWorkCard, TopProducts, type T } from './overview/sections';

interface Loadable<V> {
  data: V | null;
  loading: boolean;
  failed: boolean;
}

/** One period report per range; `enabled` false keeps it idle (no revenue permission). */
function usePeriodReport(range: DayRange | null, limit: number, enabled: boolean, nonce: number): Loadable<PeriodReportLike> {
  const [state, setState] = useState<Loadable<PeriodReportLike>>({ data: null, loading: enabled, failed: false });
  const start = range?.startDate;
  const end = range?.endDate;
  useEffect(() => {
    if (!enabled || !start || !end) {
      setState({ data: null, loading: false, failed: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, failed: false }));
    analyticsApi
      .getPeriodReport({ startDate: start, endDate: end, limit })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setState({ data: res.data as PeriodReportLike, loading: false, failed: false });
        else setState({ data: null, loading: false, failed: true });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [start, end, limit, enabled, nonce]);
  return state;
}

export default function DashboardPage() {
  const t = useDashboardTranslations() as unknown as T;
  const locale = useLocale();
  const money = useFormatCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { canViewRevenue } = usePermissions();
  const ready = !authLoading && !!user;

  const weekdays = useMemo(() => t('home.weekdays').split(','), [t]);
  const todayKey = useMemo(() => formatDateKeyInTimeZone(new Date(), SHOP_TIMEZONE), []);

  // Period from the URL; without revenue access only today exists.
  const urlPeriod = searchParams.get('period') as OverviewPeriod | null;
  const period: OverviewPeriod = canViewRevenue && urlPeriod && OVERVIEW_PERIODS.includes(urlPeriod) ? urlPeriod : 'today';
  const customFrom = searchParams.get('from');
  const customTo = searchParams.get('to');
  const range = useMemo(
    () => periodRange(period, todayKey, { from: customFrom, to: customTo }),
    [period, todayKey, customFrom, customTo],
  );
  const chart = useMemo(() => chartRange(period, range), [period, range]);
  const sameRange = chart.startDate === range.startDate && chart.endDate === range.endDate;

  const [nonce, setNonce] = useState(0);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const report = usePeriodReport(range, 5, ready && canViewRevenue, nonce);
  const chartReport = usePeriodReport(sameRange ? null : chart, 1, ready && canViewRevenue && !sameRange, nonce);
  const series = (sameRange ? report.data : chartReport.data)?.series ?? null;
  const chartState = sameRange ? report : chartReport;

  const ops = useOutletOperations();
  const work = useMemo(() => (ops.data ? buildTodayWork(ops.data) : null), [ops.data]);
  const rows = useMemo(() => (ops.data ? buildTodayRows(ops.data, getLocalDateKey) : []), [ops.data]);
  const kpis = useMemo(() => buildKpis(report.data), [report.data]);
  const moneyParts = useMemo(() => buildMoney(report.data), [report.data]);
  const cash = ops.data?.cash ?? null;
  const upcoming = cash ? { toReturn: cash.collateralToReturn, toCollect: cash.collateralToCollect } : null;

  const [customOpen, setCustomOpen] = useState(period === 'custom');

  const go = (next: OverviewPeriod, extra?: { from: string; to: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', next);
    params.delete('from');
    params.delete('to');
    if (extra) {
      params.set('from', extra.from);
      params.set('to', extra.to);
    }
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
  };

  const selectPeriod = (next: OverviewPeriod) => {
    if (next === 'custom') {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    go(next);
  };

  const periods = canViewRevenue ? OVERVIEW_PERIODS : (['today'] as OverviewPeriod[]);
  const activeTab: OverviewPeriod = customOpen ? 'custom' : period;

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-5 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="m-0 text-2xl font-bold text-ar-ink">{t('home.title')}</h1>
          <span className="text-sm text-ar-muted">
            {formatRangeLabel(range, weekdays)}
            {canViewRevenue && range.startDate !== range.endDate ? ` · ${t('home.comparedToPrevious')}` : ''}
          </span>
        </div>
        {periods.length > 1 && (
          <div role="tablist" aria-label={t('home.periods.label')} className="flex flex-wrap gap-1 rounded-[10px] bg-ar-line p-[3px]">
            {periods.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={activeTab === p}
                onClick={() => selectPeriod(p)}
                className={`h-[34px] rounded-lg px-3.5 text-sm ${
                  activeTab === p ? 'bg-ar-surface font-semibold text-ar-ink shadow-ar' : 'text-ar-ink-2 hover:text-ar-ink'
                }`}
              >
                {t(`home.periods.${p}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {customOpen && canViewRevenue && (
        <div className="flex justify-end">
          <DateRangeField
            from={range.startDate > todayKey ? todayKey : range.startDate}
            to={range.endDate > todayKey ? todayKey : range.endDate}
            todayKey={todayKey}
            max={todayKey}
            align="end"
            initialOpen={period !== 'custom'}
            ariaLabel={t('home.periods.custom')}
            className="sm:w-auto"
            onChange={(from, to) => go('custom', { from, to })}
            onClose={() => {
              if (period !== 'custom') setCustomOpen(false);
            }}
          />
        </div>
      )}

      {canViewRevenue && <KpiCards kpis={kpis} loading={!ready || report.loading} t={t} money={money} />}

      <div className="flex flex-wrap gap-4">
        {canViewRevenue && (
          <CollectedChart
            series={series}
            loading={!ready || chartState.loading}
            failed={chartState.failed}
            onRetry={retry}
            weekdays={weekdays}
            todayKey={todayKey}
            locale={locale}
            t={t}
          />
        )}
        <TodayWorkCard work={work} loading={ops.loading} failed={ops.failed} onRetry={ops.reload} weekdays={weekdays} t={t} />
      </div>

      {canViewRevenue && <MoneyCards parts={moneyParts} upcoming={upcoming} loading={!ready || report.loading} t={t} money={money} />}

      <div className="flex flex-wrap gap-4">
        <TodayOrders rows={rows} loading={ops.loading} failed={ops.failed} onRetry={ops.reload} weekdays={weekdays} t={t} money={money} />
        {canViewRevenue && (
          <TopProducts products={report.data?.topProducts ?? []} loading={!ready || report.loading} t={t} money={money} />
        )}
      </div>
    </div>
  );
}
