'use client';

/**
 * #560 action dialogs of Chi tiết đơn: Giao đồ, Nhận trả, Huỷ / Xoá. Shell tokens; rows and labels
 * follow the iOS hand-over / return sheets (see ./actions-model). The page does the API calls.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import type { Money, T } from '../list/parts';
import { handOverMoney, parseFee, returnMoney, type MoneyRow } from './actions-model';
import type { OrderDetailLike } from '../orders-model';

const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ar-primary';
const closeBtn = `inline-flex h-11 items-center justify-center rounded-xl border border-ar-line bg-ar-surface px-4 text-[15px] font-semibold text-ar-ink hover:bg-ar-subtle disabled:opacity-50 ${ring}`;
const okBtn = `inline-flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-[15px] font-semibold disabled:opacity-60 sm:flex-none ${ring}`;

export function ActionDialog({
  open,
  title,
  subtitle,
  onClose,
  closeLabel,
  busy,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeLabel: string;
  busy?: boolean;
  children?: React.ReactNode;
  footer: React.ReactNode;
}) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  // Focus in on open, back to the opener on close; Esc closes unless a call is running.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) closeRef.current();
      // Keep Tab inside the dialog
      if (e.key !== 'Tab' || !panelRef.current) return;
      const els = [...panelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')];
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const first = panelRef.current?.querySelector<HTMLElement>('input, [data-autofocus]');
    (first || panelRef.current)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => !busy && onClose()} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className="relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-ar-surface text-ar-ink shadow-xl outline-none sm:max-w-[460px] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={id} className="m-0 text-xl font-bold">
              {title}
            </h2>
            {subtitle && <p className="m-0 text-sm tabular-nums text-ar-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={closeLabel}
            className={`-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-ar-muted hover:bg-ar-subtle ${ring}`}
          >
            <ShellIcon d={ICONS.close} size={18} />
          </button>
        </div>
        {children && <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-3">{children}</div>}
        <div className="flex gap-2.5 px-5 pb-5 pt-3 sm:justify-end">{footer}</div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Money box
// ----------------------------------------------------------------------------

function MoneyBox({
  rows,
  total,
  t,
  money,
}: {
  rows: MoneyRow<string>[];
  total: { label: string; amount: number; tone: string };
  t: T;
  money: Money;
}) {
  return (
    <dl className="m-0 flex flex-col gap-2 rounded-2xl bg-ar-surface-muted px-4 py-3 text-[15px]">
      {rows.map((r) => (
        <div key={r.key} className="flex items-baseline justify-between gap-3">
          <dt className="text-ar-ink-2">{t(`detail.dialog.rows.${r.key}`)}</dt>
          <dd className="m-0 tabular-nums text-ar-ink">{money(r.amount)}</dd>
        </div>
      ))}
      <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-ar-line pt-2.5">
        <dt className="text-base font-bold text-ar-ink">{total.label}</dt>
        <dd className={`m-0 text-xl font-bold tabular-nums ${total.tone}`}>{money(total.amount)}</dd>
      </div>
    </dl>
  );
}

export interface DialogItem {
  id: number | string;
  name: string;
  qty: number;
  image: string | null;
}

function Items({ items }: { items: DialogItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 text-[15px]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-ar-subtle text-ar-muted">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <ShellIcon d={ICONS.box} size={18} />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-ar-ink">{item.name}</span>
          <span className="shrink-0 tabular-nums text-ar-muted">× {item.qty}</span>
        </li>
      ))}
    </ul>
  );
}

function Papers({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <p className="m-0 text-[15px] text-ar-ink-2">
      {label}: <span className="font-semibold text-ar-ink">{text}</span>
    </p>
  );
}

// ----------------------------------------------------------------------------
// Giao đồ / Nhận trả
// ----------------------------------------------------------------------------

interface ActionProps {
  open: boolean;
  onClose: () => void;
  order: OrderDetailLike;
  subtitle: string;
  items: DialogItem[];
  papers: string;
  t: T;
  money: Money;
}

/** Runs the confirm, closes on success; the page shows API errors. */
function useSubmit(onClose: () => void) {
  const [submitting, setSubmitting] = useState(false);
  const run = async (action: () => Promise<boolean | void>) => {
    setSubmitting(true);
    try {
      const ok = await action();
      if (ok !== false) onClose();
    } catch {
      // useGlobalErrorHandler shows the API error
    } finally {
      setSubmitting(false);
    }
  };
  return { submitting, run };
}

