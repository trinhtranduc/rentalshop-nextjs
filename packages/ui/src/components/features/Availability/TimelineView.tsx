'use client';

import React, { useMemo } from 'react';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { cn } from '../../../lib/cn';
import type { ActiveOrder } from './types';

interface TimelineViewProps {
  orders: ActiveOrder[];
  selectedPickup?: string;
  selectedReturn?: string;
}

/**
 * Simple horizontal Gantt-chart showing rental periods.
 * Displays a 30-day window centered around the selected date range.
 */
export const TimelineView: React.FC<TimelineViewProps> = ({
  orders,
  selectedPickup,
  selectedReturn,
}) => {
  const t = useAvailabilityTranslations();

  const { startDate, endDate, days, todayOffset } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determine window: 30 days centered on selected range or today
    let center: Date;
    if (selectedPickup && selectedReturn) {
      const p = new Date(selectedPickup);
      const r = new Date(selectedReturn);
      center = new Date((p.getTime() + r.getTime()) / 2);
    } else {
      center = today;
    }

    const start = new Date(center);
    start.setDate(start.getDate() - 15);
    const end = new Date(center);
    end.setDate(end.getDate() + 15);

    const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const todayOff = Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return { startDate: start, endDate: end, days: totalDays, todayOffset: todayOff };
  }, [selectedPickup, selectedReturn]);

  const selectedRange = useMemo(() => {
    if (!selectedPickup || !selectedReturn) return null;
    const p = new Date(selectedPickup);
    const r = new Date(selectedReturn);
    const left = Math.max(0, Math.round((p.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const right = Math.min(days, Math.round((r.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    return { left: (left / days) * 100, width: ((right - left) / days) * 100 };
  }, [selectedPickup, selectedReturn, startDate, days]);

  const orderBars = useMemo(() => {
    return orders.map((order) => {
      if (!order.pickupPlanAt || !order.returnPlanAt) return null;
      const p = new Date(order.pickupPlanAt);
      const r = new Date(order.returnPlanAt);
      const left = Math.max(0, (p.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const right = Math.min(days, (r.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (right <= 0 || left >= days) return null;
      return {
        ...order,
        leftPct: (Math.max(0, left) / days) * 100,
        widthPct: ((Math.min(days, right) - Math.max(0, left)) / days) * 100,
      };
    }).filter(Boolean) as (ActiveOrder & { leftPct: number; widthPct: number })[];
  }, [orders, startDate, days]);

  // Generate day labels (show every 5th day)
  const dayLabels = useMemo(() => {
    const labels: { label: string; pct: number }[] = [];
    for (let i = 0; i <= days; i += 5) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      labels.push({
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        pct: (i / days) * 100,
      });
    }
    return labels;
  }, [startDate, days]);

  if (orders.length === 0 && !selectedRange) {
    return null;
  }

  return (
    <div className="border rounded-md p-2.5 sm:p-3 bg-bg-secondary/40">
      <h4 className="text-xs font-medium text-text-secondary mb-1.5">{t('timeline.title')}</h4>

      {/* Time axis labels */}
      <div className="relative h-5 mb-1">
        {dayLabels.map((dl) => (
          <span
            key={dl.pct}
            className="absolute text-[10px] text-text-secondary -translate-x-1/2"
            style={{ left: `${dl.pct}%` }}
          >
            {dl.label}
          </span>
        ))}
      </div>

      {/* Timeline body */}
      <div className="relative min-h-[40px] border-t border-border/60">
        {/* Selected range overlay */}
        {selectedRange && (
          <div
            className="absolute top-0 bottom-0 bg-blue-100/50 border-l border-r border-blue-300 z-0"
            style={{ left: `${selectedRange.left}%`, width: `${selectedRange.width}%` }}
          />
        )}

        {/* Today marker */}
        {todayOffset >= 0 && todayOffset <= days && (
          <div
            className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
            style={{ left: `${(todayOffset / days) * 100}%` }}
            title={t('timeline.today')}
          />
        )}

        {/* Order bars */}
        {orderBars.length === 0 ? (
          <div className="py-3 text-center text-xs text-text-secondary">
            {t('timeline.noOrders')}
          </div>
        ) : (
          <div className="space-y-1 py-1">
            {orderBars.map((bar) => (
              <div key={bar.id} className="relative h-5">
                <div
                  className={cn(
                    'absolute h-full rounded-sm text-[10px] leading-5 px-1 truncate',
                    bar.isConflict
                      ? 'bg-amber-200 border border-amber-400 text-amber-900'
                      : 'bg-gray-200 border border-gray-300 text-gray-700'
                  )}
                  style={{ left: `${bar.leftPct}%`, width: `${Math.max(bar.widthPct, 2)}%` }}
                  title={`${bar.orderNumber} - ${bar.customerName} (${bar.pickupPlanAt} → ${bar.returnPlanAt})`}
                >
                  {bar.orderNumber}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
