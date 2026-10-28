'use client';

/**
 * #1249 the day table of "Thuê theo ngày", edited on the product form: price for 1 … N days, the rule past the last
 * day (+X for each extra day, or keep the last price) and a live preview. Rows are radio rows, never a switch.
 */
import React, { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFormatCurrency } from '@rentalshop/ui';
import type { T } from '../orders/list/parts';
import { addDay, canAddDay, holdLastExample, previewFor, removeLastDay, setTier, type BlockDraft } from './block-model';

const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const box =
  'h-10 w-full rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 pr-7 text-right text-[15px] tabular-nums text-ar-ink outline-none focus:border-ar-primary';

export function MoneyBox({ value, onChange, label, invalid, id }: { value: number | null; onChange: (n: number | null) => void; label: string; invalid?: boolean; id?: string }) {
  return (
    <span className="relative inline-block w-44 max-w-full">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid || undefined}
        placeholder="—"
        value={value == null ? '' : group(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          onChange(digits ? Number(digits) : null);
        }}
        className={`${box} ${invalid ? 'border-ar-danger' : ''}`}
      />
      <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ar-faint">đ</span>
    </span>
  );
}

export function RadioRow({
  name,
  checked,
  onSelect,
  title,
  hint,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-3 border-t border-ar-subtle px-4 py-2 first:border-t-0">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input type="radio" name={name} checked={checked} onChange={onSelect} className="h-5 w-5 flex-none accent-[var(--ar-primary,#2563eb)]" />
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold text-ar-ink">{title}</span>
          {hint && <span className="text-xs text-ar-muted">{hint}</span>}
        </span>
      </label>
      {children}
    </div>
  );
}

export function BlockTableEditor({ block, onChange, showErrors, firstId }: { block: BlockDraft; onChange: (b: BlockDraft) => void; showErrors?: boolean; firstId?: string }) {
  const t = useTranslations('products.web') as unknown as T;
  const money = useFormatCurrency();
  const extraName = useId();
  const [previewDays, setPreviewDays] = useState(5);
  const startDay = block.startDay;
  const lastDay = startDay + block.tiers.length - 1;
  const preview = previewFor(block, previewDays);
  const hold = holdLastExample(block);
  const extraMissing = block.extraMode === 'EXTRA_PER_DAY' && block.extraPrice == null;

  return (
    <div className="flex flex-col gap-3" data-block-table>
      <h3 className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">{t('detail.block.tiersTitle')}</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {block.tiers.map((price, i) => {
          const last = i === block.tiers.length - 1;
          return (
            <li key={i} className="flex items-center gap-3">
              <span className="w-16 text-[15px] font-semibold text-ar-ink">{t('detail.block.dayRow', { n: startDay + i })}</span>
              <MoneyBox
                id={i === 0 ? firstId : undefined}
                value={price}
                onChange={(n) => onChange(setTier(block, i, n))}
                label={t('detail.block.dayRow', { n: startDay + i })}
                invalid={!!showErrors && price == null}
              />
              {last && block.tiers.length > 1 ? (
                <button type="button" onClick={() => onChange(removeLastDay(block))} aria-label={t('detail.block.removeDay', { n: startDay + i })} className="h-9 w-9 rounded-lg text-lg text-ar-muted hover:bg-ar-subtle hover:text-ar-ink">
                  ✕
                </button>
              ) : (
                <span className="w-9" />
              )}
            </li>
          );
        })}
      </ul>
      {canAddDay(block) && (
        <button type="button" onClick={() => onChange(addDay(block))} className="w-fit text-sm font-semibold text-ar-primary hover:underline">
          {t('detail.block.addDay', { n: lastDay + 1 })}
        </button>
      )}

      <div className="border-t border-ar-subtle pt-3">
        <h3 className="m-0 mb-2 text-base font-bold text-ar-ink">{t('detail.block.beyond', { n: lastDay })}</h3>
        <div role="radiogroup" aria-label={t('detail.block.beyond', { n: lastDay })} className="overflow-hidden rounded-xl border border-ar-line">
          <RadioRow name={extraName} checked={block.extraMode === 'EXTRA_PER_DAY'} onSelect={() => onChange({ ...block, extraMode: 'EXTRA_PER_DAY' })} title={t('detail.block.extraPerDay')}>
            <MoneyBox
              value={block.extraPrice}
              onChange={(n) => onChange({ ...block, extraMode: 'EXTRA_PER_DAY', extraPrice: n })}
              label={t('detail.block.extraPerDay')}
              invalid={!!showErrors && extraMissing}
            />
          </RadioRow>
          <RadioRow
            name={extraName}
            checked={block.extraMode === 'HOLD_LAST'}
            onSelect={() => onChange({ ...block, extraMode: 'HOLD_LAST' })}
            title={t('detail.block.holdLast')}
            hint={hold ? t('detail.block.holdLastHint', { days: hold.days, price: money(hold.price) }) : undefined}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ar-primary-soft px-4 py-3" data-block-preview>
        <span className="text-[15px] font-bold text-ar-ink">{t('detail.block.preview')}</span>
        <span className="flex items-center rounded-[10px] border border-ar-line-strong bg-ar-surface">
          <button type="button" aria-label={t('detail.block.lessDays')} onClick={() => setPreviewDays((d) => Math.max(1, d - 1))} className="h-9 w-9 text-lg hover:bg-ar-subtle">−</button>
          <span className="min-w-[64px] text-center text-[15px] font-semibold tabular-nums">{t('detail.block.previewDays', { n: previewDays })}</span>
          <button type="button" aria-label={t('detail.block.moreDays')} onClick={() => setPreviewDays((d) => Math.min(60, d + 1))} className="h-9 w-9 text-lg hover:bg-ar-subtle">+</button>
        </span>
        {preview && (
          <>
            <span className="min-w-0 flex-1 text-sm tabular-nums text-ar-ink-2">
              {money(preview.basePrice)} ({t('detail.block.previewDays', { n: preview.blockDays })})
              {preview.extraDays > 0 ? ` + ${preview.extraDays} × ${money(preview.extraPrice)}` : ''}
            </span>
            <span className="text-xl font-bold tabular-nums text-ar-primary-ink">{money(preview.total)}</span>
          </>
        )}
      </div>
    </div>
  );
}
