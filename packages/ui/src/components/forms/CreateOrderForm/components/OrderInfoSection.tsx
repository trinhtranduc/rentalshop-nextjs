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
  Button
} from '@rentalshop/ui';
import { useOrderTranslations } from '@rentalshop/hooks';
import { 
  User, 
  Search, 
  X, 
  Plus, 
  ChevronDown, 
  Info 
} from 'lucide-react';
import type { 
  OrderFormData, 
  CustomerSearchResult 
} from '../types';

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
  onUpdateRentalDates: (startDate: string, endDate: string) => void;
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
  onUpdateRentalDates
}) => {
  const t = useOrderTranslations();
  const [showManualCustomerInput, setShowManualCustomerInput] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {t('detail.orderInformation')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            {/* Debug logs */}
            {console.log('🔍 OrderInfoSection - Rental Period Check:', {
              orderType: formData.orderType,
              hasMerchantData: !!merchantData,
              pricingType: merchantData?.pricingType,
              businessType: merchantData?.businessType
            })}
            
            {merchantData ? (
              <RentalPeriodSelector
                product={{
                  id: 0, // Placeholder - will be updated when product is selected
                  name: t('messages.rentalPeriod'),
                  rentPrice: 0, // Will be calculated based on merchant pricing
                  deposit: 0
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
              <SelectValue placeholder="Select outlet..." />
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
                  
                  onSearchQueryChange(query);
                  
                  if (query.trim()) {
                    onCustomerSearch(query);
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
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={onShowAddCustomerDialog}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-200 bg-blue-50/50 text-blue-700 font-medium h-auto justify-start rounded-none"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>{t('messages.addNewCustomer')}</span>
                    </div>
                    {searchQuery.trim() && (
                      <div className="text-xs text-blue-700 mt-1">
                        Create customer: "{searchQuery}"
                      </div>
                    )}
                  </Button>

                  {/* Customer Results */}
                  {customerSearchResults.length > 0 ? (
                    <>
                      {customerSearchResults.map((customer) => (
                        <Button
                          variant="ghost"
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            onCustomerSelect(customer);
                            onSearchQueryChange(`${customer.firstName} ${customer.lastName} - ${customer.phone}`);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 h-auto justify-start rounded-none"
                        >
                          <div className="font-medium text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-gray-600">{customer.phone}</div>
                        </Button>
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
              placeholder="Enter deposit amount..."
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
        <div className="space-y-2">
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
      </CardContent>
    </Card>
  );
};
