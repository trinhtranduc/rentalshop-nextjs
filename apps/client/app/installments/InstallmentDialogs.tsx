'use client';

/**
 * Dialogs of the deposit stages on Chi tiết đơn (#1199): collect one stage, edit the plan of the order (read-only for
 * staff), the unpaid-stages block of the hand-over dialog, and the three-line cancel dialog. The page does the
 * refetch; each dialog calls the API and reports back with `onDone`.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { installmentsApi } from '@rentalshop/utils';
import { ActionDialog } from '../orders/detail/dialogs';
import { fieldClass, MoneyInput } from '../orders/create/parts';
import type { Money } from '../orders/list/parts';
import {
  KEEP_DUE,
  cancelView,
  collectProblem,
  dueOptionsFor,
  dueRuleText,
  dueRuleValue,
  editPayload,
  editProblem,
  editRowsOf,
  isStaffRole,
  newReference,
  previewEdit,
  shortDay,
  stageNumber,
  type EditRow,
  type OrderInstallment,
  type PlanOrderLike,
} from './installments-model';

type TD = (key: string, values?: Record<string, string | number>) => string;

const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ar-primary';
const closeBtn = `inline-flex h-11 items-center justify-center rounded-xl border border-ar-line bg-ar-surface px-4 text-[15px] font-semibold text-ar-ink hover:bg-ar-subtle disabled:opacity-50 ${ring}`;
const okBtn = `inline-flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-[15px] font-semibold disabled:opacity-60 sm:flex-none ${ring}`;
const labelClass = 'flex flex-col gap-1.5 text-sm font-semibold text-ar-ink-2';
const selectClass = `${fieldClass} cursor-pointer`;

// ----------------------------------------------------------------------------
// Thu giai đoạn N
// ----------------------------------------------------------------------------

export function CollectDialog({
  open,
  order,
  stage,
  role,
  todayKey,
  subtitle,
  td,
  money,
  closeLabel,
  onClose,
  onDone,
}: {
  open: boolean;
  order: PlanOrderLike & { id: number };
  stage: OrderInstallment | null;
  role?: string | null;
  todayKey: string;
  subtitle: string;
  td: TD;
  money: Money;
  closeLabel: string;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const staff = isStaffRole(role);
  const [amount, setAmount] = useState(0);
  const [day, setDay] = useState(todayKey);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // One reference per opened dialog: a retry after a network error collects once
  const reference = useRef(newReference('collect'));
  useEffect(() => {
    if (!open || !stage) return;
    setAmount(stage.plannedAmount);
    setDay(todayKey);
    setNote('');
    reference.current = newReference('collect');
  }, [open, stage, todayKey]);
  if (!stage) return null;
  const list = order.installments ?? [];
  const problem = collectProblem({ amount, max: stage.plannedAmount });
  const submit = async () => {
    if (problem || busy) return;
    setBusy(true);
    try {
      const res = await installmentsApi.collect(order.id, stage.key, {
        amount,
        method: 'CASH',
        ...(!staff && day && day !== todayKey ? { collectedOn: day } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        reference: reference.current,
      });
      if (res.success) {
        await onDone();
        onClose();
      }
    } catch {
      // useGlobalErrorHandler shows the API error
    } finally {
      setBusy(false);
    }
  };
  return (
    <ActionDialog
      open={open}
      title={td('collectTitle', { n: stageNumber(list, stage.key) })}
      subtitle={subtitle}
      onClose={onClose}
      closeLabel={closeLabel}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={closeBtn}>
            {td('cancel')}
          </button>
          <button type="button" onClick={() => void submit()} disabled={busy || !!problem} className={`${okBtn} bg-ar-primary text-ar-on-primary hover:opacity-95`} data-collect-confirm>
            {td('collectConfirm', { amount: money(amount) })}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold text-ar-ink">{stage.label}</span>
        <span className="text-xs text-ar-muted">{td('stageMeta', { percent: stage.percent, day: stage.dueDateKey ? td('dueOn', { day: shortDay(stage.dueDateKey) }) : '' })}</span>
      </div>
      <label className={labelClass}>
        {td('amount')}
        <MoneyInput value={amount} onChange={setAmount} label={td('amount')} />
        <span className={`text-xs font-normal ${problem ? 'text-ar-danger' : 'text-ar-muted'}`} role={problem ? 'alert' : undefined}>
          {problem === 'over' ? td('overStage', { amount: money(stage.plannedAmount) }) : td('amountHint', { amount: money(stage.plannedAmount) })}
        </span>
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {!staff && (
          <label className={labelClass}>
            {td('collectedOn')}
            <input type="date" className={fieldClass} value={day} max={todayKey} onChange={(e) => setDay(e.target.value || todayKey)} />
          </label>
        )}
        <label className={`${labelClass} ${staff ? 'sm:col-span-2' : ''}`}>
          {td('note')}
          <input className={fieldClass} value={note} maxLength={500} placeholder={td('notePlaceholder')} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
    </ActionDialog>
  );
}

// ----------------------------------------------------------------------------
// Sửa kế hoạch thanh toán (read-only for staff)
// ----------------------------------------------------------------------------

export function EditPlanDialog({
  open,
  order,
  canEdit,
  currency,
  td,
  money,
  closeLabel,
  onClose,
  onDone,
}: {
  open: boolean;
  order: PlanOrderLike & { id: number };
  canEdit: boolean;
  currency?: string | null;
  td: TD;
  money: Money;
  closeLabel: string;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<EditRow[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setRows(editRowsOf(order));
  }, [open, order]);
  const shop = useMemo(() => ({ currency }), [currency]);
  const stages = useMemo(() => (open && rows.length > 0 ? previewEdit(order, rows, shop) : []), [open, order, rows, shop]);
  const total = order.totalAmount ?? 0;
  const problem = editProblem(rows, stages, total);
  const rest = stages.find((s) => s.isRest);
  const sumPercent = Math.round(stages.reduce((s, x) => s + x.percent, 0) * 100) / 100;
  const setRow = (key: string, patch: Partial<EditRow>) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const submit = async () => {
    if (problem || busy) return;
    setBusy(true);
    try {
      const res = await installmentsApi.editPlan(order.id, editPayload(rows));
      if (res.success) {
        await onDone();
        onClose();
      }
    } catch {
      // useGlobalErrorHandler shows the API error
    } finally {
      setBusy(false);
    }
  };
  return (
    <ActionDialog
      open={open}
      title={td(canEdit ? 'editTitle' : 'viewTitle')}
      onClose={onClose}
      closeLabel={closeLabel}
      busy={busy}
      footer={
        canEdit ? (
          <>
            <button type="button" onClick={onClose} disabled={busy} className={closeBtn}>
              {td('cancel')}
            </button>
            <button type="button" onClick={() => void submit()} disabled={busy || !!problem} className={`${okBtn} bg-ar-primary text-ar-on-primary hover:opacity-95`} data-plan-save>
              {td('savePlan')}
            </button>
          </>
        ) : (
          <button type="button" onClick={onClose} className={closeBtn} data-autofocus>
            {td('close')}
          </button>
        )
      }
    >
      <p className="m-0 rounded-xl border border-ar-line bg-ar-surface-muted px-3 py-2 text-sm text-ar-ink-2" data-plan-note>
        {canEdit ? td('editNote') : td('staffNote')}
      </p>
      {rows.map((row, index) => {
        const stage = stages.find((s) => s.key === row.key);
        const locked = row.locked || !canEdit;
        return (
          <div key={row.key} className="flex flex-col gap-2 rounded-xl border border-ar-line px-3.5 py-3" data-plan-row={row.key}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[15px] font-bold text-ar-ink">{td('stageTitle', { n: index + 1, label: row.label })}</span>
              <span className="text-[15px] font-bold tabular-nums text-ar-ink">{money(stage?.amount ?? 0)}</span>
            </div>
            {row.locked ? (
              <span className="text-xs font-semibold text-ar-done">
                {td('paidLocked', { percent: stage?.percent ?? row.value })}
              </span>
            ) : (
              <div className="grid grid-cols-[96px_1fr] gap-2.5">
                <label className="flex flex-col gap-1 text-xs font-semibold text-ar-muted">
                  {td('percentOfOrder')}
                  {locked ? (
                    <span className="text-[15px] font-bold tabular-nums text-ar-ink">{row.value}%</span>
                  ) : (
                    <span className="relative block">
                      <input
                        inputMode="decimal"
                        className={`${fieldClass} pr-7 tabular-nums`}
                        value={row.value ? String(row.value) : ''}
                        onChange={(e) => setRow(row.key, { value: Math.min(100, Number(e.target.value.replace(/[^\d.]/g, '')) || 0) })}
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ar-muted">%</span>
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-ar-muted">
                  {td('dueLabel')}
                  {locked ? (
                    <span className="text-[15px] font-bold text-ar-ink">{td('dueOn', { day: shortDay(stage?.dueDateKey) })}</span>
                  ) : (
                    <select className={selectClass} value={row.due} onChange={(e) => setRow(row.key, { due: e.target.value })}>
                      <option value={KEEP_DUE}>{td('keepDue', { day: shortDay(row.dueDateKey) })}</option>
                      {dueOptionsFor(null).map((rule) => (
                        <option key={dueRuleValue(rule)} value={dueRuleValue(rule)}>
                          {dueRuleText(rule, td)}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              </div>
            )}
            {!row.locked && stage?.dueDateKey && !locked && row.due !== KEEP_DUE && <span className="text-xs text-ar-muted">{td('dueOn', { day: shortDay(stage.dueDateKey) })}</span>}
          </div>
        );
      })}
      {rest && (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-ar-line bg-ar-surface-muted px-3.5 py-3" data-plan-row="rest">
          <span className="flex flex-col">
            <span className="text-[15px] font-bold text-ar-ink">{td('stageTitle', { n: rows.length + 1, label: td('restTitle') })}</span>
            <span className="text-xs text-ar-muted">{td('restLocked', { day: shortDay(rest.dueDateKey) })}</span>
          </span>
          <span className="flex flex-col items-end">
            <span className="text-[15px] font-bold tabular-nums text-ar-ink">{money(rest.amount)}</span>
            <span className="text-xs tabular-nums text-ar-muted">{rest.percent}%</span>
          </span>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-3 border-t border-ar-line pt-2.5 text-sm">
        <span className="font-bold text-ar-ink">{td('total')}</span>
        <span className={`font-semibold tabular-nums ${problem ? 'text-ar-danger' : 'text-ar-done'}`}>{td('totalLine', { percent: sumPercent, amount: money(total) })}</span>
      </div>
      {problem && (
        <p role="alert" className="m-0 text-sm font-medium text-ar-danger">
          {td(`editProblem.${problem}`)}
        </p>
      )}
    </ActionDialog>
  );
}

// ----------------------------------------------------------------------------
// Giao đồ: unpaid stages (inside the hand-over dialog)
// ----------------------------------------------------------------------------

export function UnpaidStages({
  stages,
  td,
  money,
}: {
  stages: OrderInstallment[];
  td: TD;
  money: Money;
}) {
  if (stages.length === 0) return null;
  const sum = stages.reduce((s, x) => s + x.plannedAmount, 0);
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-2xl border border-ar-unprepared bg-ar-unprepared-bg px-4 py-3" data-unpaid-stages>
      <p className="m-0 text-[15px] font-bold text-ar-unprepared">{td('unpaidTitle')}</p>
      <p className="m-0 text-sm text-ar-ink-2">{td('unpaidHint')}</p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {stages.map((stage) => (
          <li key={stage.key} className="flex items-baseline justify-between gap-3 text-[15px]" data-unpaid-stage={stage.key}>
            <span className="text-ar-ink">{stage.label}</span>
            <span className="font-bold tabular-nums text-ar-ink">{money(stage.plannedAmount)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-ar-line pt-2 text-sm">
        <span className="font-semibold text-ar-ink-2">{td('unpaidTotal', { amount: money(sum) })}</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Huỷ đơn: Khách đã trả / Tiệm giữ lại / Hoàn cho khách
// ----------------------------------------------------------------------------

export function CancelWithKeptDialog({
  open,
  order,
  role,
  message,
  td,
  money,
  closeLabel,
  keepLabel,
  confirmLabel,
  onClose,
  onDone,
}: {
  open: boolean;
  order: PlanOrderLike & { id: number };
  role?: string | null;
  message: string;
  td: TD;
  money: Money;
  closeLabel: string;
  keepLabel: string;
  confirmLabel: string;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [kept, setKept] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setKept(0);
  }, [open]);
  const view = cancelView(order, role, kept);
  const submit = async () => {
    setBusy(true);
    try {
      // Only the owner and the outlet admin choose what the shop keeps; for staff the server refunds it all
      const res = await installmentsApi.cancelOrderWithKept(order.id, view.canEditKept ? view.kept : undefined);
      if (res.success) {
        await onDone();
        onClose();
      }
    } catch {
      // useGlobalErrorHandler shows the API error
    } finally {
      setBusy(false);
    }
  };
  return (
    <ActionDialog
      open={open}
      title={td('cancelTitle')}
      onClose={onClose}
      closeLabel={closeLabel}
      busy={busy}
      footer={
        <>
          <button type="button" data-autofocus onClick={onClose} disabled={busy} className={`${closeBtn} flex-1 sm:flex-none`}>
            {keepLabel}
          </button>
          <button type="button" onClick={() => void submit()} disabled={busy} className={`${okBtn} bg-ar-danger text-white hover:opacity-95`} data-cancel-confirm>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="m-0 text-[15px] text-ar-ink-2">{message}</p>
      {order.depositPlanPolicy && (
        <p className="m-0 whitespace-pre-line rounded-xl border border-ar-line bg-ar-surface-muted px-3 py-2 text-xs text-ar-ink-2" data-cancel-policy>
          {td('policyLine', { policy: order.depositPlanPolicy })}
        </p>
      )}
      <dl className="m-0 flex flex-col gap-2.5 text-[15px]">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ar-ink">{td('cancelPaid')}</dt>
          <dd className="m-0 font-bold tabular-nums text-ar-ink" data-cancel-paid>
            {money(view.paid)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ar-ink">{td('cancelKept')}</dt>
          <dd className="m-0 w-[170px]">
            {view.canEditKept ? (
              <MoneyInput value={view.kept} onChange={setKept} label={td('cancelKept')} />
            ) : (
              <span className="block text-right font-bold tabular-nums text-ar-ink">{money(0)}</span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ar-ink">{td('cancelRefund')}</dt>
          <dd className="m-0 text-lg font-bold tabular-nums text-ar-done" data-cancel-refund>
            {money(view.refund)}
          </dd>
        </div>
      </dl>
      <p className="m-0 text-xs text-ar-muted">{td(view.canEditKept ? 'cancelHint' : 'cancelHintStaff')}</p>
    </ActionDialog>
  );
}
