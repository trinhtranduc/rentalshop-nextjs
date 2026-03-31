'use client';

import React from 'react';
import { Package, Hash, Image as ImageIcon, Calendar } from 'lucide-react';
import { formatCurrency } from '@rentalshop/ui';
import { ImageLightbox } from '../../../ui/image-lightbox';
import { OrderData } from '@rentalshop/types';

interface OrderItemsProps {
  order: OrderData;
}

function resolveOrderItemImageUrl(images: unknown): string | null {
  if (images == null) return null;
  if (typeof images === 'string') {
    const s = images.trim();
    if (!s) return null;
    if (s.startsWith('[') || s.startsWith('{')) {
      try {
        const parsed = JSON.parse(s) as unknown;
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
          return parsed[0];
        }
      } catch {
        return s;
      }
    }
    return s;
  }
  if (Array.isArray(images) && typeof images[0] === 'string') {
    return images[0];
  }
  return null;
}

const OrderItem: React.FC<{ item: OrderData['orderItems'][0] }> = ({ item }) => {
  const imageSrc = resolveOrderItemImageUrl(item.product.images);

  return (
  <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1 min-w-0">
          {/* Product Image - Enhanced */}
          <div className="flex-shrink-0">
            {imageSrc ? (
              <div className="h-20 w-20 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                <ImageLightbox
                  src={imageSrc}
                  alt={item.product.name}
                  triggerClassName="h-full w-full"
                  imgClassName="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 shadow-sm">
                <Package className="h-8 w-8 text-gray-400" />
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
};

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
