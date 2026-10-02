"use client";

/**
 * OrderInfoSection - Component for order information (customer, outlet, dates, etc.)
 */

import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DateRangePicker,
  RentalPeriodSelector,
  Textarea,
  Skeleton,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@rentalshop/ui';
import { useOrderTranslations } from '@rentalshop/hooks';
import { useFormattedFullDate } from '@rentalshop/utils/client';
import { getLocalDateKey, countRentalDays } from '@rentalshop/utils';
import { 
  User, 
  Search, 
  X, 
  Plus, 
  ChevronDown, 
  Info,
  MoreVertical,
  Edit,
  Eye,
  AlertCircle
} from 'lucide-react';
import type { 
  OrderFormData, 
  CustomerSearchResult,
  OrderItemFormData
} from '../types';
import { useFormatCurrency } from '@rentalshop/ui';
import { quickRanges, todayShopKey } from '../../../features/Availability/availability-days';

// ============================================================================
// NUMBER INPUT WITH THOUSAND SEPARATOR
// ============================================================================

interface NumberInputProps {
  value: number;
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
  id
}) => {
  const [displayValue, setDisplayValue] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      if (value === 0 || value === null || value === undefined) {
        setDisplayValue('');
      } else {
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
    setDisplayValue(value ? value.toString() : '');
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numValue = parseFloat(displayValue.replace(/,/g, '')) || 0;
    const bounded = max !== undefined ? Math.min(max, numValue) : numValue;
    const final = Math.max(min, bounded);
    onChange(final);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
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
      id={id}
      inputMode="decimal"
    />
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface OrderInfoSectionProps {
  formData: OrderFormData;
  outlets: Array<{ id: number; name: string; merchantId?: number }>;
  selectedCustomer: CustomerSearchResult | null;
  searchQuery: string;
  customerSearchResults: CustomerSearchResult[];
  isLoadingCustomers: boolean;
  isEditMode: boolean;
  merchantData?: any;
  onFormDataChange: (field: keyof OrderFormData, value: any) => void;
  onCustomerSelect: (customer: CustomerSearchResult) => void;
  onCustomerClear: () => void;
  onSearchQueryChange: (query: string) => void;
  onCustomerSearch: (query: string) => Promise<any[]>;
  onShowAddCustomerDialog: () => void;
  onCustomerEdit?: (customer: CustomerSearchResult) => void;
  onCustomerView?: (customer: CustomerSearchResult) => void;
  onUpdateRentalDates: (startDate: string, endDate: string) => void;
  hideCardWrapper?: boolean;
  // Order Summary props
  orderItems?: OrderItemFormData[];
  loading?: boolean;
  isFormValid?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
  onCancel?: () => void;
  // Reset key to force re-mount date pickers
  resetKey?: number;
  // Loyalty summary (optional)
  loyaltyDiscount?: number;
  amountDue?: number;
  /** Names of items without enough free units for the period */
  shortItems?: string[];
  /** Render one part of the form: the top bar, the customer card or the payment card */
  part?: 'top' | 'customer' | 'payment';
}

export const OrderInfoSection: React.FC<OrderInfoSectionProps> = ({
  formData,
  outlets,
  selectedCustomer,
  searchQuery,
  customerSearchResults,
  isLoadingCustomers,
  isEditMode,
  merchantData,
  onFormDataChange,
  onCustomerSelect,
  onCustomerClear,
  onSearchQueryChange,
  onCustomerSearch,
  onShowAddCustomerDialog,
  onCustomerEdit,
  onCustomerView,
  onUpdateRentalDates,
  hideCardWrapper = false,
  orderItems = [],
  loading = false,
  isFormValid = false,
  onSubmit,
  onCancel,
  resetKey = 0,
  loyaltyDiscount = 0,
  amountDue,
  shortItems = [],
  part,
}) => {
  const t = useOrderTranslations();
  const formatMoney = useFormatCurrency();
  const [showManualCustomerInput, setShowManualCustomerInput] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const quickPeriods = React.useMemo(() => {
    const r = quickRanges(todayShopKey());
    return [
      { id: 'today', range: r.today },
      { id: 'tomorrow', range: r.tomorrow },
      { id: 'weekend', range: r.weekend },
      { id: 'threeDays', range: r.threeDays },
    ] as const;
  }, []);

  const isRent = formData.orderType === 'RENT';
  const rentalDays = isRent && formData.pickupPlanAt && formData.returnPlanAt
    ? countRentalDays(formData.pickupPlanAt, formData.returnPlanAt)
    : 0;
  const deposit = isRent ? formData.depositAmount || 0 : 0;
  // Total of the order after discounts (stored as totalAmount); loyalty points lower what is collected
  const orderTotal = amountDue != null && loyaltyDiscount > 0 ? amountDue : formData.totalAmount;
  const collect = orderTotal + deposit;
  const missing: Array<'customer' | 'dates' | 'items' | 'outlet'> = [];
  if (!formData.customerId && !selectedCustomer) missing.push('customer');
  if (isRent && (!formData.pickupPlanAt || !formData.returnPlanAt)) missing.push('dates');
  if (orderItems.length === 0) missing.push('items');
  if (!formData.outletId) missing.push('outlet');

  const content = (
    <>
        {(!part || part === 'customer') && (
          <>
        {/* 1. Customer first: who the order is for (create-order UI) */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-text-primary">
            {t('messages.customer')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder={t('messages.searchCustomers')}
                value={selectedCustomer ? (() => {
                  const name = [selectedCustomer.firstName, selectedCustomer.lastName].filter(Boolean).join(' ').trim();
                  const phone = selectedCustomer.phone && selectedCustomer.phone.trim() !== '' ? selectedCustomer.phone : null;
                  return phone ? `${name} - ${phone}` : name;
                })() : searchQuery}
                onFocus={() => {
                  // Show search results when focused if there's a query
                  if (searchQuery.trim()) {
                    onCustomerSearch(searchQuery);
                  }
                }}
                onChange={(e) => {
                  const query = e.target.value;
                  
                  // If user is typing and there's a selected customer, clear the selection
                  if (selectedCustomer) {
                    const name = [selectedCustomer.firstName, selectedCustomer.lastName].filter(Boolean).join(' ').trim();
                    const phone = selectedCustomer.phone && selectedCustomer.phone.trim() !== '' ? selectedCustomer.phone : null;
                    const displayValue = phone ? `${name} - ${phone}` : name;
                    if (query !== displayValue) {
                      onCustomerClear();
                    }
                  }
                  
                  // Update search query immediately
                  onSearchQueryChange(query);
                  
                  // Search customers when query changes
                  if (query.trim()) {
                    onCustomerSearch(query);
                  } else {
                    // Clear results when query is empty
                    onCustomerSearch('');
                  }
                }}
                className={`h-11 w-full rounded-lg border pl-4 pr-12 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  selectedCustomer 
                    ? 'border-green-500 bg-green-50 text-green-900 font-medium' 
                    : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {selectedCustomer ? (
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={onCustomerClear}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors duration-150 h-6 w-6 p-0"
                  title={t('messages.clearSelectedCustomer')}
                >
                  <X className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => {
                    if (searchQuery.trim()) {
                      onCustomerSearch(searchQuery);
                    }
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150 h-6 w-6 p-0"
                >
                  <Search className="w-4 h-4" />
                </Button>
              )}
              
              {/* Search Results Dropdown */}
              {!selectedCustomer && (customerSearchResults.length > 0 || searchQuery.trim()) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {/* Add New Customer Button - Always at Top */}
                  {searchQuery.trim() && (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={onShowAddCustomerDialog}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-200 bg-blue-50/50 text-blue-700 font-medium h-auto justify-start rounded-none"
                  >
                      <div className="flex flex-col w-full">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>{t('messages.addNewCustomer')}</span>
                    </div>
                        <div className="text-xs text-blue-600 mt-1 ml-6">
                        Create customer: "{searchQuery}"
                        </div>
                      </div>
                    </Button>
                    )}

                  {/* Customer Results */}
                  {customerSearchResults.length > 0 ? (
                    <>
                      {customerSearchResults.map((customer) => (
                        <div
                          key={customer.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 group"
                        >
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => {
                              onCustomerSelect(customer);
                              const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
                              const phone = customer.phone && customer.phone.trim() !== '' ? customer.phone : null;
                              const displayValue = phone ? `${name} - ${phone}` : name;
                              onSearchQueryChange(displayValue);
                            }}
                            className="flex-1 text-left h-auto justify-start rounded-none p-0"
                          >
                            <div className="flex flex-col">
                              <div className="font-medium text-gray-900 text-sm">
                                {[customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Customer'}
                              </div>
                              {customer.phone && customer.phone.trim() !== '' && (
                                <div className="text-xs text-gray-600 mt-0.5">
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          </Button>
                          
                          {/* Actions Menu - 3 dots */}
                          {onCustomerEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4 text-gray-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-50">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCustomerView?.(customer);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Customer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCustomerEdit?.(customer);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Customer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    /* No Results - Show Message */
                    <div className="p-4 text-center">
                      <div className="text-sm text-gray-500">
                        No customers found for "{searchQuery}"
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {t('messages.useAddNewCustomerButton')}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {isLoadingCustomers && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Skeleton className="w-4 h-4 rounded-full" />
              </div>
            )}
          </div>

        </div>

          </>
        )}
        {(!part || part === 'top') && (
          <>
        {/* 2. Order Type Toggle */}
        <div className="w-full space-y-1">
          {isEditMode && (
            <p className="text-xs text-gray-600">{t('messages.cannotChangeWhenEditing')}</p>
          )}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1" role="group" aria-label={t('messages.orderType')}>
            <Button
              type="button"
              variant={formData.orderType === 'RENT' ? 'default' : 'ghost'}
              disabled={isEditMode}
              onClick={() => {
                if (!isEditMode) {
                  onFormDataChange('orderType', 'RENT');
                }
              }}
              className={`h-8 px-3 text-sm ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {t('form.orderType.RENT')}
            </Button>
            <Button
              type="button"
              variant={formData.orderType === 'SALE' ? 'default' : 'ghost'}
              disabled={isEditMode}
              onClick={() => {
                if (!isEditMode) {
                  onFormDataChange('orderType', 'SALE');
                  onFormDataChange('pickupPlanAt', '');
                  onFormDataChange('returnPlanAt', '');
                  onFormDataChange('depositAmount', 0);
                }
              }}
              className={`h-8 px-3 text-sm ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {t('form.orderType.SALE')}
            </Button>
          </div>
        </div>

        {/* 2. Rental Period Selection - Smart pricing based on merchant configuration */}
        {formData.orderType === 'RENT' && (
          <div className="space-y-2 w-full">
            {merchantData ? (
              <RentalPeriodSelector
                key={`rental-period-${resetKey}-${formData.pickupPlanAt}-${formData.returnPlanAt}`}
                product={{
                  id: 0, // Placeholder - will be updated when product is selected
                  name: t('messages.rentalPeriod'),
                  rentPrice: 0, // Will be calculated based on merchant pricing
                  deposit: 0,
                  categoryId: 0,
                  stock: 0,
                  renting: 0,
                  available: 0,
                  salePrice: 0,
                  description: '',
                  images: undefined,
                  barcode: '',
                  isActive: true,
                  merchantId: 0,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }}
                merchant={merchantData}
                initialStartDate={formData.pickupPlanAt}
                initialEndDate={formData.returnPlanAt}
                onPeriodChange={(startAt, endAt) => {
                  const startDate = getLocalDateKey(startAt);
                  const endDate = getLocalDateKey(endAt);
                  
                  onFormDataChange('pickupPlanAt', startDate);
                  onFormDataChange('returnPlanAt', endDate);
                  
                  onUpdateRentalDates(startDate, endDate);
                }}
                onPriceChange={(pricing) => {
                  // Update pricing information when period changes
                  console.log('Pricing updated:', pricing);
                }}
              />
            ) : (
              // Fallback to basic DateRangePicker if no merchant data
              <div className="space-y-2" key={`date-range-${resetKey}`}>
                <label className="text-sm font-medium text-text-primary">
                  {t('messages.rentalPeriod')} <span className="text-red-500">*</span>
                </label>
                <DateRangePicker
                  value={{
                    from: formData.pickupPlanAt ? new Date(formData.pickupPlanAt) : undefined,
                    to: formData.returnPlanAt ? new Date(formData.returnPlanAt) : undefined
                  }}
                  onChange={(range) => {
                    const startDate = range.from ? getLocalDateKey(range.from) : '';
                    const endDate = range.to ? getLocalDateKey(range.to) : '';
                    
                    onFormDataChange('pickupPlanAt', startDate);
                    onFormDataChange('returnPlanAt', endDate);
                    
                    if (startDate && endDate) {
                      onUpdateRentalDates(startDate, endDate);
                    }
                  }}
                  placeholder={t('messages.selectRentalPeriod')}
                  // Allow selecting rental dates in the past for back-dated bookings
                  showPresets={false}
                  format="long"
                />
              </div>
            )}
            {/* Quick periods, same as Order Check */}
            {!isEditMode && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('messages.rentalPeriod')}>
                {quickPeriods.map(({ id, range }) => {
                  const selected = formData.pickupPlanAt === range.from && formData.returnPlanAt === range.to;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        onFormDataChange('pickupPlanAt', range.from);
                        onFormDataChange('returnPlanAt', range.to);
                        onUpdateRentalDates(range.from, range.to);
                      }}
                      className={`inline-flex min-h-[32px] items-center whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors ${
                        selected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      {t(`form.quick.${id}`)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. Outlet Selection: a picker only when there is a choice */}
        {outlets.length <= 1 ? (
          part ? null : <p className="text-sm text-gray-600">
            {t('messages.outlet')}: <span className="font-medium text-gray-900">{outlets[0]?.name || '—'}</span>
          </p>
        ) : (
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-text-primary">
            {t('messages.outlet')} <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.outletId ? String(formData.outletId) : undefined}
            onValueChange={(value: string) => {
              console.log('🔍 Outlet selection changed:', { 
                previousValue: formData.outletId, 
                newValue: value,
                convertedValue: value ? parseInt(value, 10) : undefined,
                outlets: outlets
              });
              // Convert string back to number for form data
              const outletId = value ? parseInt(value, 10) : undefined;
              onFormDataChange('outletId', outletId);
            }}
          >
            <SelectTrigger variant="filled" className="w-full">
              <SelectValue placeholder={t('messages.selectOutlet')} />
            </SelectTrigger>
            <SelectContent>
              {outlets.map(outlet => (
                <SelectItem key={outlet.id} value={String(outlet.id)}>
                  {outlet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        )}

          </>
        )}
        {(!part || part === 'payment') && (
          <>
        {/* Payment (option A): each input sits on the money line it changes */}
        <dl className="w-full space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-700">
              {isRent ? t('form.summary.rentTotal') : t('form.summary.saleTotal')}
              {rentalDays > 0 && (
                <span className="text-gray-600"> ({rentalDays} {rentalDays === 1 ? t('summary.day') : t('summary.days')})</span>
              )}
            </dt>
            <dd className="font-medium tabular-nums">{formatMoney(formData.subtotal)}</dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt>
              <label htmlFor="order-discount" className="text-gray-700">{t('summary.discount')}</label>
            </dt>
            <dd className="flex items-center gap-2">
              <div className="flex h-8 items-center overflow-hidden rounded-md border border-gray-300 bg-white">
                <NumberInput
                  id="order-discount"
                  value={formData.discountValue || 0}
                  onChange={(value) => {
                    const subtotal = formData.subtotal || 0;
                    const validatedValue = formData.discountType === 'percentage'
                      ? Math.min(100, Math.max(0, value))
                      : Math.min(subtotal, Math.max(0, value));
                    onFormDataChange('discountValue', validatedValue);
                  }}
                  min={0}
                  max={formData.discountType === 'percentage' ? 100 : formData.subtotal || 0}
                  decimals={0}
                  placeholder="0"
                  className="h-8 w-16 rounded-none border-0 text-right text-sm tabular-nums shadow-none focus-visible:ring-0"
                />
                <div className="flex h-full border-l border-gray-300" role="radiogroup" aria-label={t('summary.discount')}>
                  {(['amount', 'percentage'] as const).map((type) => {
                    const selected = formData.discountType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={type === 'amount' ? t('messages.amount') : t('messages.percentage')}
                        onClick={() => {
                          if (selected) return;
                          const current = formData.discountValue || 0;
                          onFormDataChange('discountType', type);
                          onFormDataChange('discountValue', type === 'percentage' ? Math.min(100, current) : Math.min(formData.subtotal || 0, current));
                        }}
                        className={`px-2 text-xs font-semibold ${selected ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        {type === 'amount' ? t('messages.amount') : '%'}
                      </button>
                    );
                  })}
                </div>
              </div>
              <span className={`w-20 text-right font-medium tabular-nums ${formData.discountAmount > 0 ? 'text-green-800' : 'text-gray-500'}`}>
                {formData.discountAmount > 0 ? `−${formatMoney(formData.discountAmount)}` : formatMoney(0)}
              </span>
            </dd>
          </div>

          {loyaltyDiscount > 0 && (
            <div className="flex items-center justify-between gap-3 text-green-800">
              <dt>{t('receipt.loyaltyDiscount')}</dt>
              <dd className="font-medium tabular-nums">−{formatMoney(loyaltyDiscount)}</dd>
            </div>
          )}

          {(formData.discountAmount > 0 || loyaltyDiscount > 0) && (
            <div className="flex items-center justify-between gap-3 font-semibold">
              <dt>{t('form.summary.orderTotal')}</dt>
              <dd className="tabular-nums">{formatMoney(orderTotal)}</dd>
            </div>
          )}

          {isRent && (
            <div className="flex items-center justify-between gap-3">
              <dt>
                <label htmlFor="order-deposit" className="text-gray-700" title={t('form.depositAuto')}>
                  {t('summary.deposit')}
                </label>
              </dt>
              <dd className="flex items-center gap-2">
                <NumberInput
                  id="order-deposit"
                  value={formData.depositAmount || 0}
                  onChange={(value) => onFormDataChange('depositAmount', value)}
                  min={0}
                  decimals={0}
                  placeholder="0"
                  className="h-8 w-[7.5rem] bg-white text-right text-sm tabular-nums"
                />
                <span className="w-20 text-right font-medium tabular-nums">{formatMoney(deposit)}</span>
              </dd>
            </div>
          )}
        </dl>

        {/* Order note: folded away until needed */}
        {showNotes || formData.notes ? (
          <div className="w-full space-y-1">
            <label htmlFor="order-notes" className="text-xs font-medium text-gray-700">{t('messages.orderNotes')}</label>
            <Textarea
              id="order-notes"
              placeholder={t('messages.enterOrderNotes')}
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onFormDataChange('notes', e.target.value)}
              rows={2}
            />
          </div>
        ) : (
          <button type="button" onClick={() => setShowNotes(true)} className="min-h-[28px] text-sm font-medium text-blue-700 hover:underline">
            + {t('messages.orderNotes')}
          </button>
        )}

        <div className="flex items-baseline justify-between border-t border-gray-200 pt-3">
          <span className="font-semibold text-gray-900">
            {isRent ? t('form.summary.collectAtPickup') : t('form.summary.collect')}
            {isRent && deposit > 0 && (
              <span className="ml-1 text-xs font-normal text-gray-600">({t('form.summary.includesDeposit', { amount: formatMoney(deposit) })})</span>
            )}
          </span>
          <span className="text-xl font-bold tabular-nums text-gray-900">{formatMoney(collect)}</span>
        </div>

        {onSubmit && (
          <div className="w-full space-y-1.5">
            <Button type="button" disabled={loading || !isFormValid} onClick={onSubmit} className="h-10 w-full">
              {loading ? t('messages.processing') : isEditMode ? t('messages.updateOrder') : t('messages.createOrder')}
            </Button>
            {/* One status line: short stock and what is still missing */}
            {(shortItems.length > 0 || (!loading && missing.length > 0)) && (
              <p role="status" className="space-x-1 text-center text-xs">
                {shortItems.length > 0 && (
                  <span className="font-medium text-red-700">
                    <AlertCircle className="mr-0.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
                    {t('form.shortWarning', { names: shortItems.join(', ') })}.
                  </span>
                )}
                {!loading && missing.length > 0 && (
                  <span className="text-gray-600">
                    {t('form.missing.title', { fields: missing.map((key) => t(`form.missing.${key}`)).join(', ') })}
                  </span>
                )}
              </p>
            )}
            {onCancel && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isEditMode || window.confirm(t('form.resetConfirm'))) onCancel();
                  }}
                  className="min-h-[28px] px-2 text-xs text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                >
                  {isEditMode ? t('messages.cancel') : t('form.reset')}
                </button>
              </div>
            )}
          </div>
        )}
          </>
        )}
    </>
  );



  if (part) {
    return <div className="w-full space-y-4">{content}</div>;
  }

  if (hideCardWrapper) {
    // When hideCardWrapper is true, return content with flexbox layout
    // Content already includes Order Summary fields merged directly
    // Height is dynamic based on content - items-stretch will handle equal heights
    return (
      <div className="flex flex-col w-full overflow-visible">
        {/* Order Information Content - Dynamic height based on content */}
        <div className="space-y-4 w-full">
          {content}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {t('detail.orderInformation')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
      </CardContent>
    </Card>
  );
};
