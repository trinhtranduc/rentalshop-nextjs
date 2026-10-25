'use client';

/**
 * "Bảng giá theo ngày" (#1189) on the product detail page: radio rows for the rent price kind (Thuê theo lần /
 * Thuê theo ngày / Giá theo khối ngày), the table of prices by number of days, the rule past the last block and a
 * live preview. Never a switch or a segmented control. Rendered only for roles that may edit prices.
 */
import React, { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFormatCurrency, useToast } from '@rentalshop/ui';
import { productsApi } from '@rentalshop/utils';
import type { ProductUpdateInput } from '@rentalshop/types';
import { cardClass, outlineBtn, primaryBtn, type T } from '../../orders/list/parts';
import {
  addDay,
  buildSavePayload,
  canAddDay,
  draftFromProduct,
  draftProblem,
  holdLastExample,
  previewFor,
  removeLastDay,
  sameDraft,
  setTier,
  turnOff,
  type BlockProductSource,
  type PricingDraft,
  type RentMode,
} from '../block-model';

const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const box =
  'h-10 w-full rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 pr-7 text-right text-[15px] tabular-nums text-ar-ink outline-none focus:border-ar-primary';

function MoneyBox({ value, onChange, label, invalid }: { value: number | null; onChange: (n: number | null) => void; label: string; invalid?: boolean }) {
  return (
    <span className="relative inline-block w-44 max-w-full">
      <input
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

function RadioRow({
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

export function BlockPricingCard({ product, onSaved }: { product: BlockProductSource & { id: number }; onSaved: () => void }) {
  const t = useTranslations('products.web') as unknown as T;
  const money = useFormatCurrency();
  const { toastSuccess, toastError } = useToast();
  const group_ = useId();
  const extraName = useId();
  const saved = draftFromProduct(product);
  const [draft, setDraft] = useState<PricingDraft>(saved);
  const [previewDays, setPreviewDays] = useState(5);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => setDraft(draftFromProduct(product)), [product]);

  const dirty = !sameDraft(draft, saved);
  const problem = tried ? draftProblem(draft) : null;
  const block = draft.block;
  const startDay = block.startDay;
  const lastDay = startDay + block.tiers.length - 1;
  const preview = draft.mode === 'BLOCK' ? previewFor(block, previewDays) : null;
  const hold = holdLastExample(block);
  const patch = (next: Partial<PricingDraft>) => setDraft((d) => ({ ...d, ...next }));

  const save = async (next: PricingDraft = draft) => {
    setTried(true);
    const body = buildSavePayload(next);
    if (!body) return;
    setSaving(true);
    try {
      const res = await productsApi.updateProduct(product.id, { id: product.id, ...body } as unknown as ProductUpdateInput);
      // A refused save (BLOCK_TABLE_INVALID …) is shown by the global error handler
      if (!res.success) return;
      toastSuccess(t('detail.block.saved'));
      setTried(false);
      onSaved();
    } catch (e) {
      toastError(t('detail.block.saveFailed'), e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const off = () => {
    const next = turnOff(draft);
    setDraft(next);
    void save(next);
  };

  return (
    <section className={`${cardClass} flex flex-col gap-3 px-5 py-[18px]`} data-block-pricing-card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-lg font-bold text-ar-ink">{t('detail.block.title')}</h2>
        {saved.mode === 'BLOCK' && (
          <span className="rounded-full bg-ar-done-soft px-2.5 py-0.5 text-xs font-bold text-ar-done">{t('detail.block.active')}</span>
        )}
      </div>
      <p className="m-0 text-sm text-ar-muted">{t('detail.block.hint')}</p>

      <div role="radiogroup" aria-label={t('detail.block.title')} className="overflow-hidden rounded-xl border border-ar-line">
        <RadioRow name={group_} checked={draft.mode === 'FIXED'} onSelect={() => patch({ mode: 'FIXED' })} title={t('detail.block.modeOnce')}>
          <MoneyBox value={draft.perRental} onChange={(n) => patch({ perRental: n })} label={t('detail.block.modeOnce')} invalid={problem === 'priceEmpty' && draft.mode === 'FIXED'} />
        </RadioRow>
        <RadioRow name={group_} checked={draft.mode === 'DAILY'} onSelect={() => patch({ mode: 'DAILY' })} title={t('detail.block.modeDay')}>
          <MoneyBox value={draft.perDay} onChange={(n) => patch({ perDay: n })} label={t('detail.block.modeDay')} invalid={problem === 'priceEmpty' && draft.mode === 'DAILY'} />
        </RadioRow>
        <RadioRow name={group_} checked={draft.mode === 'BLOCK'} onSelect={() => patch({ mode: 'BLOCK' as RentMode })} title={t('detail.block.modeBlock')}>
          <span className="hidden text-right text-sm text-ar-muted sm:block">{t('detail.block.modeBlockHint')}</span>
        </RadioRow>
      </div>

      {draft.mode === 'BLOCK' && (
        <>
          <h3 className="m-0 mt-1 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">{t('detail.block.tiersTitle')}</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {block.tiers.map((price, i) => {
              const last = i === block.tiers.length - 1;
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-16 text-[15px] font-semibold text-ar-ink">{t('detail.block.dayRow', { n: startDay + i })}</span>
                  <MoneyBox
                    value={price}
                    onChange={(n) => patch({ block: setTier(block, i, n) })}
                    label={t('detail.block.dayRow', { n: startDay + i })}
                    invalid={problem === 'tierEmpty' && price == null}
                  />
                  {last && block.tiers.length > 1 ? (
                    <button type="button" onClick={() => patch({ block: removeLastDay(block) })} aria-label={t('detail.block.removeDay', { n: startDay + i })} className="h-9 w-9 rounded-lg text-lg text-ar-muted hover:bg-ar-subtle hover:text-ar-ink">
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
            <button type="button" onClick={() => patch({ block: addDay(block) })} className="w-fit text-sm font-semibold text-ar-primary hover:underline">
              {t('detail.block.addDay', { n: lastDay + 1 })}
            </button>
          )}

          <div className="border-t border-ar-subtle pt-3">
            <h3 className="m-0 mb-2 text-base font-bold text-ar-ink">{t('detail.block.beyond', { n: lastDay })}</h3>
            <div role="radiogroup" aria-label={t('detail.block.beyond', { n: lastDay })} className="overflow-hidden rounded-xl border border-ar-line">
              <RadioRow name={extraName} checked={block.extraMode === 'EXTRA_PER_DAY'} onSelect={() => patch({ block: { ...block, extraMode: 'EXTRA_PER_DAY' } })} title={t('detail.block.extraPerDay')}>
                <MoneyBox
                  value={block.extraPrice}
                  onChange={(n) => patch({ block: { ...block, extraMode: 'EXTRA_PER_DAY', extraPrice: n } })}
                  label={t('detail.block.extraPerDay')}
                  invalid={problem === 'extraEmpty'}
                />
              </RadioRow>
              <RadioRow
                name={extraName}
                checked={block.extraMode === 'HOLD_LAST'}
                onSelect={() => patch({ block: { ...block, extraMode: 'HOLD_LAST' } })}
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
        </>
      )}

      {problem && (
        <p role="alert" className="m-0 text-sm text-ar-danger">
          {t(`detail.block.problem.${problem}`)}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ar-subtle pt-3">
        {saved.mode === 'BLOCK' ? (
          <button type="button" onClick={off} disabled={saving} className="text-sm font-semibold text-ar-danger hover:underline">
            {t('detail.block.turnOff')}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => { setDraft(saved); setTried(false); }} disabled={!dirty || saving} className={outlineBtn}>
            {t('detail.block.cancel')}
          </button>
          <button type="button" onClick={() => void save()} disabled={!dirty || saving} className={primaryBtn}>
            {saving ? t('detail.block.saving') : t('detail.block.save')}
          </button>
        </div>
      </div>
    </section>
  );
}
