'use client';

/**
 * #569 confirm before a new order, like the iOS `CreateOrderConfirmSheet`: Khách, Lịch thuê, Món, Tổng đơn,
 * the "Trùng lịch" block when the shop allows overlaps, and the amount to collect now. Rows: ./confirm-model.
 */
import React from 'react';
import { ActionDialog } from '../detail/dialogs';
import type { Money, T } from '../list/parts';
import type { ConfirmView } from './confirm-model';

const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ar-primary';
const cancelBtn = `inline-flex h-11 items-center justify-center rounded-xl border border-ar-line bg-ar-surface px-4 text-[15px] font-semibold text-ar-ink hover:bg-ar-subtle disabled:opacity-50 ${ring}`;
const okBtn = `inline-flex h-11 flex-[1.6] items-center justify-center rounded-xl bg-ar-primary px-4 text-[15px] font-semibold text-ar-on-primary hover:opacity-95 disabled:opacity-60 sm:flex-none ${ring}`;

/** iOS `products.cart.create` / `products.cart.sellAndCollect` / `cart.overlap.createAnyway`. */
const BUTTON: Record<ConfirmView['confirmKey'], string> = {
  create: 'editor.submit.create',
  sell: 'editor.confirm.sell',
  createAnyway: 'editor.overlap.createAnyway',
};

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-ar-muted">{label}</dt>
      <dd className={`m-0 min-w-0 text-right tabular-nums ${strong ? 'text-base font-bold text-ar-ink' : 'text-ar-ink'}`}>{children}</dd>
    </div>
  );
}

export function CreateConfirmDialog({
  open,
  view,
  busy,
  onConfirm,
  onClose,
  t,
  money,
}: {
  open: boolean;
  view: ConfirmView | null;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
  t: T;
  money: Money;
}) {
  if (!view) return null;
  return (
    <ActionDialog
      open={open}
      title={t(`editor.confirm.${view.titleKey}`)}
      onClose={onClose}
      closeLabel={t('editor.close')}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={`${cancelBtn} flex-1 sm:flex-none`}>
            {t('editor.cancel')}
          </button>
          <button type="button" data-autofocus onClick={onConfirm} disabled={busy} className={okBtn}>
            {busy ? t('editor.saving') : t(BUTTON[view.confirmKey])}
          </button>
        </>
      }
    >
      <dl className="m-0 flex flex-col text-[15px]">
        <Row label={t('editor.confirm.customer')}>{view.customer}</Row>
        {view.range && view.days != null && (
          <Row label={t('editor.confirm.dates')}>{t('editor.confirm.range', { range: view.range, days: view.days })}</Row>
        )}
        <div className="flex flex-col gap-1 border-t border-ar-line-soft py-2">
          <dt className="text-ar-muted">{t('editor.confirm.items')}</dt>
          <dd className="m-0">
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {view.items.map((item) => (
                <li key={item.productId} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-ar-ink">
                    {item.name}
                    <span className="whitespace-nowrap tabular-nums text-ar-muted">
                      {' '}
                      × {item.quantity}
                      {item.days != null && ` × ${t('editor.confirm.days', { days: item.days })}`}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ar-ink">{money(item.total)}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
        {view.discount > 0 && <Row label={t('editor.money.discount')}>−{money(view.discount)}</Row>}
        {view.loyalty > 0 && <Row label={t('editor.money.loyalty')}>−{money(view.loyalty)}</Row>}
        <div className="border-t border-ar-line-soft">
          <Row label={t('editor.money.total')} strong>
            {money(view.total)}
          </Row>
        </div>
      </dl>

      {view.warnings.length > 0 && (
        <div role="alert" className="flex flex-col gap-1 rounded-xl bg-ar-unprepared-bg px-3 py-2.5 text-[15px] text-ar-ink">
          <p className="m-0 font-bold text-ar-unprepared">{t('editor.overlap.title')}</p>
          {view.warnings.map((w, i) => (
            <p key={`${i}-${w}`} className="m-0">
              {w}
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-[14px] bg-ar-primary-soft px-3.5 py-3 text-ar-primary-ink">
        <span className="text-[15px]">{t(`editor.confirm.${view.collectKey}`)}</span>
        <span className="text-[22px] font-bold tabular-nums">{money(view.collect)}</span>
      </div>
    </ActionDialog>
  );
}
