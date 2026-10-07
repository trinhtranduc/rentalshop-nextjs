'use client';

/**
 * Lịch giao trả (#527). The month grid reads GET /api/calendar/orders/count (hand-overs and returns
 * per Vietnam day, late returns for today); the day panel reads GET /api/calendar/orders/by-date
 * (hand-overs, and returns with `kind=return`) and, on today, the late returns of
 * GET /api/analytics/outlet-operations. Month and day are kept in the URL.
 */
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFormatCurrency } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import {
  analyticsApi,
  apiUrls,
  authenticatedFetch,
  calendarApi,
  getLocalDateKey,
  parseApiResponse,
  type CalendarOrderSummary,
} from '@rentalshop/utils';
import { useShopToday } from '../hooks/useShopToday';
import { ORDER_STATUS } from '@rentalshop/constants';
import { ICONS, ShellIcon } from '../components/shell/Icon';
import { formatDayLabel } from '../dashboard/overview-model';
import { Skeleton, cardClass, outlineBtn, type Money, type T } from '../orders/list/parts';
import {
  buildDayRow,
  cellLabel,
  dayCounts,
  isDayKey,
  mergeReturns,
  monthGrid,
  monthOfKey,
  mondayFirst,
  parseMonth,
  shiftMonth,
  type CountResponseLike,
  type DayCount,
  type DayOrderLike,
  type DayRow,
  type DayRowKind,
  type MonthRef,
} from './calendar-model';

const PAGE_LIMIT = 50;
const toDayKey = (iso: string) => getLocalDateKey(iso);

interface ByDatePage {
  orders: CalendarOrderSummary[];
  pagination?: { page: number; hasMore: boolean; total: number };
}

/** One page of a day's hand-overs (RESERVED by pickup day) or returns (`kind=return`). */
async function fetchDayPage(date: string, kind: DayRowKind, page: number, outletId?: number): Promise<ByDatePage> {
  if (kind === 'pickup') {
    const res = await calendarApi.getOrdersByDate(date, { status: ORDER_STATUS.RESERVED, outletId, limit: PAGE_LIMIT, page });
    if (!res.success || !res.data) throw new Error(res.message || 'BY_DATE');
    return { orders: res.data.orders || [], pagination: res.data.pagination };
  }
  // calendarApi has no `kind`; same endpoint and auth through authenticatedFetch (#362 query param)
  const params = new URLSearchParams({ date, kind: 'return', limit: String(PAGE_LIMIT), page: String(page) });
  if (outletId) params.set('outletId', String(outletId));
  const res = await parseApiResponse<ByDatePage>(await authenticatedFetch(`${apiUrls.calendar.ordersByDate}?${params}`));
  if (!res.success || !res.data) throw new Error('BY_DATE');
  return { orders: res.data.orders || [], pagination: res.data.pagination };
}

interface SectionState {
  rows: DayRow[];
  total: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
  failed: boolean;
}

const emptySection = (loading: boolean): SectionState => ({ rows: [], total: 0, page: 1, hasMore: false, loading, failed: false });

function useDaySection(day: string, kind: DayRowKind, todayKey: string, outletId: number | undefined, enabled: boolean, nonce: number) {
  const [state, setState] = useState<SectionState>(emptySection(enabled));
  const run = useRef(0);

  const load = useCallback(
    (page: number) => {
      const id = ++run.current;
      setState((s) => ({ ...(page === 1 ? emptySection(true) : s), loading: true, failed: false }));
      fetchDayPage(day, kind, page, outletId)
        .then((res) => {
          if (id !== run.current) return;
          const rows = res.orders.map((o) => buildDayRow(o as DayOrderLike, kind, todayKey, toDayKey));
          setState((s) => ({
            rows: page === 1 ? rows : [...s.rows, ...rows.filter((r) => !s.rows.some((x) => x.id === r.id))],
            total: res.pagination?.total ?? (page === 1 ? rows.length : s.total),
            page,
            hasMore: !!res.pagination?.hasMore,
            loading: false,
            failed: false,
          }));
        })
        .catch(() => {
          if (id === run.current) setState((s) => ({ ...s, loading: false, failed: true }));
        });
    },
    [day, kind, todayKey, outletId],
  );

  useEffect(() => {
    if (!enabled || !isDayKey(day)) return;
    load(1);
  }, [enabled, day, load, nonce]);

  return { ...state, more: () => load(state.page + 1), retry: () => load(1) };
}

