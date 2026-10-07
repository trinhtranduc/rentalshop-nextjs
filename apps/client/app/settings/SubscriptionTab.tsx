'use client';

/**
 * Cài đặt → Gói dịch vụ (#557) on the shell tokens: the plan the shop is on, when it expires,
 * usage against the plan limits, and the history of plan changes, renewals and payments.
 * Text and rules live in `subscription-model.ts`; days are Vietnam civil days.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatDateKeyInTimeZone, SHOP_TIMEZONE, subscriptionsApi } from '@rentalshop/utils';
import { outlineBtn, primaryBtn, Skeleton, type T } from '../orders/list/parts';
import { SectionCard } from './sections';
import {
  expiryLine,
  historyItems,
  planLabel,
  priceText,
  subscriptionTag,
  usageRows,
  usageText,
  type ActivityLike,
  type HistoryItem,
  type HistoryTone,
  type PaymentLike,
  type SubscriptionStatus,
  type SubscriptionTag,
} from './subscription-model';

export type SubscriptionLoad = 'loading' | 'ok' | 'none' | 'failed';

const TAG_CLASS: Record<SubscriptionTag, string> = {
  active: 'bg-ar-done-bg text-ar-done',
  trial: 'bg-ar-reserved-bg text-ar-reserved',
  expiring: 'bg-ar-unprepared-bg text-ar-unprepared',
  pastDue: 'bg-ar-unprepared-bg text-ar-unprepared',
  expired: 'bg-ar-late-bg text-ar-late',
  cancelled: 'bg-ar-cancelled-bg text-ar-cancelled',
  paused: 'bg-ar-cancelled-bg text-ar-cancelled',
};

const DOT_CLASS: Record<HistoryTone, string> = {
  up: 'bg-ar-primary',
  renew: 'bg-ar-done',
  start: 'bg-ar-reserved',
  stop: 'bg-ar-muted',
  pay: 'bg-ar-renting',
  other: 'bg-ar-line-strong',
};

const toKey = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : formatDateKeyInTimeZone(d, SHOP_TIMEZONE);
};

interface SubscriptionTabProps {
  status: SubscriptionStatus | null;
  load: SubscriptionLoad;
  onRetry: () => void;
  /** Shown only when upgrade / extend are switched on. */
  onUpgrade?: () => void;
  onExtend?: () => void;
}

