'use client';

import React from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DateRangePicker,
} from '@rentalshop/ui';
import type { DateRange } from '@rentalshop/ui';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { ProductSearchField } from './ProductSearchField';
import type { ProductWithStock } from '@rentalshop/types';
import type { CurrencyCode } from '@rentalshop/types';

interface AvailabilityToolbarProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  dateError?: boolean;
  showOutletSelect: boolean;
  outletId?: number;
  outlets: Array<{ id: number; name: string }>;
  onOutletChange: (id: number | undefined) => void;
  onAddProduct: (product: ProductWithStock) => void;
  canAddProduct: boolean;
  outletIdForSearch?: number;
  currency?: CurrencyCode;
  disabled?: boolean;
}

export const AvailabilityToolbar: React.FC<AvailabilityToolbarProps> = ({
  dateRange,
  onDateRangeChange,
  dateError,
  showOutletSelect,
  outletId,
  outlets,
  onOutletChange,
  onAddProduct,
  canAddProduct,
  outletIdForSearch,
  currency,
  disabled,
}) => {
  const t = useAvailabilityTranslations();

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {showOutletSelect && (
          <div className="w-full lg:w-48 space-y-1.5 shrink-0">
            <Label className="text-xs font-medium text-text-secondary">{t('outlet')}</Label>
            <Select
              value={outletId ? String(outletId) : undefined}
              onValueChange={(v) => onOutletChange(v ? parseInt(v, 10) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectOutlet')} />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1.5">
          <Label className="text-xs font-medium text-text-secondary">{t('sections.period')}</Label>
          <DateRangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            minDate={new Date()}
            placeholder={`${t('pickupDate')} – ${t('returnDate')}`}
            disabled={disabled}
          />
          {dateError && (
            <p className="text-xs text-red-600">{t('invalidDates')}</p>
          )}
        </div>
      </div>

      {canAddProduct && (
        <div className="space-y-1.5 pt-1 border-t border-border/60">
          <Label className="text-xs font-medium text-text-secondary">{t('sections.product')}</Label>
          <ProductSearchField
            onSelectProduct={onAddProduct}
            outletId={outletIdForSearch}
            currency={currency}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};
