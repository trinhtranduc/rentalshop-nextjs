'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, useToast } from '@rentalshop/ui';
import { useSettingsTranslations } from '@rentalshop/hooks';
import { merchantsApi, systemApi } from '@rentalshop/utils';
import type { EmbeddingBackfillResult, EmbeddingBackfillStatus, EmbeddingJobStatus, EmbeddingJobsList } from '@rentalshop/utils';

/**
 * #1017: Settings → Admin Info card. Shows how many products with photos have no image-search embedding,
 * runs a dry-run check, then (after a confirm inside the card) queues the missing embedding jobs.
 * #1029: the confirm count comes from a fresh dry run with the same includeFailed, so it is what POST would
 * queue now (products already PENDING/RUNNING, or last FAILED when not retried, are not counted).
 * #1087: "Đánh index lại tất cả" (after a model change) runs the same dry run → confirm → run with `all`.
 * #1089: a shop can be chosen; then every count and action is for that shop, and "Đánh index lại shop này"
 * processes it in the request (45 s).
 * #1095 (mockup "Admin tìm bằng ảnh"): model line, progress of the last run, a jobs table in 4 tabs, buttons at
 * the bottom; status and jobs are re-read every 15 s while a job waits or runs (one request each per tick).
 * Pages of 50 rows per tab, and "Tải CSV" downloads the whole tab (at most 10000 rows).
 */
const SHOP_PROCESS_SECONDS = 45;
const POLL_MS = 15000;
const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 50;
const TABS: EmbeddingJobStatus[] = ['RUNNING', 'PENDING', 'COMPLETED', 'FAILED'];
const TAB_LABEL: Record<EmbeddingJobStatus, string> = {
  RUNNING: 'embeddingBackfill.jobRunning',
  PENDING: 'embeddingBackfill.jobPending',
  COMPLETED: 'embeddingBackfill.jobCompleted',
  FAILED: 'embeddingBackfill.jobFailed',
};
const PILL: Record<EmbeddingJobStatus, string> = {
  RUNNING: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-slate-100 text-slate-700',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

type Shop = { id: number; name: string };

/** Start of the last run, per shop (or all), kept across a page reload; storage may be blocked */
const sinceKey = (merchantId?: number) => `anyrent.embeddingMonitor.since.${merchantId ?? 'all'}`;
function readSince(merchantId?: number): string | null {
  try {
    return globalThis.localStorage?.getItem(sinceKey(merchantId)) ?? null;
  } catch {
    return null;
  }
}
function writeSince(merchantId: number | undefined, value: string) {
  try {
    globalThis.localStorage?.setItem(sinceKey(merchantId), value);
  } catch {
    // private mode / blocked storage: the start time stays in the component only
  }
}

/** Display only: the shop's clock (Asia/Ho_Chi_Minh), HH:mm:ss */
function clock(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso));
}

