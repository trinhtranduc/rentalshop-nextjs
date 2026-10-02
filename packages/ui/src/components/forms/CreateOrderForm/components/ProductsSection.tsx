/**
 * ProductsSection - Component for product search and selected products
 */

import React from 'react';
import { 
  Card, 
  CardContent,
  Input,
  SearchableSelect,
  Skeleton,
  useFormatCurrency,
  ImageLightbox
} from '@rentalshop/ui';
import { useOrderTranslations, useProductTranslations } from '@rentalshop/hooks';
import { 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package, 
  X,
  Plus,
  Minus
} from 'lucide-react';
import { countRentalDays } from '@rentalshop/utils';
import type { 
  OrderItemFormData, 
  ProductWithStock,
  ProductAvailabilityStatus 
} from '../types';

// ============================================================================
// NUMBER INPUT WITH THOUSAND SEPARATOR
// ============================================================================

interface NumberInputProps {
  value: number;
  ariaLabel?: string;
  id?: string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
  decimals?: number;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  className = '',
  placeholder = '',
  decimals = 0,
  ariaLabel,
  id
}) => {
  const [displayValue, setDisplayValue] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);

  // Format number with thousand separators when not focused
  React.useEffect(() => {
    if (!isFocused) {
      if (value === 0 || value === null || value === undefined) {
        setDisplayValue('');
      } else {
        // Format with thousand separators
        const formatted = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value);
        setDisplayValue(formatted);
      }
    }
  }, [value, isFocused, decimals]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number when focused (without commas for easier editing)
    setDisplayValue(value ? value.toString() : '');
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Parse and validate
    const numValue = parseFloat(displayValue.replace(/,/g, '')) || 0;
    const bounded = max !== undefined ? Math.min(max, numValue) : numValue;
    const final = Math.max(min, bounded);
    onChange(final);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Allow only numbers, decimal point (for price inputs)
    if (input === '' || /^[\d\.]*$/.test(input)) {
      setDisplayValue(input);
    }
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
      aria-label={ariaLabel}
      id={id}
      inputMode="decimal"
    />
  );
};

// ============================================================================
// QUANTITY INPUT WITH INCREMENT/DECREMENT BUTTONS
// ============================================================================

