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
  Button
} from '@rentalshop/ui';
import { 
  Search, 
  Package, 
  Trash2 
} from 'lucide-react';
import { formatCurrency } from '@rentalshop/utils';
import { ProductAvailabilityAsyncDisplay } from '@rentalshop/ui';
import type { 
  OrderItemFormData, 
  ProductWithStock,
  ProductAvailabilityStatus 
} from '../types';

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
  getProductAvailabilityStatus
}) => {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Search and Filter Bar */}
        <div className="space-y-3">
          <div className="relative">
            <SearchableSelect
              placeholder="Search products by name, barcode or description..."
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
            />
            {isLoadingProducts && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Skeleton className="w-4 h-4 rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Selected Products Section */}
        <div className="space-y-4">
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Selected Products <span className="text-red-500">*</span>
                <span className="text-sm font-normal text-gray-500">({orderItems.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderItems.length === 0 ? (
                /* Empty State Placeholder */
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                    <Package className="w-16 h-16" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    No Products Selected
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                    Search for products above to add them to your order. You can search by name, barcode, or description.
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
}

const OrderItemCard: React.FC<OrderItemCardProps> = ({
  item,
  product,
  onRemove,
  onUpdate,
  orderType,
  pickupDate,
  returnDate,
  getProductAvailabilityStatus
}) => {
  if (!product) return null;

  const imageUrl = product.images?.[0];

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
      {/* Product Header with Image */}
      <div className="flex items-start gap-4 mb-3">
        {/* Product Image */}
        <div className="flex-shrink-0">
          {imageUrl ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
              <img 
                src={imageUrl} 
                alt={product.name || 'Product'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to package icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-full h-16 bg-gray-100 flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {product.name || 'Unknown Product'}
              </div>
              <div className="text-sm text-gray-500">
                {product.barcode || 'No Barcode'}
              </div>
              {/* Availability Warning */}
              {orderType === 'RENT' && (
                <div className="mt-2">
                  <ProductAvailabilityAsyncDisplay 
                    product={product}
                    pickupDate={pickupDate}
                    returnDate={returnDate}
                    requestedQuantity={item.quantity}
                    getProductAvailabilityStatus={getProductAvailabilityStatus}
                  />
                  {!pickupDate || !returnDate ? (
                    <div className="text-xs text-gray-500 mt-1">
                      Select rental dates to check availability
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.productId)}
              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Quantity */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <Input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => onUpdate(item.productId, 'quantity', parseInt(e.target.value) || 1)}
            className="h-8 text-sm"
          />
        </div>

        {/* Unit Price */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Unit Price
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unitPrice}
            onChange={(e) => onUpdate(item.productId, 'unitPrice', parseFloat(e.target.value) || 0)}
            className="h-8 text-sm"
          />
        </div>

        {/* Deposit */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Deposit
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.deposit}
            onChange={(e) => onUpdate(item.productId, 'deposit', parseFloat(e.target.value) || 0)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Notes
        </label>
        <Input
          value={item.notes}
          onChange={(e) => onUpdate(item.productId, 'notes', e.target.value)}
          placeholder="Add notes for this item..."
          className="h-8 text-sm"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Total: {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.quantity * item.unitPrice)}
        </div>
        <div className="text-sm text-gray-600">
          Deposit: {formatCurrency(item.deposit)}
        </div>
      </div>
    </div>
  );
};
