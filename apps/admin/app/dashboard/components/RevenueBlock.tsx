'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { analyticsApi } from '@rentalshop/utils';
import { vnTodayKey } from '../vn-day';
import {
  barHeights,
  canShift,
  channelShare,
  compareWithPrevious,
  formatOther,
  formatVnd,
  niceMax,
  parseRevenueParam,
  revenueCsv,
  revenueParam,
  shiftMonth,
  shortMoney,
  toggleYear,
  type Comparison,
  type RevenueMonth,
  type RevenueSelection,
} from '../revenue-model';

/** Shape of `GET /api/admin/revenue/monthly` (`apps/api/lib/admin-revenue.ts`). */
interface RevenueData {
  scope: 'month' | 'year';
  month: string | null;
  year: number;
  todayKey: string;
  received: { total: number; count: number; newCount: number; renewalCount: number };
  refunds: { total: number; count: number };
  otherCurrencies: { currency: string; total: number; count: number; refundTotal: number; refundCount: number }[];
  daily: { date: string; total: number; count: number }[];
  previous: { month: string; daily: { date: string; total: number; count: number }[] } | null;
  byChannel: { channel: string; total: number; count: number }[];
  months: RevenueMonth[];
  latest: {
    id: number;
    at: string;
    dateKey: string;
    merchant: { id: number; name: string } | null;
    planName: string | null;
    channel: string;
    amount: number;
    currency: string;
    status: string;
  }[];
}

const monthNumber = (month: string) => Number(month.slice(5, 7));
const dayLabel = (dateKey: string) => `${dateKey.slice(8, 10)}/${dateKey.slice(5, 7)}/${dateKey.slice(0, 4)}`;

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="ar-rev-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ar-rev-sk" />
      ))}
    </div>
  );
}

