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
  DropdownMenuTrigger
} from '@rentalshop/ui';
import { useOrderTranslations } from '@rentalshop/hooks';
import { 
  User, 
  Search, 
  X, 
  Plus, 
  ChevronDown, 
  Info,
  MoreVertical,
  Edit,
  Eye
} from 'lucide-react';
import type { 
  OrderFormData, 
  CustomerSearchResult,
  OrderItemFormData
} from '../types';
import { useFormatCurrency } from '@rentalshop/ui';

// ============================================================================
// NUMBER INPUT WITH THOUSAND SEPARATOR
// ============================================================================

interface NumberInputProps {
  value: number;
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
  decimals = 0
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
  onUpdateRentalDates,
  hideCardWrapper = false,
  orderItems = [],
  loading = false,
  isFormValid = false,
  onSubmit,
  onCancel
}) => {
  const t = useOrderTranslations();
  const formatMoney = useFormatCurrency();
  const [showManualCustomerInput, setShowManualCustomerInput] = useState(false);

  const content = (
    <>
        {/* 1. Order Type Toggle */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-text-primary">
            {t('messages.orderType')}
            {isEditMode && (
              <span className="ml-2 text-xs text-gray-500 font-normal">
                ({t('messages.cannotChangeWhenEditing')})
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={formData.orderType === 'RENT' ? 'default' : 'outline'}
              disabled={isEditMode}
              onClick={() => {
                if (!isEditMode) {
                  onFormDataChange('orderType', 'RENT');
                }
              }}
              className={`h-10 px-4 py-2 ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {t('orderType.RENT')}
            </Button>
            <Button
              type="button"
              variant={formData.orderType === 'SALE' ? 'default' : 'outline'}
              disabled={isEditMode}
              onClick={() => {
                if (!isEditMode) {
                  onFormDataChange('orderType', 'SALE');
                  onFormDataChange('pickupPlanAt', '');
                  onFormDataChange('returnPlanAt', '');
                  onFormDataChange('depositAmount', 0);
                }
              }}
              className={`h-10 px-4 py-2 ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {t('orderType.SALE')}
            </Button>
          </div>
        </div>

        {/* 2. Rental Period Selection - Smart pricing based on merchant configuration */}
        {formData.orderType === 'RENT' && (
          <div className="space-y-2 w-full">
            {merchantData ? (
              <RentalPeriodSelector
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
                  const startDate = startAt.toISOString().split('T')[0];
                  const endDate = endAt.toISOString().split('T')[0];
                  
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  {t('messages.rentalPeriod')} <span className="text-red-500">*</span>
                </label>
                <DateRangePicker
                  value={{
                    from: formData.pickupPlanAt ? new Date(formData.pickupPlanAt) : undefined,
                    to: formData.returnPlanAt ? new Date(formData.returnPlanAt) : undefined
                  }}
                  onChange={(range) => {
                    const startDate = range.from ? range.from.toISOString().split('T')[0] : '';
                    const endDate = range.to ? range.to.toISOString().split('T')[0] : '';
                    
                    onFormDataChange('pickupPlanAt', startDate);
                    onFormDataChange('returnPlanAt', endDate);
                    
                    if (startDate && endDate) {
                      onUpdateRentalDates(startDate, endDate);
                    }
                  }}
                  placeholder={t('messages.selectRentalPeriod')}
                  minDate={new Date()}
                  showPresets={false}
                  format="long"
                />
              </div>
            )}
          </div>
        )}

        {/* 3. Outlet Selection */}
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

        {/* 4. Customer Selection */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-text-primary">
            {t('messages.customer')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder={t('messages.searchCustomers')}
                value={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} - ${selectedCustomer.phone}` : searchQuery}
                onFocus={() => {
                  // Show search results when focused if there's a query
                  if (searchQuery.trim()) {
                    onCustomerSearch(searchQuery);
                  }
                }}
                onChange={(e) => {
                  const query = e.target.value;
                  
                  // If user is typing and there's a selected customer, clear the selection
                  if (selectedCustomer && query !== `${selectedCustomer.firstName} ${selectedCustomer.lastName} - ${selectedCustomer.phone}`) {
                    onCustomerClear();
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
                              onSearchQueryChange(`${customer.firstName} ${customer.lastName} - ${customer.phone}`);
                            }}
                            className="flex-1 text-left h-auto justify-start rounded-none p-0"
                          >
                            <div className="flex flex-col">
                              <div className="font-medium text-gray-900 text-sm">
                                {customer.firstName} {customer.lastName}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {customer.phone}
                              </div>
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

        {/* 5. Deposit Amount - Only for RENT orders */}
        {formData.orderType === 'RENT' && (
          <div className="space-y-2 w-full">
            <label className="text-sm font-medium text-text-primary">{t('messages.deposit')}</label>
            <NumberInput
              value={formData.depositAmount || 0}
              onChange={(value) => onFormDataChange('depositAmount', value)}
              min={0}
              decimals={0}
              placeholder={t('messages.enterDepositAmount')}
              className="w-full"
            />
          </div>
        )}

        {/* 6. Discount Section */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-text-primary">{t('messages.discount')}</label>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <NumberInput
                value={formData.discountValue || 0}
                onChange={(value) => onFormDataChange('discountValue', value)}
                min={0}
                decimals={0}
                placeholder={t('messages.discountAmount')}
                className="w-full"
              />
            </div>
            <Select
              value={formData.discountType}
              onValueChange={(value: 'amount' | 'percentage') => {
                onFormDataChange('discountType', value);
              }}
            >
              <SelectTrigger variant="filled" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">{t('messages.amount')}</SelectItem>
                <SelectItem value="percentage">{t('messages.percentage')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 7. Order Notes */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-text-primary">{t('messages.orderNotes')}</label>
          <Textarea
            placeholder={t('messages.enterOrderNotes')}
            value={formData.notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
              onFormDataChange('notes', e.target.value)
            }
            rows={3}
          />
        </div>

        {/* 8. Order Summary */}
        <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-primary w-full">
          <h4 className="text-sm font-semibold text-text-primary mb-3">{t('detail.orderSummary')}</h4>
          
          {/* Rental Duration - Show for RENT orders with dates */}
          {formData.orderType === 'RENT' && formData.pickupPlanAt && formData.returnPlanAt && (
            <div className="pb-2 mb-2 border-b border-border">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">{t('summary.rentalDuration')}:</span>
                <span className="font-medium">
                  {(() => {
                    const start = new Date(formData.pickupPlanAt);
                    const end = new Date(formData.returnPlanAt);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    return `${days} ${days === 1 ? t('summary.day') : t('summary.days')}`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between text-xs text-text-tertiary">
                <span>{t('summary.from')}: {new Date(formData.pickupPlanAt).toLocaleDateString('en-GB')}</span>
                <span>{t('summary.to')}: {new Date(formData.returnPlanAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          )}
          
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">{t('summary.subtotal')}:</span>
            <span className="font-medium">{formatMoney(formData.subtotal)}</span>
          </div>

          {/* Discount */}
          {formData.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-action-success">
              <span>{t('summary.discount')}:</span>
              <span className="font-medium">-{formatMoney(formData.discountAmount)}</span>
            </div>
          )}

          {/* Deposit */}
          {formData.orderType === 'RENT' && formData.depositAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">{t('summary.deposit')}:</span>
              <span className="font-medium">{formatMoney(formData.depositAmount)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between text-base font-bold text-action-primary pt-2 border-t border-border">
            <span>{t('summary.grandTotal')}:</span>
            <span>{formatMoney(formData.totalAmount)}</span>
          </div>
        </div>

        {/* 9. Action Buttons */}
        {onSubmit && (
          <div className="space-y-2 w-full">
            <div className="flex gap-3">
              <Button
                type="button"
                disabled={loading || !isFormValid}
                onClick={onSubmit}
                className="flex-1"
              >
                {loading ? t('messages.processing') : isEditMode ? t('messages.updateOrder') : t('messages.createOrder')}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                >
                  {isEditMode ? t('messages.cancel') : t('messages.resetSelection')}
                </Button>
              )}
            </div>
          </div>
        )}
    </>
  );



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
