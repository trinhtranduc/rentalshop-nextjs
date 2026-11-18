'use client';

/**
 * #1621 "Giá theo khối giờ" (web: a dialog over the product form, same frame as "Giá theo khối ngày"): one row per block
 * ([hours] giờ [price] đ ✕), "+ Thêm khối", "Lưu bảng giá" and "Tắt giá theo khối giờ". Saving sorts the blocks by hours
 * and stops on hours outside 1–24, a number of hours used twice, or a missing price. Nothing reaches the form until
 * "Lưu bảng giá"; closing keeps the previous blocks.
 */
import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { outlineBtn, primaryBtn, type T } from '../orders/list/parts';
import { MoneyBox } from './BlockTableEditor';
import {
  HOUR_BLOCK_MAX_COUNT,
  addHourRow,
  canAddHourRow,
  hourBlocksFromRows,
  hourRowProblems,
  removeHourRow,
  rowsFromBlocks,
  setHourRow,
  type HourBlock,
  type HourBlockRow,
} from './hour-block-draft';

const hoursBox =
  'h-10 w-16 rounded-[10px] border border-ar-line-strong bg-ar-surface px-2 text-center text-[15px] font-semibold tabular-nums text-ar-ink outline-none focus:border-ar-primary';

export function HourBlocksDialog({
  initial,
  canTurnOff,
  onSave,
  onTurnOff,
  onClose,
}: {
  initial: HourBlock[];
  canTurnOff: boolean;
  onSave: (blocks: HourBlock[]) => void;
  onTurnOff: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('products.web') as unknown as T;
  const [rows, setRows] = useState<HourBlockRow[]>(() => rowsFromBlocks(initial));
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const problems = hourRowProblems(rows);
  const firstProblem = problems.find((p) => p != null) ?? null;

  const save = () => {
    setTried(true);
    const blocks = hourBlocksFromRows(rows);
    if (blocks) onSave(blocks);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={t('form.hour.title')} data-hour-blocks>
      <div className="flex max-h-full w-full max-w-[560px] flex-col overflow-hidden bg-ar-surface sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-ar-subtle px-4 py-3">
          <button type="button" onClick={onClose} aria-label={t('form.block.close')} className="h-9 w-9 rounded-lg text-xl text-ar-muted hover:bg-ar-subtle hover:text-ar-ink">‹</button>
          <h2 className="m-0 text-lg font-bold text-ar-ink">{t('form.hour.title')}</h2>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 py-4">
          <p className="m-0 text-sm text-ar-muted">{t('form.hour.hint')}</p>
          <div className="flex flex-col gap-3">
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">{t('form.hour.listTitle')}</h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {rows.map((row, i) => {
                const problem = tried ? problems[i] : null;
                return (
                  <li key={i} className="flex items-center gap-2" data-hour-row>
                    <input
                      id={i === 0 ? 'pf-hour-0' : undefined}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={2}
                      aria-label={t('form.hour.hoursOf', { n: i + 1 })}
                      aria-invalid={problem === 'hours' || problem === 'repeated' || undefined}
                      placeholder="—"
                      value={row.hours == null ? '' : String(row.hours)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                        setRows((r) => setHourRow(r, i, { hours: digits ? Number(digits) : null }));
                      }}
                      className={`${hoursBox} ${problem === 'hours' || problem === 'repeated' ? 'border-ar-danger' : ''}`}
                    />
                    <span className="text-[15px] text-ar-ink-2">{t('form.hour.unit')}</span>
                    <MoneyBox
                      value={row.price}
                      onChange={(n) => setRows((r) => setHourRow(r, i, { price: n }))}
                      label={t('form.hour.priceOf', { n: i + 1 })}
                      invalid={problem === 'price'}
                    />
                    <button
                      type="button"
                      onClick={() => setRows((r) => removeHourRow(r, i))}
                      aria-label={t('form.hour.remove', { n: i + 1 })}
                      className="h-9 w-9 flex-none rounded-lg text-lg text-ar-muted hover:bg-ar-subtle hover:text-ar-ink"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
            {canAddHourRow(rows) ? (
              <button type="button" onClick={() => setRows((r) => addHourRow(r))} className="w-fit text-sm font-semibold text-ar-primary hover:underline">
                {t('form.hour.add')}
              </button>
            ) : (
              <span className="text-sm text-ar-muted">{t('form.hour.max', { n: HOUR_BLOCK_MAX_COUNT })}</span>
            )}
          </div>
          {tried && firstProblem && (
            <p role="alert" className="m-0 text-sm text-ar-danger">
              {t(`form.hour.errors.${firstProblem}`)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-ar-subtle px-4 py-3">
          <button type="button" onClick={save} className={`${primaryBtn} w-full`}>{t('form.hour.save')}</button>
          {canTurnOff && (
            <button type="button" onClick={onTurnOff} className={`${outlineBtn} w-full text-ar-danger`}>{t('form.hour.turnOff')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
