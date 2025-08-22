import React from 'react';
import { Package, Hash, Image as ImageIcon, Calendar } from 'lucide-react';
import { formatCurrency } from '@rentalshop/ui';
import { OrderData } from '@rentalshop/types';

interface OrderItemsProps {
  order: OrderData;
}

const OrderItem: React.FC<{ item: OrderData['orderItems'][0] }> = ({ item }) => (
  <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1 min-w-0">
          {/* Product Image - Enhanced */}
          <div className="flex-shrink-0">
            {item.product.images ? (
              <div className="relative">
                <img 
                  src={item.product.images} 
                  alt={item.product.name}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                {/* Fallback placeholder - hidden by default */}
                <div className="hidden w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Product Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <h4 className="text-base font-medium text-gray-900 leading-tight">
              {item.product.name}
            </h4>
            
            {item.product.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {item.product.description}
              </p>
            )}
            
            {/* Product Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>ID: {item.product.id}</span>
              </div>
              {item.product.barcode && (
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>Barcode: {item.product.barcode}</span>
                </div>
              )}
              {item.product.productCode && (
                <div className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  <span>Code: {item.product.productCode}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Price and Quantity */}
        <div className="flex-shrink-0 text-right space-y-1">
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(item.totalPrice)}
          </div>
          <div className="text-sm text-gray-500">
            {formatCurrency(item.unitPrice)} each
          </div>
          <div className="text-sm font-medium text-gray-700">
            Qty: {item.quantity}
          </div>
        </div>
      </div>
      
      {/* Additional Information */}
      {(item.rentalDays || item.note) && (
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {item.rentalDays && item.rentalDays > 1 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                  <Calendar className="w-3 h-3" />
                  <span>{item.rentalDays} days rental</span>
                </div>
              )}
              
              {item.note && (
                <div className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                  <span className="font-medium">Note:</span> {item.note}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

export const OrderItems: React.FC<OrderItemsProps> = ({ order }) => (
  <div className="space-y-4">
    {/* Items Summary */}
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <Package className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-gray-700">
          {order.orderItems.length} {order.orderItems.length === 1 ? 'Item' : 'Items'}
        </span>
      </div>
      <div className="text-right">
        <div className="text-sm text-gray-500">Subtotal</div>
        <div className="font-semibold text-gray-900">
          {formatCurrency(order.subtotal)}
        </div>
      </div>
    </div>
    
    {/* Items List */}
    <div className="space-y-3">
      {order.orderItems.map((item) => (
        <OrderItem key={item.id} item={item} />
      ))}
    </div>
    
    {/* Order Totals */}
    {(order.taxAmount || order.discountAmount) && (
      <div className="border-t border-gray-200 pt-4 space-y-2">
        {order.subtotal !== order.totalAmount && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
          </div>
        )}
        
        {order.taxAmount && order.taxAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax:</span>
            <span className="text-gray-900">{formatCurrency(order.taxAmount)}</span>
          </div>
        )}
        
        {order.discountAmount && order.discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Discount:</span>
            <span className="text-gray-900 text-green-600">-{formatCurrency(order.discountAmount)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
          <span className="text-gray-900">Total:</span>
          <span className="text-gray-900">{formatCurrency(order.totalAmount)}</span>
        </div>
      </div>
    )}
  </div>
);