export function SubscriptionTab({ status, load, onRetry, onUpgrade, onExtend }: SubscriptionTabProps) {
  const t = useTranslations('settings.web') as unknown as T;
  const locale = useLocale();
  const weekdays = useMemo(() => t('subscription.weekdays').split(','), [t]);
  const n = useCallback((v: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(v), [locale]);

  if (load === 'loading' && !status) {
    return (
      <SectionCard title={t('subscription.title')}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72" />
      </SectionCard>
    );
  }
  if (!status || load === 'none' || load === 'failed') {
    return (
      <SectionCard title={t('subscription.title')}>
        <p className={`m-0 text-[15px] ${load === 'failed' ? 'text-ar-danger' : 'text-ar-muted'}`}>
          {load === 'none' ? t('subscription.noSubscription') : t('subscription.loadFailed')}
        </p>
        {load !== 'none' && (
          <div>
            <button type="button" onClick={onRetry} className={outlineBtn}>
              {t('subscription.retry')}
            </button>
          </div>
        )}
      </SectionCard>
    );
  }

  const tag = subscriptionTag(status);
  const expiry = expiryLine(status, tag, toKey, weekdays, t);
  const usage = usageRows(status.limits, status.usage);
  const expiryTone = tag === 'expired' ? 'text-ar-danger' : tag === 'expiring' ? 'text-ar-unprepared' : 'text-ar-ink-2';
  const note = tag === 'expired' ? t('subscription.expiredNote') : status.cancelAtPeriodEnd || tag === 'cancelled' ? t('subscription.cancelNote') : '';
  const actions =
    onUpgrade || onExtend ? (
      <>
        {onExtend && (
          <button type="button" onClick={onExtend} className={outlineBtn}>
            {t('subscription.extend')}
          </button>
        )}
        {onUpgrade && (
          <button type="button" onClick={onUpgrade} className={primaryBtn}>
            {t('subscription.upgrade')}
          </button>
        )}
      </>
    ) : undefined;

  return (
    <>
      <SectionCard
        title={t('subscription.title')}
        action={<span className={`inline-block whitespace-nowrap rounded-[7px] px-2 py-[3px] text-sm font-bold ${TAG_CLASS[tag]}`}>{t(`subscription.tag.${tag}`)}</span>}
        footer={actions}
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="m-0 text-2xl font-bold leading-tight">{planLabel(status.planName, t)}</p>
            <p className="m-0 text-[17px] font-semibold tabular-nums text-ar-ink-2">{priceText(status, t)}</p>
          </div>
          {(expiry.text || expiry.left) && (
            <p className={`m-0 text-[15px] ${expiryTone}`}>
              {expiry.text}
              {expiry.text && expiry.left ? ' · ' : ''}
              {expiry.left && <span className="whitespace-nowrap font-semibold">{expiry.left}</span>}
            </p>
          )}
        </div>
        {note && (
          <p className={`m-0 rounded-xl px-3.5 py-2.5 text-sm ${tag === 'expired' ? 'bg-ar-danger-soft text-ar-danger' : 'bg-ar-subtle text-ar-ink-2'}`}>{note}</p>
        )}
      </SectionCard>

      {usage.length > 0 && (
        <SectionCard title={t('subscription.usageTitle')}>
          <p className="-mt-2 m-0 text-sm text-ar-muted">{t('subscription.usageHint')}</p>
          <ul className="m-0 grid list-none gap-x-6 gap-y-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {usage.map((row) => (
              <li key={row.key} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] text-ar-ink-2">{t(`subscription.usage.${row.key}`)}</span>
                  <span className={`text-[15px] font-semibold tabular-nums ${row.over ? 'text-ar-danger' : 'text-ar-ink'}`}>{usageText(row, t, n)}</span>
                </div>
                {row.pct != null && (
                  <span className="block h-1.5 overflow-hidden rounded-full bg-ar-subtle" aria-hidden="true">
                    <span className={`block h-full rounded-full ${row.over ? 'bg-ar-danger' : 'bg-ar-primary'}`} style={{ width: `${Math.max(row.pct, row.pct > 0 ? 3 : 0)}%` }} />
                  </span>
                )}
                {row.over && <span className="text-xs font-semibold text-ar-danger">{t('subscription.overLimit')}</span>}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <HistoryCard subscriptionId={status.subscriptionId ?? null} currency={status.billingCurrency || status.planCurrency || null} weekdays={weekdays} t={t} />
    </>
  );
}

function HistoryCard({ subscriptionId, currency, weekdays, t }: { subscriptionId: number | null; currency: string | null; weekdays: string[]; t: T }) {
  const [state, setState] = useState<{ load: 'loading' | 'ok' | 'failed'; activities: ActivityLike[]; payments: PaymentLike[] }>({
    load: 'loading',
    activities: [],
    payments: [],
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!subscriptionId) {
      setState({ load: 'ok', activities: [], payments: [] });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, load: 'loading' }));
    Promise.all([subscriptionsApi.getActivities(subscriptionId, 50), subscriptionsApi.getPayments(subscriptionId, 50)])
      .then(([a, p]) => {
        if (!alive) return;
        if (!a.success && !p.success) return setState({ load: 'failed', activities: [], payments: [] });
        setState({
          load: 'ok',
          activities: a.success && Array.isArray(a.data) ? (a.data as ActivityLike[]) : [],
          payments: p.success && Array.isArray(p.data) ? (p.data as PaymentLike[]) : [],
        });
      })
      .catch(() => alive && setState({ load: 'failed', activities: [], payments: [] }));
    return () => {
      alive = false;
    };
  }, [subscriptionId, attempt]);

  const items: HistoryItem[] = useMemo(
    () => historyItems(state.activities, state.payments, { t, toKey, weekdays, currency }),
    [state.activities, state.payments, t, weekdays, currency],
  );

  return (
    <SectionCard title={t('subscription.history.title')}>
      <p className="-mt-2 m-0 text-sm text-ar-muted">{t('subscription.history.hint')}</p>
      {state.load === 'loading' ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : state.load === 'failed' ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="m-0 text-[15px] text-ar-danger">{t('subscription.history.loadFailed')}</p>
          <button type="button" onClick={() => setAttempt((x) => x + 1)} className={outlineBtn}>
            {t('subscription.retry')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="m-0 rounded-xl bg-ar-surface-muted px-4 py-6 text-center text-[15px] text-ar-muted">{t('subscription.history.empty')}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 border-t border-ar-line-soft py-3 first:border-t-0 first:pt-0 last:pb-0 sm:gap-4">
              <span className="w-[118px] flex-none whitespace-nowrap pt-px text-sm tabular-nums text-ar-muted max-sm:hidden">{item.day}</span>
              <span aria-hidden="true" className={`mt-[7px] h-2 w-2 flex-none rounded-full ${DOT_CLASS[item.tone]}`} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-ar-ink">{item.title}</span>
                {(item.detail || item.day) && (
                  <span className="break-words text-sm text-ar-muted">
                    <span className="sm:hidden">
                      {item.day}
                      {item.detail ? ' · ' : ''}
                    </span>
                    {item.detail}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
