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
  Textarea,
  Skeleton
} from '@rentalshop/ui';
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

interface OrderInfoSectionProps {
  formData: OrderFormData;
  outlets: Array<{ id: number; name: string; merchantId?: number }>;
  selectedCustomer: CustomerSearchResult | null;
  searchQuery: string;
  customerSearchResults: CustomerSearchResult[];
  isLoadingCustomers: boolean;
  isEditMode: boolean;
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
  onFormDataChange,
  onCustomerSelect,
  onCustomerClear,
  onSearchQueryChange,
  onCustomerSearch,
  onShowAddCustomerDialog,
  onUpdateRentalDates
}) => {
  const [showManualCustomerInput, setShowManualCustomerInput] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-4 h-4" />
          Order Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Outlet Selection */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-text-primary">
            Outlet <span className="text-red-500">*</span>
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

        {/* Customer Selection */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-text-primary">
            Customer <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search customers by name or phone..."
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
                <button
                  type="button"
                  onClick={onCustomerClear}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors duration-150"
                  title="Clear selected customer"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (searchQuery.trim()) {
                      onCustomerSearch(searchQuery);
                    }
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
              
              {/* Search Results Dropdown */}
              {!selectedCustomer && (customerSearchResults.length > 0 || searchQuery.trim()) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {/* Add New Customer Button - Always at Top */}
                  <button
                    type="button"
                    onClick={onShowAddCustomerDialog}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-200 bg-blue-50/50 text-blue-700 font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>Add New Customer</span>
                    </div>
                    {searchQuery.trim() && (
                      <div className="text-xs text-blue-600 mt-1">
                        Create customer: "{searchQuery}"
                      </div>
                    )}
                  </button>

                  {/* Customer Results */}
                  {customerSearchResults.length > 0 ? (
                    <>
                      {customerSearchResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            onCustomerSelect(customer);
                            onSearchQueryChange(`${customer.firstName} ${customer.lastName} - ${customer.phone}`);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-gray-600">{customer.phone}</div>
                        </button>
                      ))}
                    </>
                  ) : (
                    /* No Results - Show Message */
                    <div className="p-4 text-center">
                      <div className="text-sm text-gray-500">
                        No customers found for "{searchQuery}"
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Use the "Add New Customer" button above to create one
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

        {/* Order Type Toggle */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-text-primary">
            Order Type
            {isEditMode && (
              <span className="ml-2 text-xs text-gray-500 font-normal">
                (Cannot be changed when editing)
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isEditMode}
              onClick={() => {
                if (!isEditMode) {
                  onFormDataChange('orderType', 'RENT');
                }
              }}
              className={`h-10 px-4 py-2 rounded-lg border transition-colors ${
                formData.orderType === 'RENT' 
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Rent
            </button>
            <button
              type="button"
              disabled={isEditMode}
              onClick={() => {
                if (!isEditMode) {
                  onFormDataChange('orderType', 'SALE');
                  onFormDataChange('pickupPlanAt', '');
                  onFormDataChange('returnPlanAt', '');
                  onFormDataChange('depositAmount', 0);
                }
              }}
              className={`h-10 px-4 py-2 rounded-lg border transition-colors ${
                formData.orderType === 'SALE' 
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Sale
            </button>
          </div>
        </div>

        {/* Deposit Amount - Only for RENT orders */}
        {formData.orderType === 'RENT' && (
          <div className="space-y-2 w-full">
            <label className="text-sm font-medium text-text-primary">Deposit</label>
            <Input
              type="number"
              placeholder="Enter deposit amount..."
              value={formData.depositAmount || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                onFormDataChange('depositAmount', value);
              }}
              className="w-full"
            />
          </div>
        )}

        {/* Discount Section */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-text-primary">Discount</label>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="Discount amount..."
                value={formData.discountValue || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  onFormDataChange('discountValue', value);
                }}
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
                <SelectItem value="amount">$</SelectItem>
                <SelectItem value="percentage">%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Rental Dates - Only show for RENT orders */}
        {formData.orderType === 'RENT' && (
          <div className="space-y-2 w-full">
            <label className="text-sm font-medium text-text-primary">
              Rental Period <span className="text-red-500">*</span>
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
              placeholder="Select rental period"
              minDate={new Date()}
              showPresets={false}
              format="long"
            />
          </div>
        )}

        {/* Order Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Order Notes</label>
          <Textarea
            placeholder="Enter order notes..."
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