export function HandOverDialog({ onConfirm, ...p }: ActionProps & { onConfirm: () => Promise<boolean | void> }) {
  const { submitting, run } = useSubmit(p.onClose);
  const m = handOverMoney(p.order);
  return (
    <ActionDialog
      open={p.open}
      title={p.t('detail.dialog.handover.title')}
      subtitle={p.subtitle}
      onClose={p.onClose}
      closeLabel={p.t('detail.dialog.close')}
      busy={submitting}
      footer={
        <>
          <button type="button" onClick={p.onClose} disabled={submitting} className={closeBtn}>
            {p.t('detail.dialog.close')}
          </button>
          <button type="button" onClick={() => run(onConfirm)} disabled={submitting} className={`${okBtn} bg-ar-primary text-ar-on-primary hover:opacity-95`}>
            {m.due > 0 ? p.t('detail.dialog.handover.confirm', { amount: p.money(m.due) }) : p.t('detail.dialog.handover.confirmFree')}
          </button>
        </>
      }
    >
      <Items items={p.items} />
      <MoneyBox rows={m.rows} total={{ label: p.t('detail.dialog.result.due'), amount: m.due, tone: 'text-ar-ink' }} t={p.t} money={p.money} />
      <Papers label={p.t('detail.dialog.papersKeep')} text={p.papers} />
    </ActionDialog>
  );
}

export function ReturnDialog({
  onConfirm,
  initialDamageFee,
  lateDays,
  ...p
}: ActionProps & { initialDamageFee: number; lateDays: number; onConfirm: (damageFee: number) => Promise<boolean | void> }) {
  const { submitting, run } = useSubmit(p.onClose);
  const [damage, setDamage] = useState({ text: initialDamageFee ? String(initialDamageFee) : '', value: initialDamageFee || 0 });
  useEffect(() => {
    if (p.open) setDamage({ text: initialDamageFee ? String(initialDamageFee) : '', value: initialDamageFee || 0 });
  }, [p.open, initialDamageFee]);
  const m = returnMoney(p.order, damage.value);
  const r = m.result;
  const total =
    r.kind === 'refund'
      ? { label: p.t('detail.dialog.result.refund'), amount: r.amount, tone: 'text-ar-done' }
      : r.kind === 'collect'
        ? { label: p.t('detail.dialog.result.collect'), amount: r.amount, tone: 'text-ar-ink' }
        : { label: p.t('detail.dialog.result.nothing'), amount: 0, tone: 'text-ar-ink' };
  const confirm =
    r.kind === 'refund'
      ? p.t('detail.dialog.takeBack.confirmRefund', { amount: p.money(r.amount) })
      : r.kind === 'collect'
        ? p.t('detail.dialog.takeBack.confirmCollect', { amount: p.money(r.amount) })
        : p.t('detail.dialog.takeBack.confirmFree');
  const fieldId = useId();
  return (
    <ActionDialog
      open={p.open}
      title={p.t('detail.dialog.takeBack.title')}
      subtitle={p.subtitle}
      onClose={p.onClose}
      closeLabel={p.t('detail.dialog.close')}
      busy={submitting}
      footer={
        <>
          <button type="button" onClick={p.onClose} disabled={submitting} className={closeBtn}>
            {p.t('detail.dialog.close')}
          </button>
          <button
            type="button"
            onClick={() => run(() => onConfirm(damage.value))}
            disabled={submitting}
            className={`${okBtn} bg-ar-primary text-ar-on-primary hover:opacity-95`}
          >
            {confirm}
          </button>
        </>
      }
    >
      <Items items={p.items} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ar-ink-2">
            {lateDays > 0 ? p.t('detail.dialog.takeBack.lateFeeDays', { days: lateDays }) : p.t('detail.dialog.takeBack.lateFee')}
          </span>
          <span className={`flex h-11 items-center rounded-xl border border-ar-line-soft bg-ar-subtle px-3 text-[15px] tabular-nums ${m.lateFee > 0 ? 'text-ar-danger' : 'text-ar-muted'}`}>
            {p.money(m.lateFee)}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId} className="text-sm font-semibold text-ar-ink-2">
            {p.t('detail.dialog.takeBack.damageFee')}
          </label>
          <input
            id={fieldId}
            inputMode="decimal"
            autoComplete="off"
            value={damage.text}
            placeholder="0"
            onChange={(e) => setDamage(parseFee(e.target.value))}
            className="h-11 w-full min-w-0 rounded-xl border border-ar-line bg-ar-surface px-3 text-right text-[15px] tabular-nums text-ar-ink placeholder:text-ar-faint focus:border-ar-primary focus:outline-none focus:ring-2 focus:ring-ar-primary-soft"
          />
        </div>
      </div>
      <MoneyBox rows={m.rows} total={total} t={p.t} money={p.money} />
      <Papers label={p.t('detail.dialog.papersReturn')} text={p.papers} />
    </ActionDialog>
  );
}

// ----------------------------------------------------------------------------
// Huỷ / Xoá
// ----------------------------------------------------------------------------

export function DangerDialog({
  open,
  title,
  message,
  keepLabel,
  confirmLabel,
  closeLabel,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  keepLabel: string;
  confirmLabel: string;
  closeLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ActionDialog
      open={open}
      title={title}
      onClose={onClose}
      closeLabel={closeLabel}
      busy={busy}
      footer={
        <>
          <button type="button" data-autofocus onClick={onClose} disabled={busy} className={`${closeBtn} flex-1 sm:flex-none`}>
            {keepLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={`${okBtn} bg-ar-danger text-white hover:opacity-95`}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="m-0 text-[15px] text-ar-ink-2">{message}</p>
    </ActionDialog>
  );
}
