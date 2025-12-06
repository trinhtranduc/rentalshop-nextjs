/**
 * ProductsSection - Component for product search and selected products
 */

import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Input,
  SearchableSelect,
  Skeleton,
  Button,
  useFormatCurrency
} from '@rentalshop/ui';
import { useOrderTranslations, useProductTranslations } from '@rentalshop/hooks';
import { 
  Search, 
  Package, 
  Trash2,
  Plus,
  Minus
} from 'lucide-react';
import { ProductAvailabilityAsyncDisplay } from '@rentalshop/ui';
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
    />
  );
};

// ============================================================================
// QUANTITY INPUT WITH INCREMENT/DECREMENT BUTTONS
// ============================================================================

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

const QuantityInput: React.FC<QuantityInputProps> = ({
  value,
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
    <div className={`flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white ${className}`}>
      <button
        type="button"
        onClick={handleDecrease}
        disabled={value <= min}
        className="flex-shrink-0 px-3 py-2 h-8 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors border-r border-gray-300 flex items-center justify-center"
        aria-label="Decrease quantity"
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className="flex-1 min-w-0 text-center text-sm font-medium border-0 focus:ring-0 focus:outline-none bg-white px-2 h-8"
        min={min}
        max={max}
      />
      <button
        type="button"
        onClick={handleIncrease}
        disabled={max !== undefined && value >= max}
        className="flex-shrink-0 px-3 py-2 h-8 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors border-l border-gray-300 flex items-center justify-center"
        aria-label="Increase quantity"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ProductsSectionProps {
  orderItems: OrderItemFormData[];
  products: ProductWithStock[];
  onAddProduct: (product: ProductWithStock) => void;
  onRemoveProduct: (productId: number) => void;
  onUpdateOrderItem: (productId: number, field: keyof OrderItemFormData, value: string | number) => void;
  onSearchProducts: (query: string) => Promise<any[]>;
  isLoadingProducts: boolean;
  orderType: 'RENT' | 'SALE';
  pickupDate?: string;
  returnDate?: string;
  getProductAvailabilityStatus: (product: ProductWithStock, startDate?: string, endDate?: string, requestedQuantity?: number) => Promise<ProductAvailabilityStatus>;
  currency?: 'USD' | 'VND';
  outletId?: number; // Required to get correct stock from outletStock
}

export const ProductsSection: React.FC<ProductsSectionProps> = ({
  orderItems,
  products,
  onAddProduct,
  onRemoveProduct,
  onUpdateOrderItem,
  onSearchProducts,
  isLoadingProducts,
  orderType,
  pickupDate,
  returnDate,
  getProductAvailabilityStatus,
  currency = 'USD',
  outletId,
}) => {
  const t = useOrderTranslations();
  const tp = useProductTranslations();
  return (
    <Card className="flex flex-col h-full w-full">
      <CardContent className="flex flex-col flex-1 p-6">
        {/* Search and Filter Bar */}
        <div className="space-y-3 flex-shrink-0 mb-4">
          <div className="relative">
            <SearchableSelect
              placeholder={t('messages.searchProducts')}
              value={undefined}
              onChange={(productId: number) => {
                console.log('🔍 SearchableSelect onChange called with productId:', productId);
                console.log('🔍 Available products:', products);
                // Find the product and add it to order
                const product = products.find(p => p.id === productId);
                console.log('🔍 Found product:', product);
                if (product) {
                  console.log('🔍 Calling onAddProduct with product:', product);
                  onAddProduct(product);
                } else {
                  console.error('❌ Product not found for ID:', productId);
                }
              }}
              onSearch={onSearchProducts}
              searchPlaceholder="Type to search products..."
              emptyText="No products found. Try a different search term."
              showAddNew={false}
              productRowStyle="default" // Options: 'default' (with blue border) | 'compact' | 'minimal'
            />
            {isLoadingProducts && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Skeleton className="w-4 h-4 rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Selected Products Section - Takes remaining space */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="border border-gray-200 flex flex-col h-full">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-5 h-5" />
                {tp('selectedProducts')} <span className="text-red-500">*</span>
                <span className="text-sm font-normal text-gray-500">({orderItems.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
              {orderItems.length === 0 ? (
                /* Empty State Placeholder */
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                    <Package className="w-16 h-16" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {tp('noProductsSelected')}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                    {t('messages.searchProductsAbove')}
                  </p>
                </div>
              ) : (
                /* Product List */
                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <OrderItemCard
                      key={index}
                      item={item}
                      product={products.find(p => p.id === item.productId)}
                      onRemove={onRemoveProduct}
                      onUpdate={onUpdateOrderItem}
                      orderType={orderType}
                      pickupDate={pickupDate}
                      returnDate={returnDate}
                      getProductAvailabilityStatus={getProductAvailabilityStatus}
                      outletId={outletId}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

// OrderItemCard sub-component
interface OrderItemCardProps {
  item: OrderItemFormData;
  product?: ProductWithStock;
  onRemove: (productId: number) => void;
  onUpdate: (productId: number, field: keyof OrderItemFormData, value: string | number) => void;
  orderType: 'RENT' | 'SALE';
  pickupDate?: string;
  returnDate?: string;
  getProductAvailabilityStatus: (product: ProductWithStock, startDate?: string, endDate?: string, requestedQuantity?: number) => Promise<ProductAvailabilityStatus>;
  outletId?: number; // Required to get correct stock from outletStock
}

const OrderItemCard: React.FC<OrderItemCardProps> = ({
  item,
  product,
  onRemove,
  onUpdate,
  orderType,
  pickupDate,
  returnDate,
  getProductAvailabilityStatus,
  outletId
}) => {
  // Use formatCurrency hook - automatically uses merchant's currency
  const formatMoney = useFormatCurrency();
  const t = useOrderTranslations();
  const tp = useProductTranslations();
  
  // Use the product information stored in the item instead of the external product
  // This ensures all order items are displayed even if the external products array is incomplete
  const displayProduct = item.product || product;
  
  if (!displayProduct) {
    // Fallback display when no product information is available
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex items-start gap-4 mb-3">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-200 flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  {tp('productId')}: {item.productId}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {tp('productInformationNotAvailable')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(item.productId)}
                className="text-red-500 hover:text-red-700 p-1 h-auto w-auto"
                title={t('messages.removeProduct')}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Input Fields */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('messages.quantity')}
            </label>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => onUpdate(item.productId, 'quantity', parseInt(e.target.value) || 1)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('messages.unitPrice')}
            </label>
            <input
              type="number"
              value={item.unitPrice}
              onChange={(e) => onUpdate(item.productId, 'unitPrice', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              step="0.01"
              min="0"
            />
          </div>
        </div>
        
        {/* Notes */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('messages.orderNotes')}
          </label>
          <textarea
            value={item.notes || ''}
            onChange={(e) => onUpdate(item.productId, 'notes', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            placeholder={t('messages.addNotesAboutProduct')}
          />
        </div>
        
        {/* Summary */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            Total: {item.quantity} × {item.unitPrice} ₫ = {item.quantity * item.unitPrice} ₫
          </span>
          {orderType === 'RENT' && (
            <span className="text-gray-600">
              {t('messages.deposit')}: {item.deposit || 0} ₫
            </span>
          )}
        </div>
      </div>
    );
  }

  const imageUrl = displayProduct.images?.[0];

  return (
    <div className="p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
      {/* Product Header with Image */}
      <div className="flex items-start gap-4 mb-3">
        {/* Product Image */}
        <div className="flex-shrink-0">
          {imageUrl ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-blue-100 shadow-sm">
              <img 
                src={imageUrl} 
                alt={displayProduct.name || t('messages.product')}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to package icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.classList.remove('hidden');
                    fallback.classList.add('flex');
                  }
                }}
              />
              <div className="hidden w-full h-16 bg-gray-100 items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center border-2 border-blue-100 shadow-sm">
              <Package className="w-8 h-8 text-blue-400" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-semibold text-gray-900 text-base mb-1">
                {displayProduct.name || t('messages.unknownProduct')}
              </div>
              <div className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded inline-block">
                {displayProduct.barcode || t('messages.noBarcode')}
              </div>
              {/* Availability Warning & Stock Info */}
              <div className="mt-2">
                {/* Stock Information - Show basic stock for SALE or RENT without dates */}
                {(() => {
                  // For RENT orders with dates, don't show basic stock (will show in ProductAvailabilityAsyncDisplay)
                  if (orderType === 'RENT' && pickupDate && returnDate) {
                    return null;
                  }
                  
                  // Get stock from product's outletStock filtered by outletId
                  // Only use outletStock if outletId matches, otherwise use default values (0)
                  let stockInfo: { available: number; stock: number; renting: number } | null = null;
                  
                  // Try to get from product prop first (most up-to-date)
                  const sourceProduct = product || displayProduct;
                  
                  if (sourceProduct?.outletStock && outletId) {
                    // Find outletStock for the current outlet - must match exactly
                    const outletStock = sourceProduct.outletStock.find((os: any) => os.outletId === outletId);
                    if (outletStock) {
                      stockInfo = {
                        available: outletStock.available,
                        stock: outletStock.stock,
                        renting: outletStock.renting
                      };
                    }
                  }
                  
                  // If no match found, use default values (0) - no fallback
                  const available = stockInfo?.available ?? 0;
                  const stock = stockInfo?.stock ?? 0;
                  
                  // Single line stock display: "Kho: X | Có sẵn: Y (Hết)" if Y = 0
                  return (
                    <div className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                      <span><span className="font-semibold">Kho:</span> {stock}</span>
                      <span className="text-gray-400">|</span>
                      <span>
                        <span className="font-semibold">Có sẵn:</span>{' '}
                        <span className={available > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {available}
                        </span>
                        {available === 0 && <span className="text-red-600 font-semibold"> (Hết)</span>}
                      </span>
                    </div>
                  );
                })()}
                
                {/* Availability check for RENT orders with dates */}
                {orderType === 'RENT' && (
                  <>
                    {product && pickupDate && returnDate ? (
                      <div className="mt-1">
                      <ProductAvailabilityAsyncDisplay 
                        product={product}
                        pickupDate={pickupDate}
                        returnDate={returnDate}
                        requestedQuantity={item.quantity || 1}
                        getProductAvailabilityStatus={getProductAvailabilityStatus}
                      />
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 mt-1">
                        Chọn ngày thuê để kiểm tra khả dụng
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.productId)}
              className="shrink-0 h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150"
              title="Remove product"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editable Fields */}
      <div className={`grid grid-cols-1 gap-3 mt-4 pt-4 border-t border-gray-200 ${orderType === 'RENT' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {/* Quantity */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('messages.quantity')}
          </label>
          <QuantityInput
            value={item.quantity}
            onChange={(value) => onUpdate(item.productId, 'quantity', value)}
            min={1}
            className="h-8"
          />
        </div>

        {/* Unit Price */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('messages.unitPrice')}
          </label>
          <NumberInput
            value={item.unitPrice}
            onChange={(value) => onUpdate(item.productId, 'unitPrice', value)}
            min={0}
            step={0.01}
            decimals={0}
            className="h-8 text-sm"
          />
        </div>

        {/* Deposit - Only show for RENT orders */}
        {orderType === 'RENT' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('messages.deposit')}
            </label>
            <NumberInput
              value={item.deposit || 0}
              onChange={(value) => onUpdate(item.productId, 'deposit', value)}
              min={0}
              step={0.01}
              decimals={0}
              className="h-8 text-sm"
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {t('messages.orderNotes')}
        </label>
        <Input
          value={item.notes}
          onChange={(e) => onUpdate(item.productId, 'notes', e.target.value)}
          placeholder={t('messages.addNotesForItem')}
          className="h-8 text-sm"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-blue-100 bg-blue-50/50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
        <div className="text-sm text-gray-600">
          Total: {item.quantity} × {formatMoney(item.unitPrice)} = {formatMoney(item.quantity * item.unitPrice)}
        </div>
        {/* Only show deposit for RENT orders - Display total deposit (deposit per unit * quantity) */}
        {orderType === 'RENT' && (
          <div className="text-sm text-gray-600">
            {t('messages.deposit')}: {formatMoney((item.deposit || 0) * (item.quantity || 1))}
          </div>
        )}
      </div>
    </div>
  );
};