export function EmbeddingBackfillCard() {
  const t = useSettingsTranslations();
  const { toastError } = useToast();
  const [status, setStatus] = useState<EmbeddingBackfillStatus | null>(null);
  const [jobsList, setJobsList] = useState<EmbeddingJobsList | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  /** #1107: the last jobs GET failed; the table keeps its last rows and shows a notice with Retry */
  const [jobsFailed, setJobsFailed] = useState(false);
  const [tab, setTab] = useState<EmbeddingJobStatus>('RUNNING');
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<EmbeddingBackfillResult | null>(null);
  const [includeFailed, setIncludeFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  /** Dry-run `queued` behind the open confirm; null while that dry run is loading. */
  const [confirmCount, setConfirmCount] = useState<number | null>(null);
  /** #1087: the open confirm re-indexes every product with photos */
  const [reindexAll, setReindexAll] = useState(false);
  const [busy, setBusy] = useState(false);
  /** #1089: the chosen shop; null = every shop */
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopQuery, setShopQuery] = useState('');
  const [shopResults, setShopResults] = useState<Shop[]>([]);
  /** #1095: start of the last Create / Re-index for this scope; null = last 24 h */
  const [runSince, setRunSince] = useState<string | null>(() => readSince(undefined));

  // #1065: read t / toastError (and the filters) through a ref so the loaders never change identity. With them
  // in the deps, every render made a new loader, the mount effect ran again, and the card fetched in a loop.
  const latest = useRef({ t, toastError, merchantId: shop?.id, tab, page, runSince });
  latest.current = { t, toastError, merchantId: shop?.id, tab, page, runSince };

  /** One GET of the counts: on mount, shop change, "Làm mới", after a real run, each poll tick. */
  const loadStatus = useCallback(async () => {
    const fail = (message: string) => latest.current.toastError(latest.current.t('embeddingBackfill.loadFailed'), message);
    try {
      const res = await systemApi.getEmbeddingBackfillStatus(latest.current.merchantId);
      if (res.success && res.data) setStatus(res.data);
      else fail(res.message || '');
    } catch (err) {
      fail((err as Error)?.message || '');
    }
  }, []);

  /** #1095: one GET of the open tab's jobs, with the counts and progress since the last run */
  const loadJobs = useCallback(async () => {
    const { merchantId, tab: jobStatus, page: jobPage, runSince: since } = latest.current;
    try {
      const res = await systemApi.getEmbeddingJobs({
        status: jobStatus,
        ...(merchantId ? { merchantId } : {}),
        since: since ?? new Date(Date.now() - DAY_MS).toISOString(),
        limit: PAGE_SIZE,
        page: jobPage,
      });
      if (res.success && res.data) {
        setJobsList(res.data);
        setJobsFailed(false);
      } else {
        setJobsFailed(true);
      }
      setLastRefresh(new Date().toISOString());
    } catch {
      // #1107: the counts still show and the table keeps its last rows, with a notice and Retry
      setJobsFailed(true);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadStatus(), loadJobs()]);
  }, [loadStatus, loadJobs]);

  // One GET each on mount and when the chosen shop changes (the loaders never change identity, #1065)
  useEffect(() => {
    const since = readSince(shop?.id);
    setResult(null);
    setRunSince(since);
    latest.current.runSince = since;
    loadAll();
  }, [loadAll, shop?.id]);

  // A tab or page change reads those rows (skipped on mount: the effect above already read them)
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    loadJobs();
  }, [tab, page, loadJobs]);

  /** #1095: the whole open tab as CSV through the authenticated client, saved from a Blob */
  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await systemApi.downloadEmbeddingJobsCsv({
        status: tab,
        ...(shop ? { merchantId: shop.id } : {}),
        since: runSince ?? new Date(Date.now() - DAY_MS).toISOString(),
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastError(t('embeddingBackfill.downloadFailed'), (err as Error)?.message || '');
    } finally {
      setDownloading(false);
    }
  };

  // #1095: re-read every 15 s while a job waits or runs; the cleanup stops it when all is done and on unmount
  const waiting = (status?.jobs.PENDING ?? 0) + (status?.jobs.RUNNING ?? 0);
  const polling = waiting > 0;
  useEffect(() => {
    if (!polling) return undefined;
    const timer = setInterval(() => {
      loadAll();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [polling, loadAll]);

  const chooseShop = (next: Shop | null) => {
    setShop(next);
    setPage(1);
    setShopResults([]);
    setConfirming(false);
    setConfirmCount(null);
    setReindexAll(false);
  };

  /** #1089: a number picks that shop id; text searches shops by name */
  const searchShops = async () => {
    const q = shopQuery.trim();
    if (!q) return;
    if (/^\d+$/.test(q)) {
      chooseShop({ id: Number(q), name: '' });
      return;
    }
    try {
      const res = await merchantsApi.searchMerchants({ q, limit: 10 });
      const found = (res.success && res.data?.merchants) || [];
      setShopResults(found.map((m) => ({ id: Number(m.id), name: String(m.name ?? '') })));
    } catch (err) {
      toastError(t('embeddingBackfill.runFailed'), (err as Error)?.message || '');
    }
  };

  const run = async (dryRun: boolean, all = false) => {
    setBusy(true);
    try {
      const merchantId = shop?.id;
      const body = all ? { dryRun, all: true } : { dryRun, includeFailed };
      // #1089: a chosen shop's re-index is processed in the request
      const shopReindex = !dryRun && all && merchantId !== undefined;
      if (!dryRun) {
        // #1095: the progress bar counts the jobs touched from now on
        const startedAt = new Date().toISOString();
        writeSince(merchantId, startedAt);
        setRunSince(startedAt);
        latest.current.runSince = startedAt;
      }
      const res = await systemApi.runEmbeddingBackfill({
        ...body,
        ...(merchantId !== undefined ? { merchantId } : {}),
        ...(shopReindex ? { processSeconds: SHOP_PROCESS_SECONDS } : {}),
      });
      if (res.success && res.data) {
        setResult(res.data);
        if (!dryRun) await loadAll();
      } else {
        toastError(t('embeddingBackfill.runFailed'), res.message || '');
      }
    } catch (err) {
      toastError(t('embeddingBackfill.runFailed'), (err as Error)?.message || '');
    } finally {
      setBusy(false);
      setConfirming(false);
      setConfirmCount(null);
      setReindexAll(false);
    }
  };

  /** Opens the confirm with what POST would queue now: a dry run with the same includeFailed (or `all`). */
  const openConfirm = async (all = false) => {
    setConfirming(true);
    setReindexAll(all);
    setConfirmCount(null);
    setBusy(true);
    try {
      const res = await systemApi.runEmbeddingBackfill({
        ...(all ? { dryRun: true, all: true } : { dryRun: true, includeFailed }),
        ...(shop ? { merchantId: shop.id } : {}),
      });
      if (res.success && res.data) {
        setResult(res.data);
        setConfirmCount(res.data.queued + (all ? res.data.upgradedPending ?? 0 : 0));
      } else {
        toastError(t('embeddingBackfill.runFailed'), res.message || '');
        setConfirming(false);
      }
    } catch (err) {
      toastError(t('embeddingBackfill.runFailed'), (err as Error)?.message || '');
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  const closeConfirm = () => {
    setConfirming(false);
    setConfirmCount(null);
    setReindexAll(false);
  };

  const shopName = shop ? shop.name || status?.topMerchants.find((m) => m.id === shop.id)?.name || '' : '';
  const model = status?.model;
  const progress = jobsList?.progress;
  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const width = (n: number) => `${progress && progress.total > 0 ? (n / progress.total) * 100 : 0}%`;
  const stats: [string, number | undefined][] = [
    [t('embeddingBackfill.withImages'), status?.products.withImages],
    [t('embeddingBackfill.withEmbedding'), status?.products.withEmbedding],
    [t('embeddingBackfill.missingEmbedding'), status?.products.missingEmbedding],
  ];

  return (
    <Card className="max-w-5xl">
      <CardHeader className="flex flex-row flex-wrap items-center gap-3">
        <CardTitle className="flex-1">{t('embeddingBackfill.title')}</CardTitle>
        {/* #1107: a status without `model` (older API, or the image service down) still shows the line */}
        {status && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {model?.reachable && model.name
              ? t('embeddingBackfill.modelLine', { name: model.name, collection: model.collection ?? '-' })
              : t('embeddingBackfill.modelUnknown', { collection: model?.collection ?? '-' })}
          </span>
        )}
        <Button variant="outline" size="sm" onClick={loadAll} disabled={busy}>
          {t('embeddingBackfill.refresh')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">
              {shop ? t('embeddingBackfill.shopChosen', { id: shop.id, name: shopName }) : t('embeddingBackfill.shopAll')}
            </p>
            <input
              className="min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
              value={shopQuery}
              placeholder={t('embeddingBackfill.shopSearchPlaceholder')}
              onChange={(e) => setShopQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') searchShops();
              }}
            />
            <Button size="sm" variant="outline" onClick={searchShops} disabled={busy}>
              {t('embeddingBackfill.shopSearch')}
            </Button>
            {shop && (
              <Button size="sm" variant="outline" onClick={() => chooseShop(null)} disabled={busy}>
                {t('embeddingBackfill.shopClear')}
              </Button>
            )}
          </div>
          {shopResults.length > 0 && (
            <ul className="text-sm">
              {shopResults.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-1">
                  <span>
                    #{m.id} {m.name}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => chooseShop(m)} disabled={busy}>
                    {t('embeddingBackfill.shopPick')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {!shop && status && status.topMerchants.length > 0 && (
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer">{t('embeddingBackfill.topMerchants')}</summary>
              <ul>
                {status.topMerchants.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-0.5">
                    <span>
                      #{m.id} {m.name}: {m.missingEmbedding}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => chooseShop({ id: m.id, name: m.name })} disabled={busy}>
                      {t('embeddingBackfill.shopPick')}
                    </Button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="text-xs text-muted-foreground">{t('embeddingBackfill.shopModelNote')}</p>
        </div>

        {progress && progress.total > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">
                {t('embeddingBackfill.progressRun', {
                  scope: shop ? shopName || `#${shop.id}` : t('embeddingBackfill.scopeAll'),
                  done: progress.done,
                  total: progress.total,
                  percent,
                })}
              </p>
              <p className="text-xs text-slate-600">
                {runSince ? t('embeddingBackfill.progressSince', { time: clock(runSince) }) : t('embeddingBackfill.progressLast24h')}
                {' · '}
                {progress.pending + progress.running === 0
                  ? t('embeddingBackfill.etaDone')
                  : progress.etaMinutes !== null
                    ? t('embeddingBackfill.eta', { minutes: progress.etaMinutes })
                    : t('embeddingBackfill.etaUnknown')}
              </p>
            </div>
            <div className="my-2 flex h-2.5 overflow-hidden rounded bg-blue-100">
              <i className="block h-full bg-green-600" style={{ width: width(progress.done) }} />
              <i className="block h-full bg-blue-600" style={{ width: width(progress.running) }} />
              <i className="block h-full bg-red-600" style={{ width: width(progress.failed) }} />
            </div>
            <p className="flex flex-wrap gap-4 text-xs text-slate-700">
              <span>{t('embeddingBackfill.legendDone', { count: progress.done })}</span>
              <span>{t('embeddingBackfill.legendRunning', { count: progress.running })}</span>
              <span>{t('embeddingBackfill.legendFailed', { count: progress.failed })}</span>
              <span>{t('embeddingBackfill.legendPending', { count: progress.pending })}</span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold">{value ?? '-'}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex flex-wrap items-end gap-1 border-b">
            {TABS.map((s) => (
              <button
                key={s}
                type="button"
                className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === s ? 'border-blue-700 font-semibold text-blue-700' : 'border-transparent text-slate-600'}`}
                onClick={() => {
                  setTab(s);
                  setPage(1);
                }}
              >
                {t(TAB_LABEL[s])}
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs text-slate-700">
                  {jobsList?.counts[s] ?? status?.jobs[s] ?? 0}
                </span>
              </button>
            ))}
            <span className="flex-1" />
            <Button size="sm" variant="outline" onClick={downloadCsv} disabled={downloading || !jobsList || jobsList.total === 0}>
              {t('embeddingBackfill.downloadCsv')}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="p-2" />
                  <th className="p-2">{t('embeddingBackfill.colProduct')}</th>
                  <th className="p-2">{t('embeddingBackfill.colShop')}</th>
                  <th className="p-2">{t('embeddingBackfill.colStatus')}</th>
                  <th className="p-2">{t('embeddingBackfill.colAttempts')}</th>
                  <th className="p-2">{t('embeddingBackfill.colUpdated')}</th>
                  <th className="p-2">{t('embeddingBackfill.colError')}</th>
                </tr>
              </thead>
              <tbody>
                {(jobsList?.rows ?? []).map((row) => (
                  <tr key={row.jobId} className="border-t">
                    <td className="p-2">
                      {row.thumbnail ? (
                        <img src={row.thumbnail} alt="" className="h-8 w-8 rounded object-cover" loading="lazy" />
                      ) : (
                        <span className="block h-8 w-8 rounded bg-slate-200" />
                      )}
                    </td>
                    <td className="p-2">
                      {row.merchantId ? (
                        <a className="hover:underline" href={`/merchants/${row.merchantId}/products/${row.productId}`}>
                          {row.productName}
                        </a>
                      ) : (
                        row.productName
                      )}
                    </td>
                    <td className="p-2 text-slate-500">{row.merchantName}</td>
                    <td className="p-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PILL[row.status]}`}>
                        {row.status === 'PENDING' && row.attempts > 0 ? t('embeddingBackfill.statusRetry') : t(TAB_LABEL[row.status])}
                      </span>
                    </td>
                    <td className="p-2">
                      {row.attempts}/{row.maxAttempts}
                    </td>
                    <td className="p-2 text-slate-500">{clock(row.updatedAt)}</td>
                    <td className="max-w-xs truncate p-2 text-xs text-red-700" title={row.lastError ?? ''}>
                      {row.lastError ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {jobsFailed ? (
              <div role="alert" className="flex flex-wrap items-center gap-2 p-3 text-sm text-red-700">
                <span>{t('embeddingBackfill.jobsLoadFailed')}</span>
                {/* one GET of the open tab (#1065: no loop) */}
                <Button size="sm" variant="outline" onClick={loadJobs}>
                  {t('embeddingBackfill.retry')}
                </Button>
              </div>
            ) : (
              jobsList && jobsList.rows.length === 0 && <p className="p-3 text-sm text-muted-foreground">{t('embeddingBackfill.emptyTab')}</p>
            )}
          </div>
          {jobsList && jobsList.total > PAGE_SIZE && (
            <div className="flex items-center justify-end gap-2 pt-2 text-sm">
              <span className="text-slate-500">
                {t('embeddingBackfill.pageRange', {
                  from: (jobsList.page - 1) * jobsList.limit + 1,
                  to: Math.min(jobsList.page * jobsList.limit, jobsList.total),
                  total: jobsList.total,
                })}
              </span>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                {t('embeddingBackfill.prevPage')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * PAGE_SIZE >= jobsList.total}
              >
                {t('embeddingBackfill.nextPage')}
              </Button>
            </div>
          )}
        </div>

        {confirming ? (
          <div className="space-y-2 rounded-lg border p-3">
            {confirmCount === null ? (
              <p className="text-sm text-muted-foreground">{t('embeddingBackfill.checking')}</p>
            ) : confirmCount === 0 ? (
              <p className="font-medium">{t('embeddingBackfill.nothingToQueue')}</p>
            ) : (
              <>
                <p className="font-medium">
                  {t(reindexAll ? 'embeddingBackfill.reindexConfirmTitle' : 'embeddingBackfill.confirmTitle', { count: confirmCount })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(reindexAll ? 'embeddingBackfill.reindexConfirmBody' : 'embeddingBackfill.confirmBody')}
                </p>
              </>
            )}
            <div className="flex gap-2">
              {confirmCount !== null && confirmCount > 0 && (
                <Button size="sm" onClick={() => run(false, reindexAll)} disabled={busy}>
                  {t('embeddingBackfill.confirm')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={closeConfirm} disabled={busy}>
                {confirmCount === 0 ? t('embeddingBackfill.close') : t('embeddingBackfill.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-xs text-muted-foreground">
              {polling && <p>{t('embeddingBackfill.shopPolling', { count: waiting })}</p>}
              {lastRefresh && <p>{t('embeddingBackfill.lastRefresh', { time: clock(lastRefresh) })}</p>}
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={includeFailed}
                  onChange={(e) => {
                    setIncludeFailed(e.target.checked);
                    setResult(null);
                    closeConfirm();
                  }}
                />
                {t('embeddingBackfill.includeFailed')}
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => run(true)} disabled={busy}>
                {t('embeddingBackfill.check')}
              </Button>
              <Button variant="outline" onClick={() => openConfirm()} disabled={busy}>
                {t('embeddingBackfill.run')}
              </Button>
              <Button onClick={() => openConfirm(true)} disabled={busy}>
                {t(shop ? 'embeddingBackfill.reindexShop' : 'embeddingBackfill.reindexAll')}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-1 rounded-lg border p-3 text-sm">
            <p className="font-medium">
              {result.dryRun ? t('embeddingBackfill.resultDryRun') : t('embeddingBackfill.resultQueued')}
            </p>
            <p>
              {t('embeddingBackfill.resultMerchants')}: {result.merchants} · {t('embeddingBackfill.resultProducts')}: {result.products} ·{' '}
              {result.dryRun ? t('embeddingBackfill.resultWouldQueue') : t('embeddingBackfill.resultQueuedCount')}: {result.queued}
            </p>
            <p>
              {t('embeddingBackfill.resultSkippedQueued')}: {result.skippedAlreadyQueued} · {t('embeddingBackfill.resultSkippedFailed')}:{' '}
              {result.skippedFailed}
              {result.all ? ` · ${t('embeddingBackfill.resultUpgraded')}: ${result.upgradedPending ?? 0}` : ''}
            </p>
            {result.processing && (
              <p>
                {t('embeddingBackfill.resultProcessed', {
                  processed: result.processing.processed,
                  completed: result.processing.completed,
                  failed: result.processing.failed,
                })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
