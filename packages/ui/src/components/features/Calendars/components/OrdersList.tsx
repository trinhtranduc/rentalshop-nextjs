import React from 'react';
import { Package, User, Mail, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { PickupOrder } from '@rentalshop/types';
import { useOrderTranslations } from '@rentalshop/hooks';

interface OrdersListProps {
  orders: PickupOrder[];
  selectedDate?: Date | null;
  onOrderClick?: (order: PickupOrder) => void;
  className?: string;
}

export function OrdersList({ 
  orders, 
  selectedDate, 
  onOrderClick,
  className = '' 
}: OrdersListProps) {
  const t = useOrderTranslations();
  
  if (orders.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">{t('messages.noOrders')}</p>
        {selectedDate && (
          <p className="text-sm">for {selectedDate.toLocaleDateString()}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900">
        Orders {selectedDate && `for ${selectedDate.toLocaleDateString()}`}
      </h3>
      
      <div className="space-y-3">
        {orders.map(order => (
          <div
            key={order.id}
            onClick={() => onOrderClick?.(order)}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            {/* Order Header */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">
                #{order.orderNumber}
              </h4>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                order.status === 'RESERVED' ? 'bg-red-100 text-red-800' :
                order.status === 'PICKUPED' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order.status}
              </span>
            </div>

            {/* Customer Information */}
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {order.customerName || (order.customer ? 
                    `${order.customer.firstName} ${order.customer.lastName}` : 
                    'Unknown Customer'
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {order.customerPhone || order.customer?.phone || 'No phone'}
                </p>
              </div>
            </div>

            {/* Product Information */}
            <div className="flex items-center space-x-2 mb-3">
              <Package className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                {order.productName}
              </span>
            </div>

            {/* Order Status */}
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span className="capitalize">{order.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
