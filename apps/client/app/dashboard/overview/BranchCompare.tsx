'use client';

/**
 * So sánh chi nhánh (#827): one row per selected branch from GET /api/analytics/period?byOutlet=1.
 * The total row adds the rows up, so it equals the cards. A row click shows only that branch.
 * Desktop: sortable table. Phone: one card per branch with its % of Giá trị đơn mới.
 */
import React from 'react';
import type { CompareKey, CompareRow, CompareSort, CompareTotal } from '../branch-model';
import { cardClass, type Money, type T } from './sections';

const COLUMNS: Array<{ key: CompareKey; label: string; numeric: boolean }> = [
  { key: 'name', label: 'home.compare.branch', numeric: false },
  { key: 'orderValue', label: 'home.kpi.orderValue', numeric: true },
  { key: 'collected', label: 'home.kpi.collected', numeric: true },
  { key: 'outstanding', label: 'home.kpi.outstanding', numeric: true },
  { key: 'newOrders', label: 'home.compare.newOrders', numeric: true },
  { key: 'collateralHeldOrders', label: 'home.compare.held', numeric: true },
];

export function BranchCompare({
  rows,
  total,
  loading,
  sort,
  onSort,
  onPick,
  periodLabel,
  t,
  money,
}: {
  rows: CompareRow[];
  total: CompareTotal;
  loading: boolean;
  sort: CompareSort;
  onSort: (sort: CompareSort) => void;
  onPick: (outletId: number) => void;
  periodLabel: string;
  t: T;
  money: Money;
}) {
  const cell = (row: CompareRow | CompareTotal, key: CompareKey): string => {
    if (key === 'name') return '';
    const v = row[key];
    if (key === 'newOrders') return String(v);
    if (key === 'collateralHeldOrders') return t('home.compare.heldValue', { count: v });
    return money(v);
  };
  const sortBy = (key: CompareKey) =>
    onSort(sort.key === key ? { key, dir: sort.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'name' ? 'asc' : 'desc' });

  return (
    <section data-branch-compare aria-labelledby="branch-compare-title" className={`${cardClass} flex min-w-0 flex-col gap-3 p-[18px]`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="branch-compare-title" className="m-0 text-lg font-bold">
          {t('home.compare.title')}
        </h2>
        <span className="text-xs text-ar-muted">{periodLabel}</span>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-ar-subtle" />
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={`border-b border-ar-line px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-ar-muted ${c.numeric ? 'text-right' : 'text-left'}`}
                    >
                      <button
                        type="button"
                        data-compare-sort={c.key}
                        onClick={() => sortBy(c.key)}
                        aria-label={t('home.compare.sortBy', { column: t(c.label) })}
                        className="inline-flex items-center gap-1 whitespace-nowrap bg-transparent p-0 uppercase hover:text-ar-ink"
                      >
                        {t(c.label)}
                        {sort.key === c.key && <span aria-hidden="true">{sort.dir === 'desc' ? '▾' : '▴'}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.outletId}
                    data-compare-row={r.outletId}
                    tabIndex={0}
                    aria-label={t('home.compare.onlyThis', { name: r.name })}
                    onClick={() => onPick(r.outletId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onPick(r.outletId);
                      }
                    }}
                    className="cursor-pointer hover:bg-ar-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary"
                  >
                    <td className="border-b border-ar-subtle px-2.5 py-3">
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${r.color}`} />
                        <span className="text-[15px]">{r.name}</span>
                      </span>
                    </td>
                    <td className="border-b border-ar-subtle px-2.5 py-3 text-right tabular-nums">
                      <span className="inline-flex items-center justify-end gap-2">
                        {money(r.orderValue)}
                        <span aria-hidden="true" className="inline-block h-1.5 w-[70px] rounded-full">
                          <span className={`block h-full rounded-full ${r.color}`} style={{ width: `${Math.max(r.bar, r.orderValue > 0 ? 4 : 0)}%` }} />
                        </span>
                      </span>
                    </td>
                    {COLUMNS.slice(2).map((c) => (
                      <td key={c.key} className="border-b border-ar-subtle px-2.5 py-3 text-right tabular-nums">
                        {cell(r, c.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr data-compare-total className="bg-ar-subtle font-bold">
                  <td className="rounded-l-lg px-2.5 py-3">{t('home.compare.total', { count: total.count })}</td>
                  {COLUMNS.slice(1).map((c, i, list) => (
                    <td key={c.key} data-total={c.key} className={`px-2.5 py-3 text-right tabular-nums ${i === list.length - 1 ? 'rounded-r-lg' : ''}`}>
                      {cell(total, c.key)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col gap-3 p-0 sm:hidden">
            {rows.map((r) => (
              <li key={r.outletId}>
                <button
                  type="button"
                  data-compare-card={r.outletId}
                  aria-label={t('home.compare.onlyThis', { name: r.name })}
                  onClick={() => onPick(r.outletId)}
                  className="flex w-full flex-col gap-2 rounded-xl border border-ar-line bg-ar-surface p-3.5 text-left text-ar-ink"
                >
                  <span className="flex w-full items-center gap-2">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 flex-none rounded-full ${r.color}`} />
                    <span className="min-w-0 flex-1 truncate text-base font-bold">{r.name}</span>
                    <span className="flex-none rounded-full bg-ar-primary-soft px-2 py-0.5 text-xs font-semibold text-ar-primary-ink">{r.share}%</span>
                  </span>
                  {COLUMNS.slice(1).map((c) => (
                    <span key={c.key} className="flex w-full items-center justify-between gap-3 text-sm">
                      <span className="text-ar-ink-2">{t(c.label)}</span>
                      <span className="tabular-nums">{cell(r, c.key)}</span>
                    </span>
                  ))}
                </button>
              </li>
            ))}
            <li data-compare-total-card className="flex flex-col gap-2 rounded-xl bg-ar-subtle p-3.5">
              <span className="text-base font-bold">{t('home.compare.total', { count: total.count })}</span>
              {COLUMNS.slice(1).map((c) => (
                <span key={c.key} className="flex w-full items-center justify-between gap-3 text-sm font-semibold">
                  <span className="text-ar-ink-2">{t(c.label)}</span>
                  <span className="tabular-nums">{cell(total, c.key)}</span>
                </span>
              ))}
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
