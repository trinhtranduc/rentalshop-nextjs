'use client';

import React from 'react';
import Link from 'next/link';
import {
  chartBars,
  formatDayLabel,
  progressPercent,
  type ChartMode,
  type Growth,
  type MoneyBreakdown,
  type OverviewKpis,
  type SeriesPointLike,
  type TodayRow,
  type TodayWork,
  type TopProductLike,
} from '../overview-model';

/** `t` from `useTranslations('dashboard')`. */
export type T = (key: string, values?: Record<string, string | number>) => string;
type Money = (amount: number | null | undefined) => string;

export const cardClass = 'rounded-2xl border border-ar-line-soft bg-ar-surface shadow-ar';
const h2Class = 'm-0 text-lg font-bold text-ar-ink';

export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-lg bg-ar-subtle ${className}`} />;
}

export function LoadFailed({ t, onRetry }: { t: T; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-4 text-[15px] text-ar-muted">
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
// KPI cards
// ----------------------------------------------------------------------------

function GrowthText({ growth, t }: { growth: Growth; t: T }) {
  if (growth.kind === 'none') return null;
  if (growth.kind === 'new') return <span className="font-semibold text-ar-done">{t('home.kpi.new')}</span>;
  return (
    <span className={`font-semibold ${growth.up ? 'text-ar-done' : 'text-ar-danger'}`}>
      {growth.up ? '▲' : '▼'} {growth.value}%
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  href,
  tone,
  loading,
}: {
  label: string;
  value: string;
  hint: React.ReactNode;
  href?: string;
  tone?: 'warn';
  loading: boolean;
}) {
  const body = (
    <>
      <span className="text-sm text-ar-muted">{label}</span>
      {loading ? (
        <Skeleton className="my-1 h-8 w-40" />
      ) : (
        <span className={`text-[28px] font-bold leading-9 tracking-[-0.01em] tabular-nums ${tone === 'warn' ? 'text-ar-unprepared' : 'text-ar-ink'}`}>
          {value}
        </span>
      )}
      <span className="text-sm text-ar-muted">{loading ? <Skeleton className="h-4 w-48" /> : hint}</span>
    </>
  );
  const cls = `${cardClass} flex min-w-0 flex-col gap-1 p-4 text-inherit no-underline`;
  return href ? (
    <a href={href} className={`${cls} hover:border-ar-line`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function KpiCards({ kpis, loading, t, money }: { kpis: OverviewKpis; loading: boolean; t: T; money: Money }) {
  const show = (v: number | null) => (v == null ? '—' : money(v));
  const dot = (left: React.ReactNode, right: React.ReactNode) =>
    left ? (
      <>
        {left} · {right}
      </>
    ) : (
      right
    );
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
      <Kpi
        loading={loading}
        label={t('home.kpi.orderValue')}
        value={show(kpis.orderValue)}
        hint={dot(<GrowthText growth={kpis.orderValueGrowth} t={t} />, t('home.kpi.orderValueHint', { count: kpis.newOrders ?? 0 }))}
      />
      <Kpi
        loading={loading}
        href="#thuc-thu"
        label={t('home.kpi.collected')}
        value={show(kpis.collected)}
        hint={dot(<GrowthText growth={kpis.collectedGrowth} t={t} />, t('home.kpi.collectedHint'))}
      />
      <Kpi
        loading={loading}
        href="#con-phai-thu"
        tone="warn"
        label={t('home.kpi.outstanding')}
        value={show(kpis.outstanding)}
        hint={
          kpis.overduePickup > 0 ? (
            <>
              {t('home.kpi.outstandingHint')} ·{' '}
              <span className="font-semibold text-ar-danger">{t('home.kpi.overdueHint', { amount: money(kpis.overduePickup) })}</span>
            </>
          ) : (
            t('home.kpi.outstandingHint')
          )
        }
      />
      <Kpi
        loading={loading}
        href="#the-chan"
        label={t('home.kpi.netReceived')}
        value={show(kpis.netReceived)}
        hint={t('home.kpi.netReceivedHint')}
      />
    </div>
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
}: {
  series: SeriesPointLike[] | null;
  todayKey: string;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  weekdays: string[];
  locale: string;
  t: T;
}) {
  const [mode, setMode] = React.useState<ChartMode>('collected');
  const bars = chartBars(series, mode, weekdays, todayKey);
  const compact = React.useMemo(
    () => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }),
    [locale],
  );
  const empty = !loading && !failed && bars.every((b) => b.value === 0);
  const tab = (value: ChartMode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => setMode(value)}
      className={`h-8 rounded-lg px-3 text-sm ${mode === value ? 'bg-ar-surface font-semibold text-ar-ink shadow-ar' : 'text-ar-muted hover:text-ar-ink'}`}
    >
      {label}
    </button>
  );
  return (
    <section className={`${cardClass} flex min-w-0 flex-[2_1_560px] flex-col gap-4 px-5 pb-5 pt-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={h2Class}>{mode === 'collected' ? t('home.chart.collectedTitle') : t('home.chart.ordersTitle')}</h2>
        <div role="tablist" aria-label={t('home.chart.label')} className="flex rounded-[10px] bg-ar-subtle p-[3px]">
          {tab('collected', t('home.chart.collected'))}
          {tab('orders', t('home.chart.orders'))}
        </div>
      </div>
      {failed ? (
        <LoadFailed t={t} onRetry={onRetry} />
      ) : loading ? (
        <Skeleton className="h-[240px] w-full" />
      ) : empty ? (
        <p className="m-0 flex h-[240px] items-center justify-center text-[15px] text-ar-muted">{t('home.chart.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: bars.length > 14 ? bars.length * 20 : undefined }}>
            <ul
              className="m-0 grid h-[220px] list-none items-end gap-2 border-b border-ar-line px-1 sm:gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.max(bars.length, 1)}, minmax(0, 1fr))` }}
            >
              {bars.map((b) => {
                const text = mode === 'collected' ? compact.format(b.value) : String(b.value);
                return (
                  <li key={b.key} className="flex h-full flex-col items-center justify-end gap-1.5" aria-label={`${b.label}: ${mode === 'collected' ? b.value : text}`}>
                    {bars.length <= 14 && (
                      <span className={`text-xs tabular-nums ${b.current ? 'font-bold text-ar-ink' : 'text-ar-muted'}`}>{text}</span>
                    )}
                    <span
                      className={`block w-full max-w-[56px] rounded-t-md rounded-b-sm ${b.current ? 'bg-ar-primary' : 'bg-ar-primary/25'}`}
                      style={{ height: `${Math.max(b.ratio * 180, b.value > 0 ? 4 : 2)}px` }}
                    />
                  </li>
                );
              })}
            </ul>
            <div
              className="mt-2 grid gap-2 px-1 sm:gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.max(bars.length, 1)}, minmax(0, 1fr))` }}
              aria-hidden="true"
            >
              {bars.map((b, i) => (
                <span
                  key={b.key}
                  className={`flex flex-col items-center text-center text-xs leading-4 sm:flex-row sm:justify-center sm:gap-1 ${
                    b.current ? 'font-bold text-ar-ink' : 'text-ar-muted'
                  } ${bars.length > 14 && (bars.length - 1 - i) % 3 !== 0 ? 'invisible' : ''}`}
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
// Today's work
// ----------------------------------------------------------------------------

function ProgressLine({ href, label, left, done, total, doneText, color }: {
  href: string; label: string; left: number; done: number; total: number; doneText: string; color: string;
}) {
  return (
    <Link href={href} className="flex flex-col gap-2 border-b border-ar-subtle px-5 py-3 text-inherit no-underline hover:bg-ar-surface-muted">
      <span className="flex items-center gap-2">
        <span className="flex-1 text-[15px] font-medium text-ar-ink">{label}</span>
        <span className="text-xl font-bold tabular-nums text-ar-ink">{left}</span>
      </span>
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={doneText}
        className="flex h-1.5 overflow-hidden rounded-full bg-ar-line"
      >
        <span className={color} style={{ width: `${progressPercent(done, total)}%` }} />
      </span>
      <span className="text-sm text-ar-muted">{doneText}</span>
    </Link>
  );
}

function CountLine({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} className="flex min-h-[48px] items-center gap-2 border-b border-ar-subtle px-5 text-inherit no-underline hover:bg-ar-surface-muted">
      <span className="flex-1 text-[15px] text-ar-ink">{label}</span>
      <span className={`text-[17px] font-bold tabular-nums ${count > 0 ? 'text-ar-danger' : 'text-ar-muted'}`}>{count}</span>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ar-faint">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

export function TodayWorkCard({
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
    <section className={`${cardClass} flex min-w-0 flex-[1_1_320px] flex-col pb-2 pt-4`}>
      <div className="flex items-baseline justify-between px-5 pb-2">
        <h2 className={h2Class}>{t('home.today.title')}</h2>
        {work && <span className="text-sm text-ar-muted">{formatDayLabel(work.dateKey, weekdays)}</span>}
      </div>
      {failed ? (
        <LoadFailed t={t} onRetry={onRetry} />
      ) : loading || !work ? (
        <div className="flex flex-col gap-3 px-5 py-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <ProgressLine
            href="/orders?status=RESERVED"
            label={t('home.today.pickups')}
            left={work.pickups.left}
            done={work.pickups.done}
            total={work.pickups.total}
            doneText={t('home.today.pickupsDone', { done: work.pickups.done, total: work.pickups.total })}
            color="bg-ar-primary"
          />
          <ProgressLine
            href="/orders?status=PICKUPED"
            label={t('home.today.returns')}
            left={work.returns.left}
            done={work.returns.done}
            total={work.returns.total}
            doneText={t('home.today.returnsDone', { done: work.returns.done, total: work.returns.total })}
            color="bg-ar-renting"
          />
          <CountLine href="/orders?status=PICKUPED" label={t('home.today.overdue')} count={work.overdueReturns} />
          <CountLine href="/orders?status=RESERVED" label={t('home.today.noShows')} count={work.noShows} />
          {work.tomorrow && (
            <div className="flex min-h-[48px] items-center gap-2 px-5">
              <span className="flex-1 text-[15px] text-ar-muted">
                {t('home.today.tomorrow', { day: formatDayLabel(work.tomorrow.dateKey, weekdays) })}
              </span>
              <span className="text-[15px] font-semibold text-ar-ink">
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
// Money cards
// ----------------------------------------------------------------------------

function Line({ label, value, sub, danger }: { label: React.ReactNode; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[15px]">
      <span className="flex flex-col">
        <span className={danger ? 'font-semibold text-ar-danger' : 'text-ar-ink'}>{label}</span>
        {sub && <span className="text-sm text-ar-muted">{sub}</span>}
      </span>
      <span className={`tabular-nums ${danger ? 'font-semibold text-ar-danger' : 'text-ar-ink'}`}>{value}</span>
    </div>
  );
}

function Total({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="mt-auto flex justify-between border-t border-ar-line pt-2.5 text-[17px] font-bold">
      <span className="text-ar-ink">{label}</span>
      <span className={`tabular-nums ${warn ? 'text-ar-unprepared' : 'text-ar-ink'}`}>{value}</span>
    </div>
  );
}

export function MoneyCards({
  parts: data,
  upcoming,
  loading,
  t,
  money,
}: {
  parts: MoneyBreakdown;
  upcoming: { toReturn?: { securityDeposit: number; orders: number }; toCollect?: { securityDeposit: number; orders: number } } | null;
  loading: boolean;
  t: T;
  money: Money;
}) {
  const neg = (v: number) => (v > 0 ? `−${money(v)}` : money(0));
  const card = `${cardClass} flex flex-col gap-2.5 px-5 py-4`;
  const skeleton = (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  );
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
      <section id="thuc-thu" className={card}>
        <h2 className={`${h2Class} mb-0.5`}>{t('home.money.collectedTitle')}</h2>
        {loading ? skeleton : data.collected ? (
          <>
            <Line label={t('home.money.deposits')} value={money(data.collected.deposits)} />
            <Line label={t('home.money.pickupAndSale')} value={money(data.collected.pickupAndSale)} />
            <Line label={t('home.money.fees')} value={money(data.collected.fees)} />
            <Line label={t('home.money.refunds')} value={neg(data.collected.refunds)} />
            <Total label={t('home.money.collectedTotal')} value={money(data.collected.total)} />
          </>
        ) : (
          <span className="text-[15px] text-ar-muted">—</span>
        )}
      </section>
      <section id="con-phai-thu" className={card}>
        <h2 className={`${h2Class} mb-0.5`}>{t('home.money.outstandingTitle')}</h2>
        {loading ? skeleton : data.outstanding ? (
          <>
            <Line
              label={t('home.money.atPickup')}
              sub={t('home.money.orders', { count: data.outstanding.atPickup.orders })}
              value={money(data.outstanding.atPickup.amount)}
            />
            <Line
              danger={data.outstanding.overduePickup.amount > 0}
              label={t('home.money.overduePickup')}
              sub={t('home.money.callCustomers', { count: data.outstanding.overduePickup.orders })}
              value={money(data.outstanding.overduePickup.amount)}
            />
            <Total warn label={t('home.money.total')} value={money(data.outstanding.total)} />
          </>
        ) : (
          <span className="text-[15px] text-ar-muted">—</span>
        )}
      </section>
      <section id="the-chan" className={card}>
        <h2 className={`${h2Class} mb-0.5`}>{t('home.money.collateralTitle')}</h2>
        {loading ? skeleton : (
          <>
            {data.collateral ? (
              <>
                <Line label={t('home.money.received')} value={money(data.collateral.received)} />
                <Line label={t('home.money.returned')} value={neg(data.collateral.returned)} />
              </>
            ) : (
              <span className="text-[15px] text-ar-muted">—</span>
            )}
            {upcoming && (upcoming.toReturn || upcoming.toCollect) && (
              <div className="mt-0.5 flex flex-col gap-2 rounded-xl bg-ar-surface-muted px-3 py-2.5">
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">{t('home.money.upcoming')}</span>
                {upcoming.toReturn && (
                  <Line
                    label={<>{t('home.money.toReturn')} <span className="text-ar-muted">· {t('home.money.orders', { count: upcoming.toReturn.orders })}</span></>}
                    value={money(upcoming.toReturn.securityDeposit)}
                  />
                )}
                {upcoming.toCollect && (
                  <Line
                    label={<>{t('home.money.toCollect')} <span className="text-ar-muted">· {t('home.money.orders', { count: upcoming.toCollect.orders })}</span></>}
                    value={money(upcoming.toCollect.securityDeposit)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Today's orders
// ----------------------------------------------------------------------------

export function TodayOrders({
  rows,
  loading,
  failed,
  onRetry,
  weekdays,
  t,
  money,
}: {
  rows: TodayRow[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  weekdays: string[];
  t: T;
  money: Money;
}) {
  const day = (key: string | null) => (key ? formatDayLabel(key, weekdays) : '');
  const when = (r: TodayRow) => {
    if (r.kind === 'pickup') {
      const parts = [t('home.orders.pickupOn', { day: day(r.pickupKey) })];
      if (r.returnKey) parts.push(t('home.orders.returnOn', { day: day(r.returnKey) }));
      return parts.join(' · ');
    }
    return r.lateDays > 0 ? t('home.orders.returnDue', { day: day(r.returnKey) }) : t('home.orders.returnOnly', { day: day(r.returnKey) });
  };
  return (
    <section className={`${cardClass} flex min-w-0 flex-[2_1_560px] flex-col overflow-hidden`}>
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className={h2Class}>{t('home.orders.title')}</h2>
        <Link href="/orders" className="text-sm font-semibold text-ar-primary-ink no-underline hover:underline">
          {t('home.orders.viewAll')}
        </Link>
      </div>
      {failed ? (
        <LoadFailed t={t} onRetry={onRetry} />
      ) : loading ? (
        <div className="flex flex-col gap-3 px-5 pb-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="m-0 px-5 pb-5 pt-2 text-[15px] text-ar-muted">{t('home.orders.empty')}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map((r) => {
            const late = r.lateDays > 0;
            const tag = r.kind === 'pickup'
              ? { text: t('home.orders.pickupTag'), cls: 'bg-ar-reserved-bg text-ar-reserved' }
              : { text: t('home.orders.returnTag'), cls: 'bg-ar-renting-bg text-ar-renting' };
            const note = late
              ? { text: t('home.orders.late', { days: r.lateDays }), cls: 'bg-ar-late-bg text-ar-late' }
              : r.notPrepared
                ? { text: t('home.orders.notPrepared'), cls: 'bg-ar-unprepared-bg text-ar-unprepared' }
                : null;
            const pay = r.money
              ? t(`home.orders.${r.money.kind}`, { amount: money(r.money.amount) })
              : '';
            const href = `/orders/${r.orderNumber}`;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-ar-subtle px-5 py-3 text-[15px]">
                <span className={`w-[92px] shrink-0 whitespace-nowrap`}>
                  <span className={`inline-block rounded-[7px] px-2 py-[3px] text-sm font-bold ${tag.cls}`}>{tag.text}</span>
                </span>
                <Link href={href} className="flex min-w-[180px] flex-1 flex-col gap-0.5 text-inherit no-underline">
                  <span className="font-semibold text-ar-ink">{r.customerName || `#${r.orderNumber}`}</span>
                  <span className="text-sm tabular-nums text-ar-muted">
                    #{r.orderNumber} · {when(r)}
                  </span>
                </Link>
                {note && <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs ${note.cls}`}>{note.text}</span>}
                {pay && (
                  <span className={`whitespace-nowrap text-sm tabular-nums ${late ? 'text-ar-danger' : 'text-ar-unprepared'}`}>{pay}</span>
                )}
                <Link
                  href={href}
                  className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-[10px] bg-ar-primary px-3.5 text-sm font-semibold text-ar-on-primary no-underline hover:opacity-95"
                >
                  {r.kind === 'pickup' ? t('home.orders.pickupAction') : t('home.orders.returnAction')}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Top products
// ----------------------------------------------------------------------------

export function TopProducts({ products, loading, t, money }: { products: TopProductLike[]; loading: boolean; t: T; money: Money }) {
  return (
    <section className={`${cardClass} flex min-w-0 flex-[1_1_320px] flex-col pb-2 pt-4`}>
      <h2 className={`${h2Class} px-5 pb-2`}>
        {t('home.top.title')} <span className="text-sm font-normal text-ar-muted">· {t('home.top.subtitle')}</span>
      </h2>
      {loading ? (
        <div className="flex flex-col gap-3 px-5 py-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="m-0 px-5 pb-3 text-[15px] text-ar-muted">{t('home.top.empty')}</p>
      ) : (
        products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="flex min-h-[60px] items-center gap-3 border-t border-ar-subtle px-5 py-1.5 text-inherit no-underline hover:bg-ar-surface-muted"
          >
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt={t('home.top.imageAlt', { name: p.name })} className="h-11 w-11 flex-none rounded-[10px] border border-ar-line object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] border border-ar-line bg-ar-subtle text-ar-muted">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3l4 3 4-3 4 4-3 3v11H7V10L4 7z" />
                </svg>
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-medium text-ar-ink">{p.name}</span>
              <span className="text-sm text-ar-muted">{t('home.top.rentals', { count: p.rentalCount ?? 0 })}</span>
            </span>
            <span className="text-[15px] font-bold tabular-nums text-ar-ink">{money(p.totalRevenue ?? 0)}</span>
          </Link>
        ))
      )}
    </section>
  );
}
