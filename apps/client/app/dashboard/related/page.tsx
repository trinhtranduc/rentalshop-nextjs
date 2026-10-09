'use client';

/**
 * "Xem các đơn liên quan" of an Overview tile (#708): the rows behind the number, each with the money it adds to the
 * tile, and their total (it equals the tile). Rows: GET /api/analytics/income/orders (every page of the tile's buckets).
 * URL: /dashboard/related?kind=orderValue|collected|outstanding|collateral&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useFormatCurrency } from '@rentalshop/ui';
import { useAuth, useDashboardTranslations } from '@rentalshop/hooks';
import { apiUrls, authenticatedFetch, parseApiResponse } from '@rentalshop/utils';
import { TILE_LABEL } from '../overview/sections';
import {
  isDayKey,
  parseRelated,
  relatedBuckets,
  relatedRows,
  relatedTotal,
  type IncomeOrderLike,
  type RelatedRow,
} from '../overview-model';

type T = (key: string, values?: Record<string, unknown>) => string;

const PAGE = 200;
const MAX_PAGES = 25;

interface IncomePage {
  days?: Array<{ orders?: IncomeOrderLike[] | null }> | null;
  pagination?: { hasMore?: boolean } | null;
}

async function loadBucket(bucket: string, from: string, to: string): Promise<IncomeOrderLike[]> {
  const items: IncomeOrderLike[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({ status: bucket, startDate: from, endDate: to, limit: String(PAGE), offset: String(page * PAGE), plan: 'false' });
    const res = await parseApiResponse<IncomePage>(await authenticatedFetch(`${apiUrls.analytics.income}/orders?${params}`));
    if (!res.success || !res.data) throw new Error('income orders failed');
    const rows = (res.data.days || []).flatMap((d) => d.orders || []);
    items.push(...rows);
    if (!res.data.pagination?.hasMore || rows.length === 0) break;
  }
  return items;
}

function RelatedOrders() {
  const t = useDashboardTranslations() as unknown as T;
  const money = useFormatCurrency();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const kind = parseRelated(params.get('kind'));
  const from = params.get('from');
  const to = params.get('to');
  const [rows, setRows] = useState<RelatedRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !kind || !isDayKey(from) || !isDayKey(to)) return;
    let alive = true;
    setRows(null);
    setFailed(false);
    Promise.all(relatedBuckets(kind).map((b) => loadBucket(b, from, to).then((items) => relatedRows(kind, b, items))))
      .then((parts) => alive && setRows(parts.flat()))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [authLoading, user, kind, from, to]);

  if (!kind || !isDayKey(from) || !isDayKey(to)) {
    return <p className="m-0 p-8 text-ar-muted">{t('home.related.failed')}</p>;
  }
  const signed = (n: number) => (kind === 'orderValue' || kind === 'outstanding' ? money(n) : n < 0 ? `−${money(-n)}` : `+${money(n)}`);

  return (
    <div className="mx-auto box-border flex w-full max-w-[960px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-col gap-1">
        <Link href={`/dashboard?period=custom&from=${from}&to=${to}`} className="text-sm text-ar-primary-ink no-underline hover:underline">
          ← {t('home.related.back')}
        </Link>
        <h1 className="m-0 text-[24px] font-bold">
          {t(TILE_LABEL[kind])} · {t('home.related.title')}
        </h1>
        <span className="text-sm text-ar-muted">
          {from} → {to}
        </span>
        <p className="m-0 text-sm text-ar-ink-2">{t(`home.detail.rule.${kind}`)}</p>
      </div>

      {failed && <p className="m-0 text-ar-late">{t('home.related.failed')}</p>}
      {!failed && rows === null && <p className="m-0 text-ar-muted">…</p>}
      {rows && rows.length === 0 && <p className="m-0 text-ar-muted">{t('home.related.empty')}</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-ar-line bg-ar-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-ar-muted">
                <th className="border-b border-ar-line px-3 py-2">{t('home.related.order')}</th>
                <th className="border-b border-ar-line px-3 py-2">{t('home.related.customer')}</th>
                <th className="border-b border-ar-line px-3 py-2">{t('home.related.item')}</th>
                <th className="border-b border-ar-line px-3 py-2 text-right">{t('home.related.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.id}-${i}`} data-related-row>
                  <td className="border-b border-ar-subtle px-3 py-2">
                    <Link href={`/orders/${r.orderNumber}`} className="text-ar-primary-ink no-underline hover:underline">
                      {r.orderNumber}
                    </Link>
                  </td>
                  <td className="border-b border-ar-subtle px-3 py-2">{r.customer}</td>
                  <td className="border-b border-ar-subtle px-3 py-2 text-ar-ink-2">{r.note === 'event' ? r.description : t(`home.related.note.${r.note}`)}</td>
                  <td className={`border-b border-ar-subtle px-3 py-2 text-right tabular-nums ${r.amount < 0 ? 'text-ar-late' : ''}`}>{signed(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="px-3 py-3 font-bold">
                  {t('home.related.total')} · {rows.length} <span className="font-normal text-ar-muted">({t('home.related.totalHint')})</span>
                </td>
                <td data-related-total className="px-3 py-3 text-right font-bold tabular-nums">
                  {signed(relatedTotal(rows))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default function RelatedOrdersPage() {
  return (
    <Suspense fallback={null}>
      <RelatedOrders />
    </Suspense>
  );
}
