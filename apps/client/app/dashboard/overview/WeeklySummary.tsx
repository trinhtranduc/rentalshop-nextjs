'use client';

/**
 * #1612 "✦ Tóm tắt tuần" on Tổng quan: a button at the top of the page (red dot until this week is opened) and a
 * right-side panel with last week's AI summary. Figures come from the API; lines marked ✦ are AI text.
 */
import React from 'react';
import { analyticsApi, getLocalDateKey } from '@rentalshop/utils';

import { formatDayLabel } from '../overview-model';
import {
  countBadge,
  dayBars,
  percentBadge,
  showsNewDot,
  showsSummaryButton,
  weekLabel,
  type Change,
  type WeeklySummaryLike,
} from '../weekly-summary-model';
import { DrawerShell } from './DetailDrawer';
import type { Money, T } from './sections';

const TONE = { good: 'text-ar-done', bad: 'text-ar-late' } as const;

/** GET once when the page can read it; other roles get 403 and the button stays hidden */
export function useWeeklySummary(enabled: boolean, nonce: number) {
  const [data, setData] = React.useState<WeeklySummaryLike | null>(null);
  React.useEffect(() => {
    if (!enabled) return;
    let alive = true;
    analyticsApi
      .getWeeklySummary()
      .then((res) => {
        if (alive) setData(res.success ? (res.data as WeeklySummaryLike) : null);
      })
      .catch(() => {
        if (alive) setData(null);
      });
    return () => {
      alive = false;
    };
  }, [enabled, nonce]);
  return { data, setData };
}

export function WeeklySummaryButton({ data, onOpen, t }: { data: WeeklySummaryLike | null; onOpen: () => void; t: T }) {
  if (!showsSummaryButton(data)) return null;
  const dot = showsNewDot(data);
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="weekly-summary-button"
      className="relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-ar-primary bg-ar-surface px-3 text-sm font-semibold text-ar-primary-ink hover:bg-ar-primary-soft"
    >
      <span aria-hidden="true">✦</span>
      {t('home.aiSummary.button')}
      {dot && (
        <span
          role="img"
          aria-label={t('home.aiSummary.newDot')}
          className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-ar-surface bg-ar-chart-red"
        />
      )}
    </button>
  );
}

function Badge({ change, upIsBad, t }: { change?: Change; upIsBad?: boolean; t: T }) {
  const badge = percentBadge(change, upIsBad);
  if (!badge) return null;
  return <em className={`ml-1 text-[11px] font-bold not-italic ${TONE[badge.tone]}`}>{t(`home.tiles.${badge.dir}`, { value: badge.value })}</em>;
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg bg-ar-subtle px-2.5 py-1.5">
      <span className="text-xs text-ar-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-ar-ink">{children}</span>
    </div>
  );
}

function AiLine({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="m-0 flex gap-1.5 text-[13px] leading-snug text-ar-ink">
      <span aria-hidden="true" className="text-ar-primary-ink">✦</span>
      <span>{text}</span>
    </p>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-ar-line pt-3">
      <h3 className="m-0 text-[15px] font-bold text-ar-ink">{title}</h3>
      {children}
    </section>
  );
}

