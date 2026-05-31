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
  Button,
  Input,
} from '@rentalshop/ui';
import type { DateRange } from '@rentalshop/ui';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { parseProductImages } from '@rentalshop/utils';
import { ProductSearchField } from './ProductSearchField';
import { Package, X, Minus, Plus } from 'lucide-react';
import { cn } from '../../../lib/cn';
import type { ProductWithStock } from '@rentalshop/types';
import type { CurrencyCode } from '@rentalshop/types';
import type { SelectedProduct } from './types';

const sectionTitleClass = 'text-sm font-semibold text-text-primary';

interface AvailabilityInputPanelProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  dateError?: boolean;
  showOutletSelect: boolean;
  outletId?: number;
  outlets: Array<{ id: number; name: string }>;
  onOutletChange: (id: number | undefined) => void;
  selectedProducts: SelectedProduct[];
  activeProductId?: number;
  onSelectActive: (productId: number) => void;
  onAddProduct: (product: ProductWithStock) => void;
  onRemoveProduct: (productId: number) => void;
  onQuantityChange: (productId: number, qty: number) => void;
  canAddProduct: boolean;
  outletIdForSearch?: number;
  currency?: CurrencyCode;
  disabled?: boolean;
}

export const AvailabilityInputPanel: React.FC<AvailabilityInputPanelProps> = ({
  dateRange,
  onDateRangeChange,
  dateError,
  showOutletSelect,
  outletId,
  outlets,
  onOutletChange,
  selectedProducts,
  activeProductId,
  onSelectActive,
  onAddProduct,
  onRemoveProduct,
  onQuantityChange,
  canAddProduct,
  outletIdForSearch,
  currency,
  disabled,
}) => {
  const t = useAvailabilityTranslations();

  // Find current outlet name for display when not selectable
  const currentOutletName = outlets.find((o) => o.id === outletId)?.name;

  return (
    <div className="space-y-5">
      {/* 1. Outlet Selection (always visible) */}
      <div>
        <h3 className={sectionTitleClass}>{t('outlet')}</h3>
        <div className="mt-2">
          {showOutletSelect ? (
            <Select
              value={outletId ? String(outletId) : undefined}
              onValueChange={(v) => onOutletChange(v ? parseInt(v, 10) : undefined)}
            >
              <SelectTrigger className="h-9">
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
          ) : (
            <div className="h-9 flex items-center px-3 rounded-md border border-border bg-bg-secondary/50 text-sm text-text-primary">
              {currentOutletName || `Outlet #${outletId}`}
            </div>
          )}
        </div>
      </div>

      {/* 2. Product Selection */}
      <div className="border-t border-border pt-4">
        <h3 className={sectionTitleClass}>
          {t('sections.product')}
          <span className="ml-1.5 text-xs font-normal text-text-secondary tabular-nums">
            ({selectedProducts.length}/20)
          </span>
        </h3>
        <div className="mt-2 space-y-3">
          {canAddProduct && (
            <ProductSearchField
              onSelectProduct={onAddProduct}
              outletId={outletIdForSearch}
              currency={currency}
              disabled={disabled}
            />
          )}

          {selectedProducts.length > 0 && (
            <ul className="space-y-1.5 max-h-[min(280px,40vh)] overflow-y-auto -mx-1 px-1 pt-2 border-t border-border">
              {selectedProducts.map((sp) => {
                const images = parseProductImages(
                  sp.product as Parameters<typeof parseProductImages>[0]
                );
                const isActive = sp.product.id === activeProductId;

                return (
                  <li key={sp.product.id}>
                    <div
                      className={cn(
                        'flex items-center gap-2.5 p-2 rounded-md border transition-colors cursor-pointer',
                        isActive
                          ? 'border-blue-300 bg-blue-50/90 shadow-sm'
                          : 'border-border/80 bg-bg-secondary/40 hover:border-border hover:bg-bg-secondary/70'
                      )}
                      onClick={() => onSelectActive(sp.product.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectActive(sp.product.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="w-11 h-11 rounded-md overflow-hidden bg-bg-tertiary shrink-0 border border-border/80">
                        {images[0] ? (
                          <img src={images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-text-secondary/70" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="text-sm font-medium leading-tight truncate">
                          {sp.product.name}
                        </p>
                        {sp.product.barcode && (
                          <p className="text-[11px] text-text-secondary font-mono truncate mt-0.5">
                            {sp.product.barcode}
                          </p>
                        )}
                        <div
                          className="mt-1.5 inline-flex items-center h-7 border border-border rounded-md overflow-hidden bg-bg-card"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none"
                            disabled={sp.quantity <= 1}
                            onClick={() => onQuantityChange(sp.product.id, sp.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={sp.quantity}
                            onChange={(e) =>
                              onQuantityChange(
                                sp.product.id,
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            className="w-9 h-7 border-0 text-center text-xs px-0 focus-visible:ring-0"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none"
                            onClick={() => onQuantityChange(sp.product.id, sp.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 -mr-0.5 text-text-secondary hover:text-text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveProduct(sp.product.id);
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* 3. Rental Period */}
      <div className="border-t border-border pt-4">
        <h3 className={sectionTitleClass}>{t('sections.period')}</h3>
        <div className="mt-2">
          <DateRangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            minDate={new Date()}
            placeholder={`${t('pickupDate')} – ${t('returnDate')}`}
            disabled={disabled}
          />
          {dateError && <p className="text-xs text-red-600 mt-1">{t('invalidDates')}</p>}
        </div>
      </div>
    </div>
  );
};
