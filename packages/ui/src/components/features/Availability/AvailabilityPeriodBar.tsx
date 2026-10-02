'use client';

import React, { useMemo } from 'react';
import { DateRangePicker } from '@rentalshop/ui';
import type { DateRange } from '@rentalshop/ui';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { cn } from '../../../lib/cn';
import { quickRanges, todayShopKey } from './availability-days';

/** Picker dates are local-midnight Date objects; day keys map to them 1:1. */
export function keyToPickerDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function pickerDateToKey(date?: Date): string {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface AvailabilityPeriodBarProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
  dateError?: boolean;
  disabled?: boolean;
}

/** Rental period first (#availability): every answer on the page depends on it. */
export const AvailabilityPeriodBar: React.FC<AvailabilityPeriodBarProps> = ({ dateRange, onChange, dateError, disabled }) => {
  const t = useAvailabilityTranslations();
  const todayKey = todayShopKey();
  const ranges = useMemo(() => quickRanges(todayKey), [todayKey]);
  const fromKey = pickerDateToKey(dateRange.from);
  const toKey = pickerDateToKey(dateRange.to);

  const chips = [
    { id: 'today', range: ranges.today },
    { id: 'tomorrow', range: ranges.tomorrow },
    { id: 'weekend', range: ranges.weekend },
    { id: 'threeDays', range: ranges.threeDays },
  ] as const;

  return (
    <div className="rounded-xl border border-border bg-bg-card p-3 sm:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-3 md:w-[22rem] md:shrink-0">
          <span className="shrink-0 text-sm font-semibold text-text-primary">{t('sections.period')}</span>
          <div className="min-w-0 flex-1">
            <DateRangePicker
              value={dateRange}
              onChange={onChange}
              minDate={keyToPickerDate(todayKey)}
              placeholder={`${t('pickupDate')} – ${t('returnDate')}`}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('sections.period')}>
          {chips.map(({ id, range }) => {
            const selected = fromKey === range.from && toKey === range.to;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => onChange({ from: keyToPickerDate(range.from), to: keyToPickerDate(range.to) })}
                className={cn(
                  'inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors disabled:opacity-50',
                  selected ? 'border-gray-900 bg-gray-900 text-white' : 'border-border text-text-primary hover:bg-bg-secondary'
                )}
              >
                {t(`quick.${id}`)}
              </button>
            );
          })}
        </div>
      </div>
      {dateError && <p className="mt-2 text-xs text-red-600">{t('invalidDates')}</p>}
    </div>
  );
};
