'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, useToast } from '@rentalshop/ui';
import { useSettingsTranslations } from '@rentalshop/hooks';
import { merchantsApi, systemApi } from '@rentalshop/utils';
import type { EmbeddingBackfillResult, EmbeddingBackfillStatus } from '@rentalshop/utils';

/**
 * #1017: Settings → Admin Info card. Shows how many products with photos have no image-search embedding,
 * runs a dry-run check, then (after a confirm inside the card) queues the missing embedding jobs.
 * #1029: the confirm count comes from a fresh dry run with the same includeFailed, so it is what POST would
 * queue now (products already PENDING/RUNNING, or last FAILED when not retried, are not counted).
 * #1087: "Đánh index lại tất cả" (after a model change) runs the same dry run → confirm → run with `all`.
 * #1089: a shop can be chosen; then every count and action is for that shop, and "Đánh index lại shop này"
 * processes it in the request (45 s) and re-reads its status every 15 s while it still has waiting jobs.
 */
const SHOP_PROCESS_SECONDS = 45;
const POLL_MS = 15000;

type Shop = { id: number; name: string };
export function EmbeddingBackfillCard() {
  const t = useSettingsTranslations();
  const { toastError } = useToast();
  const [status, setStatus] = useState<EmbeddingBackfillStatus | null>(null);
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
  /** #1089: re-read the chosen shop's status every 15 s until it has no waiting job */
  const [polling, setPolling] = useState(false);

  // #1065: read t / toastError through a ref so loadStatus never changes identity. With them in its deps, every
  // render (each setStatus) made a new loadStatus, the mount effect ran again, and the card fetched in a loop.
  const latest = useRef({ t, toastError, merchantId: shop?.id });
  latest.current = { t, toastError, merchantId: shop?.id };

  /** One GET: on mount, on "Làm mới", after a real (non dry-run) run. */
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

  // One GET on mount and when the chosen shop changes (loadStatus never changes identity, #1065)
  useEffect(() => {
    setResult(null);
    setPolling(false);
    loadStatus();
  }, [loadStatus, shop?.id]);

  // #1089: one GET per tick while polling; stops on shop change / unmount (cleanup) or when nothing waits
  useEffect(() => {
    if (!polling) return undefined;
    const timer = setInterval(() => {
      loadStatus();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [polling, loadStatus]);

  const waiting = (status?.jobs.PENDING ?? 0) + (status?.jobs.RUNNING ?? 0);
  useEffect(() => {
    if (polling && status && waiting === 0) setPolling(false);
  }, [polling, status, waiting]);

  const chooseShop = (next: Shop | null) => {
    setShop(next);
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
      // #1089: a chosen shop's re-index is processed in the request, then followed by polling
      const shopReindex = !dryRun && all && merchantId !== undefined;
      const res = await systemApi.runEmbeddingBackfill({
        ...body,
        ...(merchantId !== undefined ? { merchantId } : {}),
        ...(shopReindex ? { processSeconds: SHOP_PROCESS_SECONDS } : {}),
      });
      if (res.success && res.data) {
        setResult(res.data);
        if (!dryRun) await loadStatus();
        if (shopReindex) setPolling(true);
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

  const stats: [string, number | undefined][] = [
    [t('embeddingBackfill.withImages'), status?.products.withImages],
    [t('embeddingBackfill.missingEmbedding'), status?.products.missingEmbedding],
    [t('embeddingBackfill.withEmbedding'), status?.products.withEmbedding],
  ];
  const jobs: [string, number | undefined][] = [
    [t('embeddingBackfill.jobPending'), status?.jobs.PENDING],
    [t('embeddingBackfill.jobRunning'), status?.jobs.RUNNING],
    [t('embeddingBackfill.jobCompleted'), status?.jobs.COMPLETED],
    [t('embeddingBackfill.jobFailed'), status?.jobs.FAILED],
  ];

  return (
    <Card className="max-w-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('embeddingBackfill.title')}</CardTitle>
        <Button variant="outline" size="sm" onClick={loadStatus} disabled={busy}>
          {t('embeddingBackfill.refresh')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('embeddingBackfill.description')}</p>

        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">
            {shop
              ? t('embeddingBackfill.shopChosen', { id: shop.id, name: shop.name || status?.topMerchants.find((m) => m.id === shop.id)?.name || '' })
              : t('embeddingBackfill.shopAll')}
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border px-2 py-1 text-sm"
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
                  <span>#{m.id} {m.name}</span>
                  <Button size="sm" variant="outline" onClick={() => chooseShop(m)} disabled={busy}>
                    {t('embeddingBackfill.shopPick')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">{t('embeddingBackfill.shopModelNote')}</p>
          {polling && <p className="text-xs text-muted-foreground">{t('embeddingBackfill.shopPolling', { count: waiting })}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold">{value ?? '-'}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-sm font-medium">{t('embeddingBackfill.jobs')}</p>
          <p className="text-sm text-muted-foreground">
            {jobs.map(([label, value]) => `${label}: ${value ?? '-'}`).join(' · ')}
          </p>
        </div>

        {status && status.topMerchants.length > 0 && (
          <div>
            <p className="text-sm font-medium">{t('embeddingBackfill.topMerchants')}</p>
            <ul className="text-sm text-muted-foreground">
              {status.topMerchants.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-0.5">
                  <span>
                    #{m.id} {m.name}: {m.missingEmbedding}
                  </span>
                  {shop?.id !== m.id && (
                    <Button size="sm" variant="outline" onClick={() => chooseShop({ id: m.id, name: m.name })} disabled={busy}>
                      {t('embeddingBackfill.shopPick')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
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

        {confirming ? (
          <div className="rounded-lg border p-3 space-y-2">
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => run(true)} disabled={busy}>
              {t('embeddingBackfill.check')}
            </Button>
            <Button onClick={() => openConfirm()} disabled={busy}>
              {t('embeddingBackfill.run')}
            </Button>
            <Button variant="outline" onClick={() => openConfirm(true)} disabled={busy}>
              {t(shop ? 'embeddingBackfill.reindexShop' : 'embeddingBackfill.reindexAll')}
            </Button>
          </div>
        )}

        {result && (
          <div className="rounded-lg border p-3 text-sm space-y-1">
            <p className="font-medium">
              {result.dryRun ? t('embeddingBackfill.resultDryRun') : t('embeddingBackfill.resultQueued')}
            </p>
            <p>{t('embeddingBackfill.resultMerchants')}: {result.merchants}</p>
            <p>{t('embeddingBackfill.resultProducts')}: {result.products}</p>
            <p>
              {result.dryRun ? t('embeddingBackfill.resultWouldQueue') : t('embeddingBackfill.resultQueuedCount')}:{' '}
              {result.queued}
            </p>
            <p>{t('embeddingBackfill.resultSkippedQueued')}: {result.skippedAlreadyQueued}</p>
            <p>{t('embeddingBackfill.resultSkippedFailed')}: {result.skippedFailed}</p>
            {result.all && (
              <p>{t('embeddingBackfill.resultUpgraded')}: {result.upgradedPending ?? 0}</p>
            )}
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
