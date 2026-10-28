'use client';

/**
 * Tổng quan (#514). Money and rankings come from GET /api/analytics/period, the day's work from
 * GET /api/analytics/outlet-operations. Mapping lives in ./overview-model (unit-tested).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useFormatCurrency } from '@rentalshop/ui';
import { useAuth, useDashboardTranslations, usePermissions } from '@rentalshop/hooks';
import { analyticsApi, getLocalDateKey } from '@rentalshop/utils';
import { useShopToday } from '../hooks/useShopToday';
import { DateRangeField } from '../components/date-range/RangeCalendar';
import { useOutletOperations } from './OutletOperationsPanel';
import { InstallmentReminders } from '../installments/InstallmentReminders';
import {
  OVERVIEW_PERIODS,
  buildKpis,
  buildMoney,
  buildTiles,
  buildTodayRows,
  buildTodayWork,
  chartBars,
  chartRange,
  forecastBar,
  futureQuickRanges,
  addDays,
  formatRangeLabel,
  isDayKey,
  parseDetail,
  periodRange,
  sparkPoints,
  type DayRange,
  type DetailKind,
  type OverviewPeriod,
  type PeriodReportLike,
  showsTodayWork,
  parseTop,
  TOP_ALL_LIMIT,
  type TopKind,
} from './overview-model';
import { CollectedChart, KpiTiles, TodayCard, TodayOrders, TopCustomers, TopProducts, type T } from './overview/sections';
import { DetailDrawer } from './overview/DetailDrawer';
import { BranchPicker, PeriodMenu } from './overview/BranchControls';
import { BranchCompare } from './overview/BranchCompare';
import {
  BRANCH_SELECTION_EVENT,
  branchLabel,
  compareBranches,
  outletsParam,
  readStoredBranches,
  resolveBranchSelection,
  selectionOutletIds,
  showsBranchPicker,
  writeStoredBranches,
  type CompareSort,
  type StorageLike,
} from './branch-model';
import { TopDrawer } from './overview/TopDrawer';
import { useBranchOptions } from './useBranchOptions';

interface Loadable<V> {
  data: V | null;
  loading: boolean;
  failed: boolean;
}

/** localStorage, or null where the browser blocks it */
function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}


/**
 * One period report per range; `enabled` false keeps it idle (no revenue permission).
 * #827: `outletIds` narrows it to some branches; `byOutlet` adds the per-branch rows.
 */
