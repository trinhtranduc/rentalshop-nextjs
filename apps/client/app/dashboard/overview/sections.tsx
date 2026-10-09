'use client';

/**
 * Tổng quan sections (#514, redrawn in #604): numbers and small charts on the page, the detail in the drawer.
 * Series colours come from the `ar-chart-*` tokens; text always uses ink tokens.
 */
import React from 'react';
import Link from 'next/link';
import {
  chartBars,
  formatDayLabel,
  initials,
  progressPercent,
  topBars,
  topCustomerBars,
  type TopBar,
  type TopCustomerLike,
  type ChartMode,
  type ChipTone,
  type DetailKind,
  type SeriesPointLike,
  type Tile,
  type TileChip,
  type TodayRow,
  type TodayWork,
  type TopProductLike,
} from '../overview-model';

/** `t` from `useTranslations('dashboard')`. */
export type T = (key: string, values?: Record<string, string | number>) => string;
export type Money = (amount: number | null | undefined) => string;

export const cardClass = 'rounded-2xl border border-ar-line bg-ar-surface shadow-ar';
const h2Class = 'm-0 text-base font-semibold text-ar-ink';

/** Diagonal hatch for "upcoming / expected" marks. */
export const hatch = (token: string) =>
  `repeating-linear-gradient(135deg, rgb(var(--ar-${token})) 0 2px, transparent 2px 6px)`;

export function useCompact(locale: string) {
  return React.useMemo(() => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }), [locale]);
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-lg bg-ar-subtle ${className}`} />;
}

export function LoadFailed({ t, onRetry }: { t: T; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 py-2 text-[15px] text-ar-muted">
      <span>{t('home.loadFailed')}</span>
      <button
        type="button"
        onClick={onRetry}
        className="h-9 rounded-[10px] border border-ar-line px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle"
      >
        {t('home.retry')}
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// KPI tiles
// ----------------------------------------------------------------------------

export const TILE_LABEL: Record<DetailKind, string> = {
  orderValue: 'home.kpi.orderValue',
  collected: 'home.kpi.collected',
  outstanding: 'home.kpi.outstanding',
  collateral: 'home.kpi.collateral',
};

const CHIP_CLASS: Record<ChipTone, string> = {
  up: 'bg-ar-done-bg text-ar-done',
  down: 'bg-ar-late-bg text-ar-late',
  warn: 'bg-ar-unprepared-bg text-ar-unprepared',
  info: 'bg-ar-reserved-bg text-ar-reserved',
};

export function Chip({ chip, t }: { chip: TileChip; t: T }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-[3px] text-xs font-semibold ${CHIP_CLASS[chip.tone]}`}>
      {t(chip.key, chip.values)}
    </span>
  );
}

export const tileValue = (tile: Tile, money: Money) =>
  tile.value == null ? '—' : tile.signed && tile.value > 0 ? `+${money(tile.value)}` : money(tile.value);

