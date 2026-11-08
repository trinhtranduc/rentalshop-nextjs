'use client';

/**
 * Chi tiết đơn › "Tiệm giữ lại / Hoàn cho khách" of a cancelled order WITHOUT a deposit plan that kept a fee (#1491).
 * An order with a plan shows the same two lines inside its stages card (`InstallmentsCard`).
 */
import React from 'react';
import { cardClass, type Money } from '../orders/list/parts';
import { cancelledOutcome, hasPlan, type PlanOrderLike } from './installments-model';

type TD = (key: string, values?: Record<string, string | number>) => string;

export function CancelOutcomeCard({ order, td, money }: { order: PlanOrderLike; td: TD; money: Money }) {
  const outcome = hasPlan(order) ? null : cancelledOutcome(order);
  if (!outcome) return null;
  return (
    <section className={`${cardClass} flex flex-col gap-1.5 px-5 py-4`} data-cancel-outcome-card>
      <dl className="m-0 flex flex-col gap-1.5 text-[15px]" data-cancel-outcome>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ar-ink">{td('cancelKept')}</dt>
          <dd className="m-0 font-bold tabular-nums text-ar-ink" data-cancel-kept>{money(outcome.kept)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ar-ink">{td('cancelRefund')}</dt>
          <dd className="m-0 font-bold tabular-nums text-ar-done" data-cancel-refunded>{money(outcome.refund)}</dd>
        </div>
      </dl>
    </section>
  );
}
