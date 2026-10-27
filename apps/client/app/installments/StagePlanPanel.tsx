'use client';

/**
 * Tạo đơn in "Thu cọc theo giai đoạn" mode (#1199): the stages of the template with their amounts, in place of the
 * "Cọc" field. Percentages can be changed for this order by the owner and the outlet admin (staff use the template as
 * it is). The last stage is the automatic rest. "Thu ngay giai đoạn 1" says whether the first stage is collected with
 * the order.
 */
import React, { useId } from 'react';
import type { DepositTemplate, ResolvedInstallment } from '@rentalshop/utils';
import type { Money } from '../orders/list/parts';
import { fieldClass } from '../orders/create/parts';
import { shortDay, type CollectMethod, type PlanItemDraft } from './installments-model';

type TD = (key: string, values?: Record<string, string | number>) => string;

export type CollectChoice = CollectMethod | 'NONE';

export function StagePlanPanel({
  td,
  money,
  stages,
  todayKey,
  templates,
  templateId,
  onTemplate,
  items,
  canEdit,
  onPercent,
  over,
  firstAmount,
  collect,
  onCollect,
}: {
  td: TD;
  money: Money;
  stages: ResolvedInstallment[];
  todayKey: string;
  templates: DepositTemplate[];
  templateId: string;
  onTemplate: (id: string) => void;
  items: PlanItemDraft[];
  canEdit: boolean;
  onPercent: (index: number, value: number) => void;
  over: boolean;
  /** Amount of stage 1 when it can be collected now; 0 when it cannot */
  firstAmount: number;
  collect: CollectChoice;
  onCollect: (next: CollectChoice) => void;
}) {
  const selectId = useId();
  const dayText = (key: string | null) => (!key ? '' : key === todayKey ? td('today') : td('dueOn', { day: shortDay(key) }));
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-ar-line bg-ar-surface p-3.5" data-stage-plan>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-[15px] font-bold text-ar-ink">{td('createTitle')}</h3>
        {canEdit && templates.length > 1 && (
          <select
            id={selectId}
            value={templateId}
            onChange={(e) => onTemplate(e.target.value)}
            aria-label={td('template')}
            className="h-9 max-w-[220px] cursor-pointer rounded-[10px] border border-ar-line-strong bg-ar-surface px-2 text-sm font-semibold text-ar-primary-ink"
          >
            {templates.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {stages.map((stage, index) => (
          <li key={stage.key} className="flex items-center justify-between gap-3 border-t border-ar-subtle py-2 first:border-t-0" data-stage-row={stage.key}>
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] font-semibold text-ar-ink">{stage.isRest ? td('restTitle') : stage.label}</span>
              <span className="text-xs text-ar-muted">
                {stage.isRest ? td('restMeta', { day: dayText(stage.dueDateKey) }) : td('stageMeta', { percent: stage.percent, day: dayText(stage.dueDateKey) })}
              </span>
            </span>
            <span className="flex flex-none items-center gap-2.5">
              {stage.isRest ? (
                <span className="text-sm tabular-nums text-ar-muted">{stage.percent}%</span>
              ) : canEdit ? (
                <span className="relative block w-[84px]">
                  <input
                    inputMode="decimal"
                    aria-label={td('percentOf', { n: index + 1 })}
                    value={items[index] && items[index].value ? String(items[index].value) : ''}
                    onChange={(e) => onPercent(index, Math.min(100, Number(e.target.value.replace(/[^\d.]/g, '')) || 0))}
                    className={`${fieldClass} h-9 pr-7 text-sm tabular-nums`}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ar-muted">%</span>
                </span>
              ) : (
                <span className="text-sm tabular-nums text-ar-muted">{stage.percent}%</span>
              )}
              <span className="min-w-[88px] text-right text-[15px] font-bold tabular-nums text-ar-ink">{money(stage.amount)}</span>
            </span>
          </li>
        ))}
      </ul>
      {over && (
        <p role="alert" className="m-0 text-sm font-medium text-ar-danger">
          {td('overHundred')}
        </p>
      )}
      {firstAmount > 0 && (
        <label className="flex items-center justify-between gap-3 border-t border-ar-line pt-2.5 text-sm text-ar-ink-2">
          <span>{td('collectNow')}</span>
          <select
            value={collect}
            onChange={(e) => onCollect(e.target.value as CollectChoice)}
            aria-label={td('collectNow')}
            className="h-9 cursor-pointer rounded-[10px] border border-ar-line-strong bg-ar-surface px-2 text-sm font-semibold text-ar-primary-ink"
          >
            <option value="CASH">{td('collectCash', { amount: money(firstAmount) })}</option>
            <option value="NONE">{td('collectLater')}</option>
          </select>
        </label>
      )}
    </section>
  );
}
