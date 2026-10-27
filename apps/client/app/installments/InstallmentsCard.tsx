'use client';

/**
 * Chi tiết đơn › "Thu theo giai đoạn" (#1199): how much of the order is collected, the stages with a status chip each,
 * the button for the next stage, "Sửa" for the owner and the outlet admin (staff only look), and "Huỷ khoản thu"
 * for the owner when a stage was collected by mistake. All numbers come from `installments[]` of the order response.
 */
import React from 'react';
import { cardClass, primaryBtn, type Money } from '../orders/list/parts';
import {
  canEditPlan,
  cancelledOutcome,
  canVoidStage,
  chipTone,
  collectedDayKey,
  hasPlan,
  nextStageToCollect,
  percentCollected,
  shortDay,
  stageNumber,
  type OrderInstallment,
  type PlanOrderLike,
} from './installments-model';

type TD = (key: string, values?: Record<string, string | number>) => string;

const CHIP: Record<'good' | 'info' | 'warn' | 'bad' | 'muted', string> = {
  good: 'bg-ar-done-bg text-ar-done',
  info: 'bg-ar-primary-soft text-ar-primary-ink',
  warn: 'bg-ar-unprepared-bg text-ar-unprepared',
  bad: 'bg-ar-late-bg text-ar-late',
  muted: 'bg-ar-subtle text-ar-muted',
};

export function StageChip({ status, td }: { status: string; td: TD }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${CHIP[chipTone(status)]}`}>{td(`status.${status}`)}</span>;
}

export function InstallmentsCard({
  order,
  role,
  td,
  money,
  toDayKey,
  onCollect,
  onEdit,
  onVoid,
}: {
  order: PlanOrderLike;
  role?: string | null;
  td: TD;
  money: Money;
  toDayKey: (v: string | Date) => string | null;
  onCollect: (stage: OrderInstallment) => void;
  onEdit: () => void;
  onVoid: (stage: OrderInstallment) => void;
}) {
  if (!hasPlan(order)) return null;
  const list = order.installments ?? [];
  const percent = percentCollected(order);
  const collected = order.installmentSummary?.collected ?? 0;
  const remaining = order.installmentSummary?.remaining ?? 0;
  const next = nextStageToCollect(order);
  const outcome = cancelledOutcome(order);
  const editable = canEditPlan(order, role);
  const meta = (stage: OrderInstallment) => {
    if (stage.paidAmount > 0) return td('paidMeta', { percent: stage.percent, day: shortDay(collectedDayKey(stage.collectedAt, toDayKey)) });
    return td('stageMeta', { percent: stage.percent, day: stage.dueDateKey ? td('dueOn', { day: shortDay(stage.dueDateKey) }) : '' });
  };
  return (
    <section className={`${cardClass} flex flex-col gap-3 px-5 py-4`} data-installments-card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-lg font-bold text-ar-ink">{td('cardTitle')}</h2>
        <span className="flex items-center gap-2.5">
          <span className="whitespace-nowrap rounded-full bg-ar-done-bg px-2.5 py-0.5 text-xs font-semibold text-ar-done" data-paid-percent>
            {td('paidBadge', { percent })}
          </span>
          <button type="button" onClick={onEdit} className="text-sm font-semibold text-ar-primary-ink hover:underline" data-edit-plan>
            {editable ? td('edit') : td('view')}
          </button>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ar-subtle" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={td('cardTitle')}>
        <div className="h-full rounded-full bg-ar-done" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-xs text-ar-muted">{td('collected')}</span>
          <span className="text-xl font-bold tabular-nums text-ar-ink">{money(collected)}</span>
        </span>
        <span className="flex flex-col text-right">
          <span className="text-xs text-ar-muted">{td('remaining')}</span>
          <span className="text-xl font-bold tabular-nums text-ar-ink">{money(remaining)}</span>
        </span>
      </div>
      {outcome && (
        <dl className="m-0 flex flex-col gap-1.5 border-t border-ar-subtle pt-2.5 text-[15px]" data-cancel-outcome>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ar-ink">{td('cancelKept')}</dt>
            <dd className="m-0 font-bold tabular-nums text-ar-ink" data-cancel-kept>{money(outcome.kept)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ar-ink">{td('cancelRefund')}</dt>
            <dd className="m-0 font-bold tabular-nums text-ar-done" data-cancel-refunded>{money(outcome.refund)}</dd>
          </div>
        </dl>
      )}
      <ul className="m-0 flex list-none flex-col p-0">
        {list.map((stage) => (
          <li key={stage.key} className="flex items-center gap-3 border-t border-ar-subtle py-2.5 first:border-t-0" data-stage={stage.key} data-stage-status={stage.status}>
            <span
              aria-hidden="true"
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold ${stage.status === 'PAID' ? 'bg-ar-done text-white' : 'bg-ar-primary-soft text-ar-primary-ink'}`}
            >
              {stage.status === 'PAID' ? '✓' : stageNumber(list, stage.key)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="break-words text-[15px] font-semibold text-ar-ink">{stage.key === 'rest' ? td('restTitle') : stage.label}</span>
              <span className="text-xs tabular-nums text-ar-muted">{stage.key === 'rest' ? td('restMeta', { percent: stage.percent, day: td('dueOn', { day: shortDay(stage.dueDateKey) }) }) : meta(stage)}</span>
              {canVoidStage(order, stage, role) && (
                <button type="button" onClick={() => onVoid(stage)} className="mt-0.5 self-start text-xs font-semibold text-ar-danger hover:underline" data-void-stage={stage.key}>
                  {td('voidLink')}
                </button>
              )}
            </span>
            <span className="flex flex-none flex-col items-end gap-1">
              <span className="text-[15px] font-bold tabular-nums text-ar-ink">{money(stage.amount)}</span>
              <StageChip status={stage.status} td={td} />
            </span>
          </li>
        ))}
      </ul>
      {next && (
        <button type="button" onClick={() => onCollect(next)} className={`${primaryBtn} h-[52px] rounded-[14px] text-base`} data-collect-stage={next.key}>
          {td('collectStage', { n: stageNumber(list, next.key) })}
        </button>
      )}
    </section>
  );
}