interface QuantityInputProps {
  value: number;
  decreaseLabel?: string;
  increaseLabel?: string;
  inputLabel?: string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

const QuantityInput: React.FC<QuantityInputProps> = ({
  value,
  decreaseLabel = 'Decrease quantity',
  increaseLabel = 'Increase quantity',
  inputLabel = 'Quantity',
  onChange,
  min = 1,
  max,
  className = ''
}) => {
  const handleDecrease = () => {
    const newValue = Math.max(min, value - 1);
    onChange(newValue);
  };

  const handleIncrease = () => {
    const newValue = max !== undefined ? Math.min(max, value + 1) : value + 1;
    onChange(newValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    if (input === '' || /^\d+$/.test(input)) {
      const numValue = parseInt(input) || min;
      const bounded = max !== undefined ? Math.min(max, numValue) : numValue;
      const final = Math.max(min, bounded);
      onChange(final);
    }
  };

  return (
    <div className={`flex items-center border border-gray-300 rounded-md overflow-hidden bg-white ${className}`}>
      <button
        type="button"
        onClick={handleDecrease}
        disabled={value <= min}
        className="flex-shrink-0 w-8 h-8 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-gray-600"
        aria-label={decreaseLabel}
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className="w-9 min-w-0 text-center text-sm font-medium tabular-nums border-0 focus:ring-0 focus:outline-none bg-white px-0 h-8"
        aria-label={inputLabel}
        inputMode="numeric"
        min={min}
        max={max}
      />
      <button
        type="button"
        onClick={handleIncrease}
        disabled={max !== undefined && value >= max}
        className="flex-shrink-0 w-8 h-8 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-gray-600"
        aria-label={increaseLabel}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Compute day-aware line display for an order item
const getLineDisplay = (
  item: OrderItemFormData,
  orderType: 'RENT' | 'SALE',
  pickupDate?: string,
  returnDate?: string
): { isDaily: boolean; days: number; total: number } => {
  const isDaily = orderType === 'RENT' && (item.pricingType === 'DAILY' || item.product?.pricingType === 'DAILY');
  let days = 1;
  if (isDaily && pickupDate && returnDate) {
    // Pickup and return day both count (#351)
    days = countRentalDays(pickupDate, returnDate);
  }
  const lineDays = isDaily ? days : 1;
  return { isDaily, days: lineDays, total: (item.unitPrice || 0) * (item.quantity || 1) * lineDays };
};

/** Units free for the order period, reported up so the summary can warn before creating (#create-order UI). */
export interface ItemAvailability {
  free: number;
  total: number;
}

interface ProductsSectionProps {
  orderItems: OrderItemFormData[];
  products: ProductWithStock[];
  onAddProduct: (product: ProductWithStock) => void;
  onRemoveProduct: (productId: number) => void;
  onUpdateOrderItem: (productId: number, field: keyof OrderItemFormData, value: string | number) => void;
  onUpdatePricingOption?: (productId: number, optionId: number) => void;
  /** Switch FIXED (per rental) ↔ DAILY (per day) — available for every RENT line */
  onUpdatePricingType?: (productId: number, type: string) => void;
  onSearchProducts: (query: string) => Promise<any[]>;
  isLoadingProducts: boolean;
  orderType: 'RENT' | 'SALE';
  pickupDate?: string;
  returnDate?: string;
  getProductAvailabilityStatus: (product: ProductWithStock, startDate?: string, endDate?: string, requestedQuantity?: number) => Promise<ProductAvailabilityStatus>;
  currency?: 'USD' | 'VND';
  outletId?: number; // Required to get correct stock from outletStock
  onAvailabilityChange?: (productId: number, availability: ItemAvailability | null) => void;
}

/** Items of the order: search on top, then one line per item (details behind "⋯"). */
export const ProductsSection: React.FC<ProductsSectionProps> = ({
  orderItems,
  products,
  onAddProduct,
  onRemoveProduct,
  onUpdateOrderItem,
  onUpdatePricingOption,
  onUpdatePricingType,
  onSearchProducts,
  isLoadingProducts,
  orderType,
  pickupDate,
  returnDate,
  getProductAvailabilityStatus,
  outletId,
  onAvailabilityChange,
}) => {
  const t = useOrderTranslations();

  return (
    <Card className="flex w-full flex-col">
      <CardContent className="flex flex-col p-4 sm:p-5">
        <div className="relative">
          <SearchableSelect
            placeholder={t('messages.searchProducts')}
            value={undefined}
            onChange={(productId: number) => {
              const product = products.find(p => p.id === productId);
              if (product) onAddProduct(product);
            }}
            onSearch={onSearchProducts}
            searchPlaceholder={t('messages.searchProducts')}
            emptyText={t('messages.searchProductsAbove')}
            showAddNew={false}
            productRowStyle="default"
          />
          {isLoadingProducts && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {t('form.itemsTitle')} <span className="text-red-600" aria-hidden="true">*</span>
          </h2>
          <span className="text-xs tabular-nums text-gray-600">{orderItems.length}</span>
        </div>

        {orderItems.length === 0 ? (
          <div className="mt-3 flex flex-col items-center rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
            <Package className="h-10 w-10 text-gray-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-gray-900">{t('form.emptyTitle')}</p>
            <p className="mt-1 max-w-xs text-xs text-gray-600">{t('form.searchHint')}</p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200">
            {orderItems.map((item) => (
              <OrderItemRow
                key={item.productId}
                item={item}
                product={products.find(p => p.id === item.productId)}
                onRemove={onRemoveProduct}
                onUpdate={onUpdateOrderItem}
                onUpdatePricingOption={onUpdatePricingOption}
                onUpdatePricingType={onUpdatePricingType}
                orderType={orderType}
                pickupDate={pickupDate}
                returnDate={returnDate}
                getProductAvailabilityStatus={getProductAvailabilityStatus}
                outletId={outletId}
                onAvailabilityChange={onAvailabilityChange}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

interface OrderItemRowProps {
  item: OrderItemFormData;
  product?: ProductWithStock;
  onRemove: (productId: number) => void;
  onUpdate: (productId: number, field: keyof OrderItemFormData, value: string | number) => void;
  onUpdatePricingOption?: (productId: number, optionId: number) => void;
  onUpdatePricingType?: (productId: number, type: string) => void;
  orderType: 'RENT' | 'SALE';
  pickupDate?: string;
  returnDate?: string;
  getProductAvailabilityStatus: (product: ProductWithStock, startDate?: string, endDate?: string, requestedQuantity?: number) => Promise<ProductAvailabilityStatus>;
  outletId?: number;
  onAvailabilityChange?: (productId: number, availability: ItemAvailability | null) => void;
}

/** "Còn 8/12" or "Thiếu 3 · còn 8" for the period, or the outlet stock without dates. */
function useItemAvailability(
  product: ProductWithStock | undefined,
  orderType: 'RENT' | 'SALE',
  pickupDate: string | undefined,
  returnDate: string | undefined,
  quantity: number,
  getStatus: OrderItemRowProps['getProductAvailabilityStatus']
) {
  const [state, setState] = React.useState<{ loading: boolean; error: boolean; data: ItemAvailability | null }>({
    loading: false,
    error: false,
    data: null,
  });
  const ready = Boolean(product && orderType === 'RENT' && pickupDate && returnDate);

  React.useEffect(() => {
    if (!ready || !product) {
      setState({ loading: false, error: false, data: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: false }));
    const timer = setTimeout(async () => {
      try {
        const status = await getStatus(product, pickupDate, returnDate, quantity);
        if (cancelled) return;
        const free = status.effectivelyAvailable ?? status.totalAvailableStock ?? 0;
        setState({ loading: false, error: false, data: { free, total: status.totalStock ?? free } });
      } catch {
        if (!cancelled) setState({ loading: false, error: true, data: null });
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, product, pickupDate, returnDate, quantity, getStatus]);

  return { ready, ...state };
}

const OrderItemRow: React.FC<OrderItemRowProps> = ({
  item,
  product,
  onRemove,
  onUpdate,
  onUpdatePricingOption,
  onUpdatePricingType,
  orderType,
  pickupDate,
  returnDate,
  getProductAvailabilityStatus,
  outletId,
  onAvailabilityChange,
}) => {
  const formatMoney = useFormatCurrency();
  const t = useOrderTranslations();
  const [open, setOpen] = React.useState(Boolean(item.notes));
  const displayProduct = item.product || product;
  const name = displayProduct?.name || `#${item.productId}`;
  const imageUrl = displayProduct?.images?.[0];
  const line = getLineDisplay(item, orderType, pickupDate, returnDate);
  const pricingType = (item.pricingType || 'FIXED').toUpperCase();
  const availability = useItemAvailability(
    product || (item.product as ProductWithStock | undefined),
    orderType,
    pickupDate,
    returnDate,
    item.quantity || 1,
    getProductAvailabilityStatus
  );

  // Report the period result up so the summary can name short items
  React.useEffect(() => {
    onAvailabilityChange?.(item.productId, availability.ready ? availability.data : null);
  }, [availability.ready, availability.data, item.productId, onAvailabilityChange]);
  React.useEffect(() => () => onAvailabilityChange?.(item.productId, null), [item.productId, onAvailabilityChange]);

  const outletStock = outletId
    ? (product || displayProduct)?.outletStock?.find((os: any) => os.outletId === outletId)
    : undefined;
  const short = availability.data ? Math.max(0, (item.quantity || 1) - availability.data.free) : 0;

  let badge: React.ReactNode = null;
  if (availability.ready) {
    if (availability.loading && !availability.data) {
      badge = (
        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {t('form.avail.checking')}
        </span>
      );
    } else if (availability.error) {
      badge = <span className="text-xs font-medium text-red-700">{t('form.avail.error')}</span>;
    } else if (availability.data) {
      badge = (
        <span
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
            short > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'
          }`}
        >
          {short > 0 ? <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {short > 0
            ? t('form.avail.short', { count: short, free: availability.data.free })
            : t('form.avail.free', { free: availability.data.free, total: availability.data.total })}
        </span>
      );
    }
  } else if (orderType === 'RENT' && !(pickupDate && returnDate)) {
    badge = <span className="text-xs text-gray-600">{t('form.avail.pickDates')}</span>;
  } else if (outletStock) {
    badge = (
      <span className={`text-xs ${outletStock.available > 0 ? 'text-gray-600' : 'font-semibold text-red-700'}`}>
        {t('form.avail.stock', { available: outletStock.available, total: outletStock.stock })}
      </span>
    );
  }

  const options = ((item.product?.pricingOptions as any[]) || []);
  const setPricing = (nextType: string) => {
    if (nextType === pricingType) return;
    const matched = options.find((opt: any) => (opt.type || '').toUpperCase() === nextType);
    if (matched?.id != null && onUpdatePricingOption) onUpdatePricingOption(item.productId, matched.id);
    else onUpdatePricingType?.(item.productId, nextType);
  };
  const fieldLabel = 'mb-1 block text-xs font-medium text-gray-600';
  const ids = `item-${item.productId}`;

  return (
    <li className="px-3 py-3">
      {/* Line 1: what it is and whether it is free for the period */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
          {imageUrl ? (
            <ImageLightbox src={imageUrl} alt={name} triggerClassName="h-full w-full" imgClassName="object-cover" />
          ) : (
            <Package className="h-4 w-4 text-gray-400" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-gray-900">{name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {displayProduct?.barcode && <span className="text-xs text-gray-600">{displayProduct.barcode}</span>}
            {badge}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          aria-label={t('form.remove', { name })}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-red-50 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Line 2: every value with its label, the pricing choice in plain sight */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:ml-[3.25rem] sm:flex sm:flex-wrap sm:items-end">
        <div>
          <span className={fieldLabel}>{t('form.quantity')}</span>
          <QuantityInput
            value={item.quantity}
            onChange={(value) => onUpdate(item.productId, 'quantity', value)}
            min={1}
            decreaseLabel={t('form.decrease')}
            increaseLabel={t('form.increase')}
            inputLabel={t('form.quantity')}
          />
        </div>

        {orderType === 'RENT' && (
          <div>
            <span className={fieldLabel} id={`${ids}-pricing`}>{t('form.pricingMethod')}</span>
            <div role="radiogroup" aria-labelledby={`${ids}-pricing`} className="flex h-8 w-full min-w-0 overflow-hidden rounded-md border border-gray-300 p-0.5 sm:inline-flex sm:w-auto">
              {(['FIXED', 'DAILY'] as const).map((type) => {
                const selected = pricingType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPricing(type)}
                    className={`flex-1 whitespace-nowrap rounded px-2.5 text-xs font-medium transition-colors sm:flex-none ${
                      selected ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {t(`form.pricing.${type}`)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="sm:w-28">
          <label className={fieldLabel} htmlFor={`${ids}-price`}>
            {t('form.unitPrice')}
            {line.isDaily ? <span className="font-normal text-gray-500"> /{t('summary.day')}</span> : null}
          </label>
          <NumberInput
            id={`${ids}-price`}
            value={item.unitPrice}
            onChange={(value) => onUpdate(item.productId, 'unitPrice', value)}
            min={0}
            decimals={0}
            className="h-8 bg-white text-right text-sm tabular-nums"
          />
        </div>

        {orderType === 'RENT' && (
          <div className="sm:w-24">
            <label className={fieldLabel} htmlFor={`${ids}-deposit`}>{t('form.depositPerUnit')}</label>
            <NumberInput
              id={`${ids}-deposit`}
              value={item.deposit || 0}
              onChange={(value) => onUpdate(item.productId, 'deposit', value)}
              min={0}
              decimals={0}
              className="h-8 bg-white text-right text-sm tabular-nums"
            />
          </div>
        )}

        <div className="col-span-2 flex items-end justify-between gap-3 border-t border-gray-100 pt-2 sm:ml-auto sm:block sm:border-0 sm:pt-0 sm:text-right">
          <span className={`${fieldLabel} sm:mb-1`}>{t('form.lineTotal')}</span>
          <div>
            <p className="text-base font-semibold tabular-nums text-gray-900">{formatMoney(line.total)}</p>
            <p className="text-xs tabular-nums text-gray-600">
              {item.quantity} × {formatMoney(item.unitPrice)}
              {line.isDaily ? ` ${t('form.timesDays', { days: line.days })}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Item note: folded until needed */}
      <div className="mt-2 sm:ml-[3.25rem]">
        {open ? (
          <Input
            value={item.notes}
            onChange={(e) => onUpdate(item.productId, 'notes', e.target.value)}
            placeholder={t('messages.addNotesForItem')}
            aria-label={t('form.itemNote')}
            className="h-8 bg-white text-sm"
            autoFocus={!item.notes}
          />
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="min-h-[28px] text-xs font-medium text-blue-700 hover:underline">
            + {t('form.itemNote')}
          </button>
        )}
      </div>
    </li>
  );
};