export function WeeklySummaryDrawer({
  initial,
  onLoaded,
  onClose,
  t,
  money,
  weekdays,
  locale,
}: {
  initial: WeeklySummaryLike;
  onLoaded: (data: WeeklySummaryLike) => void;
  onClose: () => void;
  t: T;
  money: Money;
  weekdays: string[];
  locale: string;
}) {
  const [data, setData] = React.useState<WeeklySummaryLike | null>(initial.status === 'NONE' ? null : initial);
  const [failed, setFailed] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);
  const loaded = React.useRef(onLoaded);
  loaded.current = onLoaded;

  // POST returns the stored summary at once, or writes it now (a few seconds)
  React.useEffect(() => {
    let alive = true;
    setFailed(false);
    analyticsApi
      .writeWeeklySummary()
      .then((res) => {
        if (!alive) return;
        if (res.success && res.data) {
          setData(res.data as WeeklySummaryLike);
          loaded.current(res.data as WeeklySummaryLike);
        } else setFailed(true);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [nonce]);

  const titleId = 'weekly-summary-title';
  const scope = initial.branchName ?? t('home.aiSummary.wholeShop');
  const numbers = data?.summary?.numbers ?? null;
  const content = data?.summary?.content ?? null;
  const timeOf = (iso: string) =>
    new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso));

  return (
    <DrawerShell
      titleId={titleId}
      onClose={onClose}
      t={t}
      header={
        <>
          <span id={titleId} className="text-lg font-bold">
            {t('home.aiSummary.title')}
          </span>
          <span className="text-sm text-ar-ink-2">
            {scope} · {weekLabel(initial.week, weekdays)}
          </span>
        </>
      }
    >
      {failed ? (
        <div className="flex flex-col items-start gap-3 py-8 text-sm text-ar-ink-2" data-testid="weekly-summary-failed">
          {t('home.aiSummary.failed')}
          <button type="button" onClick={() => setNonce((n) => n + 1)} className="font-semibold text-ar-primary-ink hover:underline">
            {t('home.retry')}
          </button>
        </div>
      ) : !data ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-sm text-ar-ink-2" data-testid="weekly-summary-loading">
          <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-[3px] border-ar-line border-t-ar-primary motion-reduce:animate-none" />
          {t('home.aiSummary.loading')}
          <span className="text-xs text-ar-muted">{t('home.aiSummary.loadingHint')}</span>
        </div>
      ) : data.status === 'NO_ORDERS' || !content || !numbers ? (
        <p className="m-0 py-16 text-center text-sm text-ar-ink-2" data-testid="weekly-summary-empty">
          {t('home.aiSummary.noOrders')}
        </p>
      ) : (
        <div className="flex flex-col gap-3" data-testid="weekly-summary-ready">
          <p className="m-0 rounded-[10px] bg-ar-primary-soft px-3 py-2 text-sm leading-relaxed text-ar-ink">✦ {content.summary}</p>

          <section className="flex flex-col gap-2 border-t border-ar-line pt-3">
            <h3 className="m-0 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ar-muted">
              {t('home.aiSummary.actions')}
              <span className="rounded-md bg-ar-primary-soft px-1.5 text-[10.5px] normal-case tracking-normal text-ar-primary-ink">AI</span>
            </h3>
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
              {content.actions.map((a, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-snug text-ar-ink">
                  <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-ar-primary text-[11px] font-bold text-ar-on-primary">
                    {i + 1}
                  </span>
                  {a}
                </li>
              ))}
            </ol>
          </section>

          <Section title={t('home.aiSummary.revenue')}>
            <div className="grid grid-cols-2 gap-1.5">
              <Tile label={t('home.kpi.orderValue')}>
                {money(numbers.revenue?.orderValue?.current ?? 0)}
                <Badge change={numbers.revenue?.orderValue} t={t} />
              </Tile>
              <Tile label={t('home.kpi.collected')}>
                {money(numbers.revenue?.collected?.current ?? 0)}
                <Badge change={numbers.revenue?.collected} t={t} />
              </Tile>
              <Tile label={t('home.kpi.outstanding')}>{money(numbers.revenue?.outstanding ?? 0)}</Tile>
              <Tile label={t('home.aiSummary.fees')}>{money(numbers.revenue?.fees ?? 0)}</Tile>
            </div>
            {(numbers.branches ?? []).length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0" data-testid="weekly-summary-branches">
                {(numbers.branches ?? []).map((b) => (
                  <li key={b.outletId} className="flex items-center gap-2 rounded-lg bg-ar-subtle px-2.5 py-1.5">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-semibold text-ar-ink">{b.name}</span>
                      <span className="text-xs text-ar-muted">{t('home.aiSummary.branchOrders', { count: b.newOrders ?? 0 })}</span>
                    </span>
                    <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-ar-ink">
                      {money(b.orderValue.current)}
                      <Badge change={b.orderValue} t={t} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <AiLine text={content.revenueNote} />
          </Section>

          <Section title={t('home.aiSummary.orders')}>
            <div className="grid grid-cols-2 gap-1.5">
              <Tile label={t('home.aiSummary.newOrders')}>
                {numbers.orders?.new?.current ?? 0}
                <CountBadge change={numbers.orders?.new} />
              </Tile>
              <Tile label={t('home.aiSummary.rentSaleCancel')}>
                {numbers.orders?.rent ?? 0} · {numbers.orders?.sale ?? 0} · {numbers.orders?.cancelled ?? 0}
              </Tile>
              <Tile label={t('home.aiSummary.outBack')}>
                {numbers.rentals?.pickedUp ?? 0} · {numbers.rentals?.returned ?? 0}
              </Tile>
              <Tile label={t('home.aiSummary.lateNotPicked')}>
                {numbers.rentals?.late?.current ?? 0}
                <CountBadge change={numbers.rentals?.late} upIsBad /> · {numbers.rentals?.notPickedUp ?? 0}
              </Tile>
            </div>
            <div role="img" aria-label={t('home.aiSummary.byDay')} className="flex h-16 items-end gap-1.5 px-0.5">
              {dayBars(numbers.orders?.byDay, weekdays).map((bar) => (
                <span key={bar.date} className={`flex h-full flex-1 flex-col items-center justify-end gap-0.5 text-[10.5px] ${bar.top ? 'font-bold text-ar-ink' : 'text-ar-muted'}`}>
                  <span
                    title={`${formatDayLabel(bar.date, weekdays)}: ${bar.count}`}
                    className={`block w-full rounded-t ${bar.top ? 'bg-ar-chart-blue' : 'bg-ar-chart-blue-soft'}`}
                    style={{ height: `${bar.height * 0.42}px` }}
                  />
                  {bar.label}
                </span>
              ))}
            </div>
            <AiLine text={content.ordersNote} />
          </Section>

          <Section title={t('home.aiSummary.products')}>
            <ol className="m-0 flex list-none flex-col gap-1 p-0">
              {(numbers.products?.hot ?? []).map((p, i) => (
                <li key={p.productId} className="flex items-baseline gap-2 text-[13px]">
                  <b className="w-3 flex-none text-ar-primary-ink">{i + 1}</b>
                  <span className="min-w-0 flex-1 truncate text-ar-ink">{p.name}</span>
                  <span className="whitespace-nowrap text-xs text-ar-muted">
                    {t('home.aiSummary.times', { count: p.rentals + (p.sales ?? 0) })} · {money(p.revenue)}
                  </span>
                </li>
              ))}
            </ol>
            <div className="grid grid-cols-2 gap-1.5">
              <Tile label={t('home.aiSummary.customers')}>{numbers.customers?.total ?? 0}</Tile>
              <Tile label={t('home.aiSummary.newReturning')}>
                {numbers.customers?.new ?? 0} · {numbers.customers?.returning ?? 0}
              </Tile>
            </div>
            <AiLine text={content.productsNote} />
          </Section>

          {data.summary && (
            <p className="m-0 border-t border-ar-line pt-2 text-xs leading-relaxed text-ar-muted">
              {t('home.aiSummary.footer')}{' '}
              {t('home.aiSummary.written', {
                at: `${formatDayLabel(getLocalDateKey(data.summary.generatedAt), weekdays)} ${timeOf(data.summary.generatedAt)}`,
                next: formatDayLabel(data.nextWeekStart, weekdays),
              })}
            </p>
          )}
        </div>
      )}
    </DrawerShell>
  );
}

function CountBadge({ change, upIsBad }: { change?: Change; upIsBad?: boolean }) {
  const badge = countBadge(change, upIsBad);
  if (!badge) return null;
  return <em className={`ml-1 text-[11px] font-bold not-italic ${TONE[badge.tone]}`}>{badge.text}</em>;
}