/** Dashboard block "Doanh thu gói dịch vụ" (#1482): plan money received, by month or year. */
export function RevenueBlock() {
  const t = useTranslations('dashboard.revenue');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const todayKey = vnTodayKey();
  const selection = parseRevenueParam(searchParams.get('month'), todayKey);
  const param = revenueParam(selection);

  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [csvMessage, setCsvMessage] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setFailed(false);
    try {
      const response = await analyticsApi.getAdminMonthlyRevenue(
        param.length === 4 ? { year: Number(param) } : { month: param }
      );
      if (id !== requestId.current) return;
      if (response.success && response.data) setData(response.data as RevenueData);
      else setFailed(true);
    } catch {
      if (id === requestId.current) setFailed(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [param]);

  useEffect(() => {
    load();
  }, [load]);

  const go = (next: RevenueSelection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', revenueParam(next));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const money = (n: number) => formatVnd(n, locale);
  const year = selection.mode === 'year' ? selection.year : Number(selection.month.slice(0, 4));
  const monthNum = selection.mode === 'month' ? monthNumber(selection.month) : 0;
  const periodText = selection.mode === 'year' ? t('yearLabel', { year }) : t('monthLabel', { month: monthNum, year });

  // the data on screen belongs to the selection only when the API answered for it
  const fresh = !!data && !loading && (data.scope === 'year' ? selection.mode === 'year' : data.month === (selection as any).month);

  const comparisonText = (c: Comparison): React.ReactNode => {
    if (c.kind === 'year') {
      return c.throughMonth === 12 ? t('compare.yearFull', { year: c.year }) : t('compare.yearUntil', { year: c.year, month: c.throughMonth });
    }
    const label =
      c.scope === 'same-days'
        ? t('compare.sameDays', { day: c.throughDay ?? 0, month: monthNumber(c.previousMonth) })
        : t('compare.wholeMonth', { month: monthNumber(c.previousMonth) });
    if (c.kind === 'empty') return t('compare.empty', { label });
    const up = c.percent >= 0;
    return (
      <>
        <b className={up ? 'ar-rev-up' : 'ar-rev-down'}>{`${up ? '+' : '−'}${Math.abs(c.percent)}%`}</b> {t('compare.versus', { label })}
      </>
    );
  };

  const exportCsv = () => {
    if (!data) return;
    const file = `revenue-${data.year}.csv`;
    const csv = revenueCsv({
      months: data.months,
      headers: [t('csv.month'), t('csv.revenue'), t('csv.payments'), t('csv.new'), t('csv.renewal'), t('csv.refunds'), t('csv.refundCount')],
      totalLabel: t('wholeYear'),
    });
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
    setCsvMessage(t('csvDone', { file }));
    window.setTimeout(() => setCsvMessage(''), 2500);
  };

  // ----- header ---------------------------------------------------------------------------------------------------
  const header = (
    <div className="ar-rev-head">
      <h2 className="ar-rev-title" id="ar-rev-title">{t('title')}</h2>
      <div className="ar-rev-picker" role="group" aria-label={t('pickMonth')}>
        <div className="ar-rev-nav">
          <button type="button" aria-label={t('prevMonth')} disabled={!canShift(selection, -1, todayKey)} onClick={() => go(shiftMonth(selection, -1, todayKey))}>‹</button>
          <output aria-live="polite">{periodText}</output>
          <button type="button" aria-label={t('nextMonth')} disabled={!canShift(selection, 1, todayKey)} onClick={() => go(shiftMonth(selection, 1, todayKey))}>›</button>
        </div>
        <button type="button" className="ar-rev-year" aria-pressed={selection.mode === 'year'} onClick={() => go(toggleYear(selection, todayKey))}>
          {t('wholeYear')}
        </button>
      </div>
    </div>
  );

  if (failed && !loading) {
    return (
      <section className="ar-rev-card" aria-labelledby="ar-rev-title" data-testid="revenue-block">
        {header}
        <div className="ar-rev-error" role="alert">
          {t('error')}{' '}
          <button type="button" className="ar-rev-btn" onClick={load}>{t('retry')}</button>
        </div>
      </section>
    );
  }

  if (!fresh || !data) {
    return (
      <>
        <section className="ar-rev-card" aria-labelledby="ar-rev-title" aria-busy="true" data-testid="revenue-block">
          {header}
          <div className="ar-rev-skeleton" aria-hidden="true">
            <div className="ar-rev-sk" style={{ height: 38, width: 240, marginTop: 16 }} />
            <div className="ar-rev-sk" style={{ width: 200 }} />
            <div className="ar-rev-sk" style={{ width: 300 }} />
            <div className="ar-rev-sk" style={{ height: 230, marginLeft: 44, marginTop: 16 }} />
          </div>
        </section>
        <div className="ar-rev-grid" aria-hidden="true">
          <section className="ar-rev-card"><Skeleton rows={4} /></section>
          <section className="ar-rev-card"><Skeleton rows={8} /></section>
        </div>
        <section className="ar-rev-card ar-rev-latest" aria-hidden="true"><Skeleton rows={6} /></section>
      </>
    );
  }

  // ----- data -----------------------------------------------------------------------------------------------------
  const isYear = data.scope === 'year';
  const comparison = compareWithPrevious({ selection, todayKey: data.todayKey, daily: data.daily, previous: data.previous });
  const futureAfter = data.todayKey;
  const points = isYear
    ? data.months.map((m) => ({
        key: m.month,
        value: m.total,
        future: m.month > futureAfter.slice(0, 7),
        label: t('monthShort', { n: monthNumber(m.month) }),
        title: t('monthLabel', { month: monthNumber(m.month), year: data.year }),
        count: m.count,
      }))
    : data.daily.map((d, i, all) => ({
        key: d.date,
        value: d.total,
        future: d.date > futureAfter,
        label: i === 0 || (i + 1) % 5 === 0 || i === all.length - 1 ? String(i + 1) : '',
        title: dayLabel(d.date),
        count: d.count,
      }));
  const top = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const heights = barHeights(points.map((p) => p.value), top);
  const empty = data.received.count === 0 && data.refunds.count === 0 && data.otherCurrencies.length === 0;
  const hovered = hover !== null ? points[hover] : null;

  return (
    <>
      <section className="ar-rev-card" aria-labelledby="ar-rev-title" data-testid="revenue-block">
        {header}
        <div className="ar-rev-big" data-testid="revenue-total">{money(data.received.total)}</div>
        <div className="ar-rev-lbl">{isYear ? t('receivedYear', { year }) : t('receivedMonth', { month: monthNum, year })}</div>
        <div className="ar-rev-delta">{comparisonText(comparison)}</div>
        <div className="ar-rev-note">
          {t('noteVietnamDays')}{' '}
          {data.refunds.count > 0
            ? t('refundNote', { count: data.refunds.count, amount: money(data.refunds.total) })
            : t('noRefund')}
        </div>
        {data.otherCurrencies.map((c) => (
          <div key={c.currency} className="ar-rev-other" data-testid="revenue-other-currency">
            <b>{t('notConverted', { amount: formatOther(c.currency, c.total, locale) })}</b>
            <small>
              {t('otherDetail', { count: c.count })}
              {c.refundCount > 0 ? ` ${t('otherRefund', { count: c.refundCount, amount: formatOther(c.currency, c.refundTotal, locale) })}` : ''}
            </small>
          </div>
        ))}

        <div className="ar-rev-legend"><i />{isYear ? t('legendMonth') : t('legendDay')}</div>
        <div className="ar-rev-plot" data-testid="revenue-plot" onMouseLeave={() => setHover(null)}>
          {[1, 0.5, 0].map((g) => (
            <div key={g} className="ar-rev-gl" style={{ bottom: `${g * 100}%` }}>
              <span>{g === 0 ? '0' : shortMoney(top * g, locale)}</span>
            </div>
          ))}
          {empty && <div className="ar-rev-empty">{t('empty', { period: periodText.toLowerCase() })}</div>}
          <div className="ar-rev-bars">
            {points.map((p, i) => (
              <div
                key={p.key}
                className={`ar-rev-bw${p.future ? ' ar-rev-fut' : ''}`}
                tabIndex={0}
                aria-label={`${p.title}: ${p.future ? t('notYet') : `${money(p.value)}, ${t('paymentsCount', { count: p.count })}`}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <div className="ar-rev-bar" style={{ height: `${heights[i]}%` }} />
              </div>
            ))}
          </div>
          {hovered && hover !== null && (
            <div className="ar-rev-tip" style={{ left: `${((hover + 0.5) / points.length) * 100}%` }} role="status">
              <b>{hovered.title}</b>
              {hovered.future ? t('notYet') : `${money(hovered.value)} · ${t('paymentsCount', { count: hovered.count })}`}
            </div>
          )}
        </div>
        <div className="ar-rev-xl">
          {points.map((p) => (
            <span key={p.key}>{p.label}</span>
          ))}
        </div>
      </section>

      <div className="ar-rev-grid">
        <section className="ar-rev-card" aria-labelledby="ar-rev-ch">
          <h2 className="ar-rev-h2" id="ar-rev-ch">{t('byChannel')}</h2>
          <table className="ar-rev-table" data-testid="revenue-channels">
            <thead>
              <tr><th>{t('channel')}</th><th className="n">{t('amount')}</th><th className="n">{t('share')}</th></tr>
            </thead>
            <tbody>
              {data.byChannel.map((c) => (
                <tr key={c.channel}>
                  <td>{t(`channels.${c.channel}`)}</td>
                  <td className={`n${c.total ? '' : ' zero'}`}>{money(c.total)}</td>
                  <td className={`n${c.total ? '' : ' zero'}`}>{channelShare(c.total, data.received.total, locale)}</td>
                </tr>
              ))}
              <tr className="tot">
                <td>{t('total')}</td>
                <td className="n">{money(data.received.total)}</td>
                <td className="n">{data.received.total ? channelShare(1, 1, locale) : '—'}</td>
              </tr>
            </tbody>
          </table>
          <div className="ar-rev-note">{t('channelNote')}</div>
        </section>

        <section className="ar-rev-card" aria-labelledby="ar-rev-months">
          <div className="ar-rev-chead">
            <h2 className="ar-rev-h2" id="ar-rev-months">{t('monthsTitle', { year: data.year })}</h2>
            <span>
              <button type="button" className="ar-rev-btn" onClick={exportCsv}>{t('exportCsv')}</button>
              <span className="ar-rev-msg" role="status">{csvMessage}</span>
            </span>
          </div>
          <div className="ar-rev-scroll">
            <table className="ar-rev-table" data-testid="revenue-months">
              <thead>
                <tr>
                  <th>{t('month')}</th><th className="n">{t('revenue')}</th><th className="n">{t('payments')}</th>
                  <th className="n">{t('newShops')}</th><th className="n">{t('renewals')}</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => {
                  const future = m.month > data.todayKey.slice(0, 7);
                  const on = !isYear && data.month === m.month;
                  return (
                    <tr key={m.month} className={`${on ? 'sel' : ''}${future ? ' fut' : ''}`}>
                      <td>
                        <button type="button" className="mlink" disabled={future} aria-current={on ? 'true' : undefined} onClick={() => go({ mode: 'month', month: m.month })}>
                          {t('monthLabel', { month: monthNumber(m.month), year: data.year })}
                        </button>
                      </td>
                      {future ? (
                        <><td className="n">—</td><td className="n">—</td><td className="n">—</td><td className="n">—</td></>
                      ) : (
                        <>
                          <td className={`n${m.total ? '' : ' zero'}`}>{money(m.total)}</td>
                          <td className={`n${m.count ? '' : ' zero'}`}>{m.count}</td>
                          <td className={`n${m.count ? '' : ' zero'}`}>{m.newCount}</td>
                          <td className={`n${m.count ? '' : ' zero'}`}>{m.renewalCount}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
                <tr className={`tot${isYear ? ' sel' : ''}`}>
                  <td>{t('wholeYear')}</td>
                  <td className="n">{money(data.months.reduce((s, m) => s + m.total, 0))}</td>
                  <td className="n">{data.months.reduce((s, m) => s + m.count, 0)}</td>
                  <td className="n">{data.months.reduce((s, m) => s + m.newCount, 0)}</td>
                  <td className="n">{data.months.reduce((s, m) => s + m.renewalCount, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="ar-rev-note">{t('monthsNote')}</div>
        </section>
      </div>

      <section className="ar-rev-card ar-rev-latest" aria-labelledby="ar-rev-pay">
        <div className="ar-rev-chead">
          <h2 className="ar-rev-h2" id="ar-rev-pay">{t('latestTitle')}</h2>
          <Link href="/payments" className="ar-rev-link">{t('viewAll')}</Link>
        </div>
        {data.latest.length === 0 ? (
          <div className="ar-rev-none">{t('noPayments')}</div>
        ) : (
          <div className="ar-rev-scroll">
            <table className="ar-rev-table" data-testid="revenue-latest">
              <thead>
                <tr>
                  <th>{t('date')}</th><th>{t('shop')}</th><th>{t('plan')}</th><th>{t('channel')}</th>
                  <th className="n">{t('amount')}</th><th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {data.latest.map((p) => {
                  const refunded = p.status === 'REFUNDED';
                  const amount = p.currency === 'VND' ? money(p.amount) : formatOther(p.currency, p.amount, locale);
                  return (
                    <tr key={p.id}>
                      <td>{dayLabel(p.dateKey)}</td>
                      <td>{p.merchant?.name || '—'}</td>
                      <td>{p.planName || '—'}</td>
                      <td>{t(`channels.${p.channel}`)}</td>
                      <td className="n">
                        <span className={refunded ? 'ar-rev-struck' : undefined}>{amount}</span>
                        {p.currency !== 'VND' && <span className="ar-rev-note ar-rev-right">{t('notConvertedShort')}</span>}
                      </td>
                      <td><span className={`ar-rev-pill ${refunded ? 'rf' : 'ok'}`}>{refunded ? t('statusRefunded') : t('statusCompleted')}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
