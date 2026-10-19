'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, useToast } from '@rentalshop/ui';
import { useSettingsTranslations } from '@rentalshop/hooks';
import { systemApi } from '@rentalshop/utils';
import type { EmbeddingBackfillResult, EmbeddingBackfillStatus } from '@rentalshop/utils';

/**
 * #1017: Settings → Admin Info card. Shows how many products with photos have no image-search embedding,
 * runs a dry-run check, then (after a confirm inside the card) queues the missing embedding jobs.
 * #1029: the confirm count comes from a fresh dry run with the same includeFailed, so it is what POST would
 * queue now (products already PENDING/RUNNING, or last FAILED when not retried, are not counted).
 * #1087: "Đánh index lại tất cả" (after a model change) runs the same dry run → confirm → run with `all`.
 */
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

  // #1065: read t / toastError through a ref so loadStatus never changes identity. With them in its deps, every
  // render (each setStatus) made a new loadStatus, the mount effect ran again, and the card fetched in a loop.
  const latest = useRef({ t, toastError });
  latest.current = { t, toastError };

  /** One GET: on mount, on "Làm mới", after a real (non dry-run) run. */
  const loadStatus = useCallback(async () => {
    const fail = (message: string) => latest.current.toastError(latest.current.t('embeddingBackfill.loadFailed'), message);
    try {
      const res = await systemApi.getEmbeddingBackfillStatus();
      if (res.success && res.data) setStatus(res.data);
      else fail(res.message || '');
    } catch (err) {
      fail((err as Error)?.message || '');
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const run = async (dryRun: boolean, all = false) => {
    setBusy(true);
    try {
      const res = await systemApi.runEmbeddingBackfill(all ? { dryRun, all: true } : { dryRun, includeFailed });
      if (res.success && res.data) {
        setResult(res.data);
        if (!dryRun) await loadStatus();
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
      const res = await systemApi.runEmbeddingBackfill(all ? { dryRun: true, all: true } : { dryRun: true, includeFailed });
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
                <li key={m.id}>
                  #{m.id} {m.name}: {m.missingEmbedding}
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
              {t('embeddingBackfill.reindexAll')}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
