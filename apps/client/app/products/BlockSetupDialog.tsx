'use client';

/**
 * #1249 "Giá theo khối ngày" setup screen (web: a full-screen dialog over the product form, the owner's mockup):
 * the day table, "Thuê quá N ngày", the preview, "Tạo nhanh", "Sao chép từ sản phẩm khác", "Lưu bảng giá" and
 * "Tắt giá theo khối ngày". Nothing reaches the form until "Lưu bảng giá"; closing keeps the previous choice.
 */
import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { productsApi } from '@rentalshop/utils';
import { outlineBtn, primaryBtn, type T } from '../orders/list/parts';
import { BlockTableEditor, MoneyBox } from './BlockTableEditor';
import { blockComplete, emptyBlock, MAX_BLOCK_TIERS, quickTable, type BlockDraft } from './block-draft';
import { savedBlockOf } from './form/form-model';

interface CopyRow {
  id: number;
  name: string;
  block: BlockDraft;
}

function CopyList({ onPick, onClose, excludeId }: { onPick: (b: BlockDraft) => void; onClose: () => void; excludeId?: number }) {
  const t = useTranslations('products.web') as unknown as T;
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<CopyRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setRows(null);
    const timer = setTimeout(async () => {
      try {
        const res = await productsApi.getProducts({ search: q.trim() || undefined, limit: 100 });
        const raw = res.data as unknown;
        const list = (Array.isArray(raw) ? raw : (raw as { products?: unknown[] } | null)?.products ?? []) as Array<{ id: number; name: string; pricingOptions?: unknown[] }>;
        const found: CopyRow[] = [];
        for (const p of list) {
          const block = savedBlockOf({ pricingOptions: p.pricingOptions as never });
          if (block && p.id !== excludeId) found.push({ id: p.id, name: p.name, block });
        }
        if (!cancelled) setRows(found);
      } catch {
        if (!cancelled) setRows([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, excludeId]);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ar-line p-3" data-block-copy>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-ar-ink">{t('form.block.copyTitle')}</span>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-ar-muted hover:text-ar-ink">{t('form.block.close')}</button>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('form.block.copySearch')}
        aria-label={t('form.block.copySearch')}
        className="h-10 w-full rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-[15px] text-ar-ink outline-none focus:border-ar-primary"
      />
      {rows == null ? (
        <span className="text-sm text-ar-muted">{t('form.block.copyLoading')}</span>
      ) : rows.length === 0 ? (
        <span className="text-sm text-ar-muted">{t('form.block.copyEmpty')}</span>
      ) : (
        <ul className="m-0 flex max-h-56 list-none flex-col overflow-auto p-0">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onPick(r.block)} className="flex w-full items-center justify-between gap-3 border-t border-ar-subtle px-1 py-2 text-left text-[15px] text-ar-ink first:border-t-0 hover:bg-ar-subtle">
                <span className="min-w-0 truncate font-semibold">{r.name}</span>
                <span className="flex-none text-xs text-ar-muted">{r.block.tiers.length}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BlockSetupDialog({
  initial,
  canTurnOff,
  excludeProductId,
  onSave,
  onTurnOff,
  onClose,
}: {
  initial: BlockDraft | null;
  canTurnOff: boolean;
  excludeProductId?: number;
  onSave: (b: BlockDraft) => void;
  onTurnOff: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('products.web') as unknown as T;
  const [draft, setDraft] = useState<BlockDraft>(initial ?? emptyBlock());
  const [tried, setTried] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [first, setFirst] = useState<number | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const [days, setDays] = useState<number | null>(3);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    setTried(true);
    if (blockComplete(draft)) onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={t('detail.block.modeBlock')} data-block-setup>
      <div className="flex max-h-full w-full max-w-[560px] flex-col overflow-hidden bg-ar-surface sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-ar-subtle px-4 py-3">
          <button type="button" onClick={onClose} aria-label={t('form.block.close')} className="h-9 w-9 rounded-lg text-xl text-ar-muted hover:bg-ar-subtle hover:text-ar-ink">‹</button>
          <h2 className="m-0 text-lg font-bold text-ar-ink">{t('detail.block.modeBlock')}</h2>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 py-4">
          <p className="m-0 text-sm text-ar-muted">{t('form.block.setupHint')}</p>
          <BlockTableEditor block={draft} onChange={setDraft} showErrors={tried} firstId="pf-block" />
          {tried && !blockComplete(draft) && <p role="alert" className="m-0 text-sm text-ar-danger">{t('form.block.incomplete')}</p>}

          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => setQuickOpen((o) => !o)} className="w-fit text-sm font-semibold text-ar-primary hover:underline">
              ⚡ {t('form.block.quick')}
            </button>
            {quickOpen && (
              <div className="flex flex-col gap-3 rounded-xl border border-ar-line p-3" data-block-quick>
                <label className="flex items-center justify-between gap-3 text-sm font-semibold text-ar-ink-2">
                  {t('form.block.quickFirst')}
                  <MoneyBox value={first} onChange={setFirst} label={t('form.block.quickFirst')} />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm font-semibold text-ar-ink-2">
                  {t('form.block.quickStep')}
                  <MoneyBox value={step} onChange={setStep} label={t('form.block.quickStep')} />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm font-semibold text-ar-ink-2">
                  {t('form.block.quickDays')}
                  <input
                    inputMode="numeric"
                    aria-label={t('form.block.quickDays')}
                    value={days ?? ''}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '');
                      setDays(d ? Math.min(Number(d), MAX_BLOCK_TIERS) : null);
                    }}
                    className="h-10 w-44 max-w-full rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-right text-[15px] tabular-nums text-ar-ink outline-none focus:border-ar-primary"
                  />
                </label>
                <button
                  type="button"
                  disabled={first == null || step == null || !days}
                  onClick={() => {
                    setDraft(quickTable(first as number, step as number, days as number));
                    setQuickOpen(false);
                  }}
                  className={`${outlineBtn} w-fit`}
                >
                  {t('form.block.quickMake')}
                </button>
              </div>
            )}
            <button type="button" onClick={() => setCopyOpen((o) => !o)} className="w-fit text-sm font-semibold text-ar-primary hover:underline">
              ⧉ {t('form.block.copy')}
            </button>
            {copyOpen && (
              <CopyList
                excludeId={excludeProductId}
                onClose={() => setCopyOpen(false)}
                onPick={(b) => {
                  setDraft(b);
                  setCopyOpen(false);
                }}
              />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-ar-subtle px-4 py-3">
          <button type="button" onClick={save} className={`${primaryBtn} w-full`}>{t('form.block.save')}</button>
          {canTurnOff && (
            <button type="button" onClick={onTurnOff} className={`${outlineBtn} w-full text-ar-danger`}>{t('form.block.turnOff')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