/** Late returns (planned return before today) for today's panel. */
function useLateReturns(enabled: boolean, todayKey: string, nonce: number): DayRow[] {
  const [rows, setRows] = useState<DayRow[]>([]);
  useEffect(() => {
    if (!enabled) {
      setRows([]);
      return;
    }
    let live = true;
    analyticsApi
      .getOutletOperations()
      .then((res) => {
        if (!live || !res.success || !res.data) return;
        setRows(res.data.overdueReturns.orders.map((o) => buildDayRow(o as DayOrderLike, 'return', todayKey, toDayKey)));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [enabled, todayKey, nonce]);
  return rows;
}

function CalendarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('calendar.web') as unknown as T;
  const money = useFormatCurrency() as Money;
  const { user, loading: authLoading } = useAuth();
  const outletId = user?.outletId ?? undefined;

  const todayKey = useShopToday();
  const weekdays = useMemo(() => t('weekdays').split(','), [t]);
  const monthNames = useMemo(() => t('monthNames').split(','), [t]);

  const month = parseMonth(searchParams.get('month'), searchParams.get('year'), todayKey);
  const dayParam = searchParams.get('day');
  const selected = isDayKey(dayParam) ? dayParam : monthOfKey(todayKey).month === month.month && monthOfKey(todayKey).year === month.year ? todayKey : `${month.year}-${String(month.month).padStart(2, '0')}-01`;

  const setUrl = useCallback(
    (next: MonthRef, day: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('from');
      params.delete('to');
      params.set('month', String(next.month));
      params.set('year', String(next.year));
      if (day) params.set('day', day);
      else params.delete('day');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Month counts
  const [counts, setCounts] = useState<Map<string, DayCount>>(new Map());
  const [countState, setCountState] = useState<{ loading: boolean; failed: boolean }>({ loading: true, failed: false });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (authLoading || !user) return;
    let live = true;
    setCountState({ loading: true, failed: false });
    calendarApi
      .getOrdersCount({ status: ORDER_STATUS.RESERVED, outletId, month: month.month, year: month.year })
      .then((res) => {
        if (!live) return;
        if (!res.success || !res.data) throw new Error('COUNT');
        setCounts(dayCounts(res.data as CountResponseLike, todayKey));
        setCountState({ loading: false, failed: false });
      })
      .catch(() => live && setCountState({ loading: false, failed: true }));
    return () => {
      live = false;
    };
  }, [authLoading, user, outletId, month.month, month.year, todayKey, nonce]);

  const ready = !authLoading && !!user;
  const pickups = useDaySection(selected, 'pickup', todayKey, outletId, ready, nonce);
  const returns = useDaySection(selected, 'return', todayKey, outletId, ready, nonce);
  const lateRows = useLateReturns(ready && selected === todayKey, todayKey, nonce);
  const returnRows = selected === todayKey ? mergeReturns(returns.rows, lateRows) : returns.rows;
  const lateExtra = returnRows.length - returns.rows.length;

  const cells = useMemo(() => monthGrid(month, todayKey), [month.year, month.month, todayKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const panelRef = useRef<HTMLElement>(null);
  const pick = (key: string) => {
    const m = monthOfKey(key);
    setUrl(m, key);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  const title = t('monthTitle', { month: monthNames[month.month - 1] ?? String(month.month), year: month.year });
  const dayTitle = selected === todayKey ? t('dayTitleToday', { day: formatDayLabel(selected, weekdays) }) : formatDayLabel(selected, weekdays);
  const ariaParts = { pickups: t('aria.pickups'), returns: t('aria.returns'), late: t('aria.late') };
  const navBtn = 'flex h-9 w-9 items-center justify-center rounded-[10px] border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle';

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="m-0 min-w-[180px] text-2xl font-bold">{title}</h1>
          <button type="button" aria-label={t('prevMonth')} onClick={() => setUrl(shiftMonth(month, -1), null)} className={navBtn}>
            <ShellIcon d={ICONS.chevronLeft} size={16} />
          </button>
          <button type="button" aria-label={t('nextMonth')} onClick={() => setUrl(shiftMonth(month, 1), null)} className={navBtn}>
            <ShellIcon d={ICONS.chevronRight} size={16} />
          </button>
          <button type="button" onClick={() => setUrl(monthOfKey(todayKey), todayKey)} className={`${outlineBtn} h-9 text-sm`}>
            {t('today')}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-ar-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ar-primary" aria-hidden="true" />
            {t('legend.pickups')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="box-border h-2.5 w-2.5 rounded-full border-2 border-ar-renting" aria-hidden="true" />
            {t('legend.returns')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-ar-danger" aria-hidden="true" />
            {t('legend.late')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
        <section aria-label={t('monthLabel')} className={`${cardClass} min-w-0 overflow-hidden`}>
          <div className="grid grid-cols-7 border-b border-ar-line bg-ar-surface-muted">
            {mondayFirst(weekdays).map((w) => (
              <span key={w} className="px-1.5 py-2 text-xs font-bold tracking-[0.06em] text-ar-muted sm:px-2.5">
                {w}
              </span>
            ))}
          </div>
          {countState.failed && (
            <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-ar-subtle px-4 py-3 text-sm text-ar-muted">
              <span>{t('loadFailed')}</span>
              <button type="button" onClick={() => setNonce((n) => n + 1)} className="h-8 rounded-[10px] border border-ar-line px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle">
                {t('retry')}
              </button>
            </div>
          )}
          <div className="grid grid-cols-7" aria-busy={countState.loading || undefined}>
            {cells.map((c) => {
              const count = c.inMonth ? counts.get(c.key) : undefined;
              const isSel = c.key === selected;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => pick(c.key)}
                  aria-pressed={isSel}
                  aria-current={c.isToday ? 'date' : undefined}
                  aria-label={cellLabel(c, count, ariaParts)}
                  className={`flex min-h-[64px] min-w-0 flex-col items-start gap-1 border-0 border-b border-r border-ar-subtle px-1.5 py-1.5 text-left sm:min-h-[112px] sm:px-2.5 sm:py-2 ${
                    isSel ? 'bg-ar-primary-soft shadow-[inset_0_0_0_2px_rgb(var(--ar-primary))]' : 'bg-ar-surface hover:bg-ar-surface-muted'
                  }`}
                >
                  <span
                    className={`text-sm tabular-nums ${
                      c.isToday
                        ? 'flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ar-primary font-bold text-ar-on-primary'
                        : c.inMonth
                          ? 'font-semibold text-ar-ink'
                          : 'text-ar-faint'
                    }`}
                  >
                    {c.day}
                  </span>
                  {countState.loading && c.inMonth && !count ? (
                    <Skeleton className="hidden h-3 w-12 sm:block" />
                  ) : (
                    <CellCounts count={count} t={t} />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section ref={panelRef} aria-label={t('dayPanel')} className={`${cardClass} min-w-0 scroll-mt-4 overflow-hidden`}>
          <div className="px-5 pb-2.5 pt-4">
            <h2 className="m-0 text-lg font-bold">{dayTitle}</h2>
          </div>
          <DaySection
            kind="pickup"
            heading={t('sections.pickups', { count: pickups.total })}
            rows={pickups.rows}
            state={pickups}
            empty={t('emptyPickups')}
            weekdays={weekdays}
            t={t}
            money={money}
          />
          <DaySection
            kind="return"
            heading={t('sections.returns', { count: returns.total + lateExtra })}
            rows={returnRows}
            state={returns}
            empty={t('emptyReturns')}
            weekdays={weekdays}
            t={t}
            money={money}
          />
        </section>
      </div>
    </div>
  );
}

function CellCounts({ count, t }: { count: DayCount | undefined; t: T }) {
  if (!count || (!count.pickups && !count.returns && !count.late)) return null;
  const line = 'flex items-center gap-1 text-xs font-semibold tabular-nums sm:gap-[5px]';
  return (
    <>
      {count.pickups > 0 && (
        <span className={`${line} text-ar-primary-ink`}>
          <span className="h-2 w-2 flex-none rounded-full bg-ar-primary" aria-hidden="true" />
          <span className="hidden sm:inline">{t('cell.pickups', { count: count.pickups })}</span>
          <span className="sm:hidden">{count.pickups}</span>
        </span>
      )}
      {count.returns > 0 && (
        <span className={`${line} text-ar-renting`}>
          <span className="box-border h-2 w-2 flex-none rounded-full border-2 border-ar-renting" aria-hidden="true" />
          <span className="hidden sm:inline">{t('cell.returns', { count: count.returns })}</span>
          <span className="sm:hidden">{count.returns}</span>
        </span>
      )}
      {count.late > 0 && (
        <span className={`${line} text-ar-danger`}>
          <span className="h-2 w-2 flex-none rounded-sm bg-ar-danger" aria-hidden="true" />
          <span className="hidden sm:inline">{t('cell.late', { count: count.late })}</span>
          <span className="sm:hidden">{count.late}</span>
        </span>
      )}
    </>
  );
}

function subText(row: DayRow, t: T, weekdays: string[]): string {
  const s = row.sub;
  const parts: string[] = [];
  if (s?.kind === 'returnOn') parts.push(t('sub.returnOn', { day: formatDayLabel(s.day, weekdays) }));
  else if (s?.kind === 'sameDay') parts.push(t('sub.sameDay'));
  else if (s?.kind === 'pickedOn') parts.push(t('sub.pickedOn', { day: formatDayLabel(s.day, weekdays) }));
  else if (s?.kind === 'late') parts.push(t('sub.late', { day: formatDayLabel(s.day, weekdays), days: s.days }));
  if (row.notPrepared) parts.push(t('sub.notPrepared'));
  return [`#${row.orderNumber}`, ...parts].join(' · ');
}

function DaySection({
  kind,
  heading,
  rows,
  state,
  empty,
  weekdays,
  t,
  money,
}: {
  kind: DayRowKind;
  heading: string;
  rows: DayRow[];
  state: SectionState & { more: () => void; retry: () => void };
  empty: string;
  weekdays: string[];
  t: T;
  money: Money;
}) {
  const headColor = kind === 'pickup' ? 'text-ar-primary-ink' : 'text-ar-renting';
  return (
    <div>
      <div className="border-t border-ar-subtle bg-ar-surface-muted px-5 pb-1.5 pt-2">
        <span className={`text-xs font-bold uppercase tracking-[0.06em] ${headColor}`}>{heading}</span>
      </div>
      {state.failed && rows.length === 0 ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-t border-ar-subtle px-5 py-3 text-sm text-ar-muted">
          <span>{t('dayFailed')}</span>
          <button type="button" onClick={state.retry} className="h-8 rounded-[10px] border border-ar-line px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle">
            {t('retry')}
          </button>
        </div>
      ) : state.loading && rows.length === 0 ? (
        <div className="flex flex-col gap-2 border-t border-ar-subtle px-5 py-3" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className="m-0 border-t border-ar-subtle px-5 py-3 text-sm text-ar-muted">{empty}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map((r) => {
            const late = r.sub?.kind === 'late';
            const moneyCls =
              r.money?.kind === 'fee' ? 'text-ar-danger' : r.money?.kind === 'refund' ? 'text-ar-renting' : 'text-ar-unprepared';
            return (
              <li key={`${r.kind}-${r.id}`} className="border-t border-ar-subtle">
                <Link href={`/orders/${r.orderNumber}`} className="flex items-center gap-2.5 px-5 py-2.5 text-inherit no-underline hover:bg-ar-surface-muted">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-semibold text-ar-ink">{r.name || t('walkIn')}</span>
                    <span className={`text-sm tabular-nums ${late ? 'text-ar-danger' : 'text-ar-muted'}`}>{subText(r, t, weekdays)}</span>
                    {r.products && <span className="truncate text-xs text-ar-muted">{r.products}</span>}
                  </span>
                  {r.money && (
                    <span className={`whitespace-nowrap text-sm tabular-nums ${moneyCls}`}>{t(`money.${r.money.kind}`, { amount: money(r.money.amount) })}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {state.hasMore && (
        <div className="border-t border-ar-subtle px-5 py-2.5">
          <button type="button" onClick={state.more} disabled={state.loading} className={`${outlineBtn} h-9 w-full text-sm`}>
            {t('more')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarContent />
    </Suspense>
  );
}