export function KpiTiles({
  tiles,
  spark,
  forecast,
  todayKey,
  loading,
  t,
  money,
  onOpen,
}: {
  tiles: Tile[];
  /** Sparkline points per tile; a tile without a per-day series has none */
  spark: Partial<Record<DetailKind, string | null>>;
  /** Thực thu: collected vs expected from today to the end of the range (#612), only when the API sends one */
  forecast: { collected: number; forecast: number; pct: number; until: string } | null;
  /** Shop today, to word the forecast "hôm nay" or "đến DD/MM" */
  todayKey: string;
  loading: boolean;
  t: T;
  money: Money;
  onOpen: (kind: DetailKind) => void;
}) {
  return (
    <section aria-label={t('home.tiles.label')} className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
      {tiles.map((tile) => {
        const label = t(TILE_LABEL[tile.kind]);
        const value = tileValue(tile, money);
        const points = spark[tile.kind];
        return (
          <button
            key={tile.kind}
            type="button"
            data-detail-tile={tile.kind}
            aria-haspopup="dialog"
            aria-label={t('home.tiles.open', { label, value })}
            onClick={() => onOpen(tile.kind)}
            disabled={loading}
            className={`${cardClass} flex min-w-0 flex-col gap-2.5 px-[18px] pb-4 pt-[18px] text-left text-ar-ink hover:border-ar-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ar-primary disabled:cursor-default`}
          >
            <span className="flex w-full items-center justify-between text-sm text-ar-ink-2">
              {label}
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ar-muted">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
            {loading ? (
              <Skeleton className="h-8 w-40" />
            ) : (
              <span className="truncate text-[26px] font-bold leading-8 tracking-[-0.01em] tabular-nums">{value}</span>
            )}
            {!loading && tile.kind === 'collected' && forecast && (
              <span className="flex w-full flex-col gap-1.5">
                <span
                  className="flex h-1.5 w-full gap-[2px]"
                  title={
                    forecast.until === todayKey
                      ? t('home.tiles.forecastTip', { collected: money(forecast.collected), forecast: money(forecast.forecast) })
                      : t('home.tiles.forecastTipUntil', { collected: money(forecast.collected), forecast: money(forecast.forecast), day: `${forecast.until.slice(8, 10)}/${forecast.until.slice(5, 7)}` })
                  }
                >
                  <span className="rounded-l-[3px] bg-ar-chart-blue" style={{ width: `${forecast.pct}%` }} />
                  <span
                    className="flex-1 rounded-r-[3px] border-[1.5px] border-ar-chart-blue"
                    style={{ background: hatch('chart-blue') }}
                  />
                </span>
                <span className="text-xs text-ar-muted">
                  {forecast.until === todayKey
                    ? t('home.tiles.forecast', { amount: money(forecast.forecast) })
                    : t('home.tiles.forecastUntil', { amount: money(forecast.forecast), day: `${forecast.until.slice(8, 10)}/${forecast.until.slice(5, 7)}` })}
                </span>
              </span>
            )}
            <span className="flex min-h-[28px] w-full items-center justify-between gap-2">
              {loading ? (
                <Skeleton className="h-5 w-20" />
              ) : tile.chip || tile.count ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  {tile.chip && <Chip chip={tile.chip} t={t} />}
                  {tile.count && <Chip chip={tile.count} t={t} />}
                </span>
              ) : (
                <span />
              )}
              {!loading && points && (
                <svg aria-hidden="true" width="96" height="28" viewBox="0 0 96 28" className="flex-none overflow-visible">
                  <polyline points={points} fill="none" stroke="rgb(var(--ar-chart-blue))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </button>
        );
      })}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Chart
// ----------------------------------------------------------------------------

export function CollectedChart({
  series,
  loading,
  failed,
  onRetry,
  weekdays,
  todayKey,
  locale,
  t,
  money,
}: {
  series: SeriesPointLike[] | null;
  todayKey: string;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  weekdays: string[];
  locale: string;
  t: T;
  money: Money;
}) {
  const [mode, setMode] = React.useState<ChartMode>('collected');
  const [hover, setHover] = React.useState<number | null>(null);
  const bars = chartBars(series, mode, weekdays, todayKey);
  const compact = useCompact(locale);
  const empty = !loading && !failed && bars.every((b) => b.value === 0 && b.forecast === 0);
  const hasForecast = bars.some((b) => b.forecast > 0);
  const todayIndex = bars.findIndex((b) => b.isToday);
  const many = bars.length > 14;
  const cols = { gridTemplateColumns: `repeat(${Math.max(bars.length, 1)}, minmax(0, 1fr))` };
  const tab = (value: ChartMode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => setMode(value)}
      className={`h-8 rounded-lg px-3 text-[13px] ${mode === value ? 'bg-ar-surface font-semibold text-ar-ink shadow-ar' : 'text-ar-ink-2 hover:text-ar-ink'}`}
    >
      {label}
    </button>
  );
  const fmt = (v: number) => (mode === 'collected' ? money(v) : String(v));
  return (
    <section className={`${cardClass} flex min-w-0 flex-[2_1_560px] flex-col gap-4 px-[22px] py-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={h2Class}>{mode === 'collected' ? t('home.chart.collectedTitle') : t('home.chart.ordersTitle')}</h2>
        <div className="flex flex-wrap items-center gap-3.5">
          {mode === 'collected' && hasForecast && (
            <>
              <span className="flex items-center gap-1.5 text-[13px] text-ar-ink-2">
                <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-ar-chart-blue" />
                {t('home.chart.collected')}
              </span>
              <span className="flex items-center gap-1.5 text-[13px] text-ar-ink-2">
                <span aria-hidden="true" className="h-3 w-3 rounded-[3px] border-[1.5px] border-ar-chart-blue" style={{ background: hatch('chart-blue') }} />
                {t('home.chart.forecast')}
              </span>
            </>
          )}
          <div role="tablist" aria-label={t('home.chart.label')} className="flex rounded-[10px] bg-ar-subtle p-[3px]">
            {tab('collected', t('home.chart.collected'))}
            {tab('orders', t('home.chart.orders'))}
          </div>
        </div>
      </div>
      {failed ? (
        <LoadFailed t={t} onRetry={onRetry} />
      ) : loading ? (
        <Skeleton className="h-[236px] w-full" />
      ) : empty ? (
        <p className="m-0 flex h-[236px] items-center justify-center text-[15px] text-ar-muted">{t('home.chart.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: many ? bars.length * 20 : undefined }}>
            <div className="relative pt-5">
              {todayIndex >= 0 && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-1 bottom-0 top-0 grid gap-2 sm:gap-3.5" style={cols}>
                  <span className="relative" style={{ gridColumnStart: todayIndex + 1 }}>
                    <span className="absolute bottom-0 left-1/2 top-4 border-l-[1.5px] border-dashed border-ar-faint" />
                    <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap bg-ar-surface px-1.5 text-[11px] font-semibold leading-4 text-ar-ink-2">
                      {t('home.chart.today')}
                    </span>
                  </span>
                </div>
              )}
              <ul className="relative m-0 grid h-[200px] list-none items-end gap-2 border-b border-ar-line px-1 sm:gap-3.5" style={cols}>
                {bars.map((b, i) => {
                  const tip = b.forecast > 0
                    ? t('home.chart.tipForecast', { day: b.label, value: fmt(b.value), forecast: fmt(b.forecast) })
                    : t('home.chart.tip', { day: b.label, value: fmt(b.value) });
                  const total = b.ratio * 160;
                  const fh = b.forecastRatio * 160;
                  const ah = Math.max(total - fh, b.value > 0 ? 3 : b.forecast > 0 ? 0 : 2);
                  const active = hover === i;
                  const dim = hover !== null && !active;
                  // Keep the tooltip inside the card at both ends of the chart.
                  const edge = i < 2 ? 'left-0' : i > bars.length - 3 ? 'right-0' : 'left-1/2 -translate-x-1/2';
                  return (
                    <li
                      key={b.key}
                      tabIndex={0}
                      aria-label={tip}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover((h) => (h === i ? null : h))}
                      onClick={() => setHover((h) => (h === i ? null : i))}
                      className={`relative flex h-full cursor-default flex-col items-center justify-end gap-1 rounded-md outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ar-primary ${
                        active ? 'bg-ar-subtle' : ''
                      } ${dim ? 'opacity-40' : ''}`}
                    >
                      {active && (
                        <span
                          role="tooltip"
                          className={`pointer-events-none absolute top-0 z-10 flex min-w-[148px] flex-col gap-1 whitespace-nowrap rounded-lg border border-ar-line bg-ar-surface px-3 py-2 text-left text-[12px] text-ar-ink shadow-[0_4px_16px_rgba(15,23,42,0.12)] ${edge}`}
                        >
                          <span className="font-semibold">{b.label}</span>
                          <span className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-ar-ink-2">
                              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] bg-ar-chart-blue" />
                              {mode === 'collected' ? t('home.chart.collected') : t('home.chart.orders')}
                            </span>
                            <span className="font-semibold tabular-nums">{fmt(b.value)}</span>
                          </span>
                          {b.forecast > 0 && (
                            <>
                              <span className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-1.5 text-ar-ink-2">
                                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] border-[1.5px] border-ar-chart-blue" style={{ background: hatch('chart-blue') }} />
                                  {t('home.chart.forecast')}
                                </span>
                                <span className="font-semibold tabular-nums">{fmt(b.forecast)}</span>
                              </span>
                              <span className="flex items-center justify-between gap-3 border-t border-ar-line pt-1">
                                <span className="text-ar-ink-2">{t('home.chart.total')}</span>
                                <span className="font-bold tabular-nums">{fmt(b.value + b.forecast)}</span>
                              </span>
                            </>
                          )}
                        </span>
                      )}
                      {!many && (
                        <span className={`text-[11px] tabular-nums ${b.current ? 'font-bold text-ar-ink' : 'text-ar-muted'}`}>
                          {mode === 'collected' ? compact.format(b.value + b.forecast) : String(b.value)}
                        </span>
                      )}
                      <span className="flex w-full max-w-[44px] flex-col gap-[2px]">
                        {b.forecast > 0 && (
                          <span
                            className="block rounded-t border-[1.5px] border-ar-chart-blue"
                            style={{ height: `${Math.max(fh, 3)}px`, background: hatch('chart-blue') }}
                          />
                        )}
                        {ah > 0 && (
                          <span
                            className={`block ${b.forecast > 0 ? '' : 'rounded-t'} ${b.current || active ? 'bg-ar-chart-blue' : 'bg-ar-chart-blue-soft'}`}
                            style={{ height: `${ah}px` }}
                          />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mt-2 grid gap-2 px-1 sm:gap-3.5" style={cols} aria-hidden="true">
              {bars.map((b, i) => (
                <span
                  key={b.key}
                  className={`flex flex-col items-center text-center text-[11px] leading-[14px] ${b.current ? 'font-bold text-ar-ink' : 'text-ar-muted'} ${
                    many && (bars.length - 1 - i) % 3 !== 0 ? 'invisible' : ''
                  }`}
                >
                  {b.label.split(' ').map((part) => (
                    <span key={part} className="whitespace-nowrap">
                      {part}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Today
// ----------------------------------------------------------------------------

function Counter({
  href,
  label,
  value,
  aria,
  dot,
  tone,
  progress,
}: {
  href: string;
  label: string;
  value: string;
  aria: string;
  dot: string;
  tone?: string;
  progress?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={aria}
      className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-ar-line px-3.5 py-3 text-ar-ink no-underline hover:bg-ar-surface-muted"
    >
      <span className="flex items-center gap-1.5 text-[13px] text-ar-ink-2">
        <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-[2px] ${dot}`} />
        <span className="truncate">{label}</span>
      </span>
      <span className={`text-[28px] font-bold leading-8 tabular-nums ${tone ?? 'text-ar-ink'}`}>{value}</span>
      <span aria-hidden="true" className="relative block h-1 rounded-sm bg-ar-subtle">
        {progress != null && <span className={`absolute inset-y-0 left-0 rounded-sm ${dot}`} style={{ width: `${progress}%` }} />}
      </span>
    </Link>
  );
}

export function TodayCard({
  work,
  loading,
  failed,
  onRetry,
  weekdays,
  t,
}: {
  work: TodayWork | null;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  weekdays: string[];
  t: T;
}) {
  return (
    <section className={`${cardClass} flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 px-[22px] py-5`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={h2Class}>{t('home.today.title')}</h2>
        {work && <span className="text-[13px] text-ar-muted">{formatDayLabel(work.dateKey, weekdays)}</span>}
      </div>
      {failed ? (
        <LoadFailed t={t} onRetry={onRetry} />
      ) : loading || !work ? (
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[92px] w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <Counter
              href="/orders?status=RESERVED"
              label={t('home.today.pickups')}
              value={`${work.pickups.done}/${work.pickups.total}`}
              aria={`${t('home.today.pickups')}: ${t('home.today.pickupsDone', { done: work.pickups.done, total: work.pickups.total })}`}
              dot="bg-ar-chart-blue"
              progress={progressPercent(work.pickups.done, work.pickups.total)}
            />
            <Counter
              href="/orders?status=PICKUPED"
              label={t('home.today.returns')}
              value={`${work.returns.done}/${work.returns.total}`}
              aria={`${t('home.today.returns')}: ${t('home.today.returnsDone', { done: work.returns.done, total: work.returns.total })}`}
              dot="bg-ar-chart-violet"
              progress={progressPercent(work.returns.done, work.returns.total)}
            />
            <Counter
              href="/orders?status=PICKUPED"
              label={t('home.today.overdue')}
              value={String(work.overdueReturns)}
              aria={`${t('home.today.overdue')}: ${work.overdueReturns}`}
              dot="bg-ar-chart-red"
              tone={work.overdueReturns > 0 ? 'text-ar-danger' : undefined}
            />
            <Counter
              href="/orders?status=RESERVED"
              label={t('home.today.noShows')}
              value={String(work.noShows)}
              aria={`${t('home.today.noShows')}: ${work.noShows}`}
              dot="bg-ar-chart-amber"
              tone={work.noShows > 0 ? 'text-ar-unprepared' : undefined}
            />
          </div>
          {work.tomorrow && (
            <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-ar-muted">
              <span>{t('home.today.tomorrow', { day: formatDayLabel(work.tomorrow.dateKey, weekdays) })}</span>
              <span className="font-semibold text-ar-ink-2">
                {t('home.today.tomorrowCounts', { pickups: work.tomorrow.pickups, returns: work.tomorrow.returns })}
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Today's orders
// ----------------------------------------------------------------------------

const MAX_ROWS = 5;

export function TodayOrders({
  rows,
  loading,
  failed,
  onRetry,
  t,
  money,
}: {
  rows: TodayRow[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  t: T;
  money: Money;
}) {
  const shown = rows.slice(0, MAX_ROWS);
  const more = rows.length - shown.length;
  return (
    <section className={`${cardClass} flex min-w-0 flex-[2_1_560px] flex-col px-[22px] py-5`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className={h2Class}>{t('home.orders.title')}</h2>
        <Link href="/orders" className="text-[13px] font-semibold text-ar-primary-ink no-underline hover:underline">
          {t('home.orders.viewAll')}
        </Link>
      </div>
      {failed ? (
        <LoadFailed t={t} onRetry={onRetry} />
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="m-0 pt-1 text-[15px] text-ar-muted">{t('home.orders.empty')}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {shown.map((r) => {
            const tag =
              r.lateDays > 0
                ? { text: t('home.orders.late', { days: r.lateDays }), cls: 'bg-ar-late-bg text-ar-late' }
                : r.kind === 'pickup'
                  ? { text: t('home.orders.pickupTag'), cls: 'bg-ar-reserved-bg text-ar-reserved' }
                  : { text: t('home.orders.returnTag'), cls: 'bg-ar-subtle text-ar-ink-2' };
            const amount = r.money ? t(`home.orders.${r.money.kind}`, { amount: money(r.money.amount) }) : '—';
            const tagEl = (extra: string) => (
              <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tag.cls} ${extra}`}>{tag.text}</span>
            );
            return (
              <li key={r.id} className="border-t border-ar-line-soft">
                <Link
                  href={`/orders/${r.orderNumber}`}
                  className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-ar-ink no-underline hover:bg-ar-surface-muted sm:grid-cols-[36px_minmax(0,1fr)_auto_auto]"
                >
                  <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-ar-subtle text-[13px] font-semibold text-ar-ink-2">
                    {initials(r.customerName)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">{r.customerName || `#${r.orderNumber}`}</span>
                    <span className="flex items-center gap-2 text-xs tabular-nums text-ar-muted">
                      #{r.orderNumber}
                      {tagEl('sm:hidden py-0.5')}
                    </span>
                  </span>
                  {tagEl('hidden sm:inline-flex')}
                  <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums sm:min-w-[92px]">{amount}</span>
                </Link>
              </li>
            );
          })}
          {more > 0 && (
            <li className="border-t border-ar-line-soft pt-2.5">
              <Link href="/orders" className="text-[13px] text-ar-muted no-underline hover:underline">
                {t('home.orders.more', { count: more })}
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Top products
// ----------------------------------------------------------------------------

export function TopProducts({
  products,
  onViewAll,
  loading,
  locale,
  t,
  money,
}: {
  products: TopProductLike[];
  loading: boolean;
  locale: string;
  t: T;
  money: Money;
  onViewAll?: () => void;
}) {
  return (
    <TopList
      onViewAll={onViewAll}
      ns="home.top"
      countKey="home.top.rentals"
      bars={topBars(products)}
      href={(id) => `/products/${id}`}
      loading={loading}
      locale={locale}
      t={t}
      money={money}
    />
  );
}

/** Top customers of the period (#620): who brought the most money in. */
export function TopCustomers({
  customers,
  onViewAll,
  loading,
  locale,
  t,
  money,
}: {
  customers: TopCustomerLike[];
  loading: boolean;
  locale: string;
  t: T;
  money: Money;
  onViewAll?: () => void;
}) {
  return (
    <TopList
      onViewAll={onViewAll}
      ns="home.topCustomers"
      countKey="home.topCustomers.orders"
      bars={topCustomerBars(customers)}
      href={(id) => `/customers/${id}`}
      loading={loading}
      locale={locale}
      t={t}
      money={money}
    />
  );
}

function TopList({
  onViewAll,
  ns,
  countKey,
  bars,
  href,
  loading,
  locale,
  t,
  money,
}: {
  ns: string;
  countKey: string;
  bars: TopBar[];
  href: (id: TopBar['id']) => string;
  loading: boolean;
  locale: string;
  t: T;
  money: Money;
  onViewAll?: () => void;
}) {
  const compact = useCompact(locale);
  return (
    <section className={`${cardClass} flex min-w-0 flex-[1_1_320px] flex-col gap-3 px-[22px] py-5`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={h2Class}>
          {t(`${ns}.title`)} <span className="text-[13px] font-normal text-ar-muted">· {t(`${ns}.subtitle`)}</span>
        </h2>
        {onViewAll && !loading && bars.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex-none text-[13px] font-semibold text-ar-primary-ink hover:underline"
          >
            {t('home.orders.viewAll')}
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : bars.length === 0 ? (
        <p className="m-0 text-[15px] text-ar-muted">{t(`${ns}.empty`)}</p>
      ) : (
        bars.map((p) => {
          const tip = t(`${ns}.tooltip`, { name: p.name, amount: money(p.value), rentals: t(countKey, { count: p.rentals }) });
          return (
            <Link
              key={p.id}
              href={href(p.id)}
              title={tip}
              aria-label={tip}
              className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg text-ar-ink no-underline hover:bg-ar-surface-muted"
            >
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-ar-subtle text-xs font-semibold text-ar-ink-2">
                {initials(p.name).slice(0, 1)}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[13px]">{p.name}</span>
                <span aria-hidden="true" className="relative block h-1.5 rounded-[3px] bg-ar-subtle">
                  <span className="absolute inset-y-0 left-0 rounded-[3px] bg-ar-chart-blue" style={{ width: `${p.width}%` }} />
                </span>
              </span>
              <span className="text-right text-[13px] font-semibold tabular-nums">{compact.format(p.value)}</span>
            </Link>
          );
        })
      )}
    </section>
  );
}