function usePeriodReport(
  range: DayRange | null,
  limit: number,
  enabled: boolean,
  nonce: number,
  outletIds?: number[],
  byOutlet = false,
): Loadable<PeriodReportLike> {
  const [state, setState] = useState<Loadable<PeriodReportLike>>({ data: null, loading: enabled, failed: false });
  const start = range?.startDate;
  const end = range?.endDate;
  const outletKey = outletIds?.join(',') ?? '';
  useEffect(() => {
    if (!enabled || !start || !end) {
      setState({ data: null, loading: false, failed: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, failed: false }));
    analyticsApi
      .getPeriodReport({
        startDate: start,
        endDate: end,
        limit,
        ...(outletKey ? { outletIds: outletKey.split(',').map(Number) } : {}),
        ...(byOutlet ? { byOutlet: true } : {}),
      })
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
  }, [start, end, limit, enabled, nonce, outletKey, byOutlet]);
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
  const todayKey = useShopToday();

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
  // Hôm nay card and today's orders belong to the today period only (#620)
  const todayWork = showsTodayWork(period);
  const sameRange = chart.startDate === range.startDate && chart.endDate === range.endDate;

  // #827: branch picker (MERCHANT with 2+ branches). "Tất cả" = active branches, sent as explicit ids.
  const isMerchant = user?.role === 'MERCHANT';
  const merchantId = (user as { merchant?: { id?: number } | null; merchantId?: number } | null)?.merchant?.id ?? (user as { merchantId?: number } | null)?.merchantId ?? null;
  const branchOptions = useBranchOptions(ready && isMerchant);
  const [stored, setStored] = useState<number[] | null | undefined>(undefined);
  useEffect(() => {
    if (!ready) return;
    setStored(readStoredBranches(browserStorage(), merchantId));
  }, [ready, merchantId]);
  const options = useMemo(() => branchOptions ?? [], [branchOptions]);
  const picker = showsBranchPicker(user?.role, options);
  const urlOutlets = searchParams.get('outlets');
  const selection = useMemo(
    () => (picker && stored !== undefined ? resolveBranchSelection(options, urlOutlets, stored) : []),
    [picker, options, urlOutlets, stored],
  );
  const selectionKey = selection.join(',');
  const outletIds = useMemo(
    () => selectionOutletIds(selectionKey ? selectionKey.split(',').map(Number) : [], options, picker),
    [selectionKey, options, picker],
  );
  // Wait for the branch list (merchant) so the page loads once, with the right branches
  const branchesReady = ready && (!isMerchant || (branchOptions !== null && stored !== undefined));
  const comparing = picker && selection.length >= 2;
  // Remember the selection in this browser and tell the sidebar (label only)
  useEffect(() => {
    if (!picker || !selectionKey) return;
    const ids = selectionKey.split(',').map(Number);
    writeStoredBranches(browserStorage(), merchantId, ids, branchLabel(ids, options));
    try {
      window.dispatchEvent(new Event(BRANCH_SELECTION_EVENT));
    } catch {
      // old browsers: the sidebar reads the label on the next load
    }
  }, [picker, selectionKey, options, merchantId]);

  const [nonce, setNonce] = useState(0);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const report = usePeriodReport(range, 5, branchesReady && canViewRevenue, nonce, outletIds, comparing);
  const chartReport = usePeriodReport(sameRange ? null : chart, 1, branchesReady && canViewRevenue && !sameRange, nonce, outletIds);
  const series = (sameRange ? report.data : chartReport.data)?.series ?? null;
  const chartState = sameRange ? report : chartReport;

  const ops = useOutletOperations(outletIds, branchesReady);
  // "Việc hôm nay" is the API's day: load it again when the Vietnam day turns with the tab open (#589)
  const opsDay = useRef(todayKey);
  const reloadOps = ops.reload;
  useEffect(() => {
    if (opsDay.current === todayKey) return;
    opsDay.current = todayKey;
    void reloadOps();
  }, [todayKey, reloadOps]);
  const work = useMemo(() => (ops.data ? buildTodayWork(ops.data) : null), [ops.data]);
  const rows = useMemo(() => (ops.data ? buildTodayRows(ops.data, getLocalDateKey) : []), [ops.data]);
  const kpis = useMemo(() => buildKpis(report.data), [report.data]);
  const moneyParts = useMemo(() => buildMoney(report.data), [report.data]);
  const cash = ops.data?.cash ?? null;
  const tiles = useMemo(() => buildTiles(report.data, cash), [report.data, cash]);
  // Only Thực thu has a per-day series; the other tiles get no sparkline rather than an invented one
  const spark = useMemo(
    () => ({ collected: chartState.loading ? null : sparkPoints(
            chartBars(series, 'collected', weekdays, todayKey)
              .filter((b) => !isDayKey(b.key) || b.key <= todayKey) // future days are not zero takings
              .map((b) => b.value),
          ) }),
    [series, weekdays, todayKey, chartState.loading],
  );
  const forecast = useMemo(() => forecastBar(kpis.collected, series, todayKey, range), [kpis.collected, series, todayKey, range]);

  // Tile detail lives in the URL (?detail=) so back, refresh and links work
  const detail = canViewRevenue ? parseDetail(searchParams.get('detail')) : null;
  const lastDetail = useRef<DetailKind | null>(null);
  useEffect(() => {
    if (detail) {
      lastDetail.current = detail;
      return;
    }
    const kind = lastDetail.current;
    lastDetail.current = null;
    if (kind) document.querySelector<HTMLElement>(`[data-detail-tile="${kind}"]`)?.focus();
  }, [detail]);
  const setDetail = useCallback(
    (kind: DetailKind | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (kind) params.set('detail', kind);
      else params.delete('detail');
      const qs = params.toString();
      router.push(qs ? `/dashboard?${qs}` : '/dashboard', { scroll: false });
    },
    [router, searchParams],
  );
  // "Xem tất cả" of a top list lives in the URL too (?top=); the full ranking loads only when open (#620)
  const top = canViewRevenue ? parseTop(searchParams.get('top')) : null;
  const topReport = usePeriodReport(range, TOP_ALL_LIMIT, branchesReady && top !== null, nonce, outletIds);
  const setTop = useCallback(
    (kind: TopKind | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (kind) params.set('top', kind);
      else params.delete('top');
      const qs = params.toString();
      router.push(qs ? `/dashboard?${qs}` : '/dashboard', { scroll: false });
    },
    [router, searchParams],
  );
  const periodLabel = period === 'custom' ? formatRangeLabel(range, weekdays) : t(`home.periods.${period}`);
  // #708: each tile lists the rows behind its number, with their total (= the tile)
  // #827: the related list reads the same branches as the cards
  const related = (kind: DetailKind) =>
    `/dashboard/related?kind=${kind}&from=${range.startDate}&to=${range.endDate}${outletIds ? `&outlets=${outletIds.join(',')}` : ''}`;
  const ordersHref: Record<DetailKind, string> = {
    orderValue: related('orderValue'),
    collected: related('collected'),
    outstanding: related('outstanding'),
    collateral: related('collateral'),
  };

  const [customOpen, setCustomOpen] = useState(period === 'custom');

  const go = (next: OverviewPeriod, extra?: { from: string; to: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', next);
    params.delete('detail');
    params.delete('top');
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
  const rangeLabel = formatRangeLabel(range, weekdays);
  const periodName = period === 'custom' ? rangeLabel : t(`home.periods.${period}`);
  const periodButtonLabel = period === 'custom' ? rangeLabel : `${periodName} · ${rangeLabel}`;

  // #827: a new selection goes to the URL (?outlets=, left out for "Tất cả"); the effect above remembers it
  const setSelection = (ids: number[]) => {
    const params = new URLSearchParams(searchParams.toString());
    const value = outletsParam(ids, options);
    if (value) params.set('outlets', value);
    else params.delete('outlets');
    params.delete('detail');
    params.delete('top');
    const qs = params.toString();
    router.push(qs ? `/dashboard?${qs}` : '/dashboard', { scroll: false });
  };
  const [compareSort, setCompareSort] = useState<CompareSort>({ key: 'orderValue', dir: 'desc' });
  const comparison = useMemo(
    () => compareBranches((report.data as { byOutlet?: never[] } | null)?.byOutlet ?? [], options, compareSort),
    [report.data, options, compareSort],
  );

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-5 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[26px] font-bold text-ar-ink">{t('home.title')}</h1>
        {(picker || periods.length > 1) && (
          <div data-overview-controls className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {picker && <BranchPicker options={options} selection={selection} onChange={setSelection} t={t} />}
            {periods.length > 1 && (
              <PeriodMenu periods={periods} active={activeTab} label={periodButtonLabel} shortLabel={periodName} onSelect={selectPeriod} t={t} />
            )}
          </div>
        )}
      </div>

      {customOpen && canViewRevenue && (
        <div className="flex justify-end">
          <DateRangeField
            from={range.startDate}
            to={range.endDate}
            todayKey={todayKey}
            // #612: future days are open so a range can show the expected collections ("dự kiến thu")
            max={addDays(todayKey, 365)}
            quick={futureQuickRanges(todayKey).map((q) => ({ ...q, label: t(`home.custom.quick.${q.key}`) }))}
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

      {canViewRevenue && (
        <KpiTiles
          tiles={tiles}
          spark={spark}
          forecast={forecast}
          todayKey={todayKey}
          loading={!branchesReady || report.loading}
          t={t}
          money={money}
          onOpen={setDetail}
        />
      )}

      {canViewRevenue && comparing && (report.loading || comparison.rows.length > 0) && (
        <BranchCompare
          rows={comparison.rows}
          total={comparison.total}
          loading={!ready || report.loading}
          sort={compareSort}
          onSort={setCompareSort}
          onPick={(id) => setSelection([id])}
          periodLabel={periodButtonLabel}
          t={t}
          money={money}
        />
      )}

      {canViewRevenue && (
        <div className="flex flex-wrap gap-4">
          <CollectedChart
            series={series}
            loading={!ready || chartState.loading}
            failed={chartState.failed}
            onRetry={retry}
            weekdays={weekdays}
            todayKey={todayKey}
            locale={locale}
            t={t}
            money={money}
          />
        </div>
      )}

      {/* Hôm nay: today's orders with the today card beside them (#620) */}
      {todayWork && (
        <div className="flex flex-wrap gap-4">
          <TodayOrders rows={rows} loading={ops.loading} failed={ops.failed} onRetry={ops.reload} t={t} money={money} />
          <TodayCard work={work} loading={ops.loading} failed={ops.failed} onRetry={ops.reload} weekdays={weekdays} t={t} />
        </div>
      )}

      {/* #1199: stages of staged deposits that are late, due today or due tomorrow (nothing for other shops) */}
      {todayWork && <InstallmentReminders data={ops.data} money={money} />}

      {canViewRevenue && (
        <div className="flex flex-wrap gap-4">
          <TopProducts onViewAll={() => setTop('products')} products={report.data?.topProducts ?? []} loading={!ready || report.loading} locale={locale} t={t} money={money} />
          <TopCustomers onViewAll={() => setTop('customers')} customers={report.data?.topCustomers ?? []} loading={!ready || report.loading} locale={locale} t={t} money={money} />
        </div>
      )}

      {top && (
        <TopDrawer
          kind={top}
          report={topReport.data}
          loading={!ready || topReport.loading}
          failed={topReport.failed}
          onRetry={retry}
          periodLabel={periodLabel}
          onClose={() => setTop(null)}
          t={t}
          money={money}
        />
      )}

      {detail && (
        <DetailDrawer
          kind={detail}
          tile={tiles.find((x) => x.kind === detail)!}
          parts={moneyParts}
          cash={cash}
          newOrders={kpis.newOrders}
          periodLabel={periodLabel}
          ordersHref={ordersHref[detail]}
          onClose={() => setDetail(null)}
          t={t}
          money={money}
        />
      )}
    </div>
  );
}
