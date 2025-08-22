import React from 'react';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '../../../../lib/utils';
import { OrderData, SettingsForm } from '@rentalshop/types';
import { calculateCollectionAmount, getCollectionTitle } from '../utils';

interface OrderSummaryProps {
  order: OrderData;
  settingsForm: SettingsForm;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({ order, settingsForm }) => {
  const collectionAmount = calculateCollectionAmount(order, settingsForm);
  const collectionTitle = getCollectionTitle(order);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
      </div>
      
      {/* Content */}
      <div className="space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(order.subtotal)}
          </span>
        </div>
        
        {/* Discount - Always show if exists */}
        {order.discountAmount && order.discountAmount > 0 && (
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Discount</span>
            <span className="font-medium text-green-600">
              -{formatCurrency(order.discountAmount)}
            </span>
          </div>
        )}
        
        {/* Tax - Always show if exists */}
        {order.taxAmount && order.taxAmount > 0 && (
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(order.taxAmount)}
            </span>
          </div>
        )}
        
        {/* Total Amount */}
        <div className="flex justify-between items-center py-3 border-t border-gray-200">
          <span className="text-lg font-semibold text-gray-900">Total Amount</span>
          <span className="text-xl font-bold text-green-700">
            {formatCurrency(order.totalAmount)}
          </span>
        </div>
        
        {/* Deposit */}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600">Deposit</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(order.depositAmount)}
          </span>
        </div>
        
        {/* Remaining Balance */}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600">Remaining</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(order.totalAmount - order.depositAmount)}
          </span>
        </div>
        
        {/* Collection Amount */}
        <div className="py-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">
              {collectionTitle}
            </span>
            <span className={`text-xl font-bold ${
              collectionAmount < 0 ? 'text-blue-700' : 
              collectionAmount === 0 ? 'text-gray-500' : 'text-yellow-700'
            }`}>
              {collectionAmount === 0 ? (
                <span className="text-gray-500">0</span>
              ) : (
                `${formatCurrency(Math.abs(collectionAmount))}`
              )}
            </span>
          </div>
          
          {/* Additional Notes */}
          {order.orderType === 'RENT' && 
           order.status === 'RESERVED' && 
           settingsForm.material && 
           settingsForm.material.trim() !== '' && (
            <div className="text-sm font-medium text-gray-600 mt-1">
              và {settingsForm.material}
            </div>
          )}
          
          {order.orderType === 'RENT' && order.status === 'RESERVED' && (
            <div className="mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span>💡</span>
                <span>
                  {formatCurrency(order.totalAmount)} Total after discount - {formatCurrency(order.depositAmount)} Deposit + {formatCurrency(settingsForm.bailAmount)} Bail amount
                </span>
              </div>
            </div>
          )}
          
          {order.orderType === 'RENT' && order.status === 'PICKUP' && (
            <div className="mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span>💡</span>
                <span>
                  {formatCurrency(settingsForm.bailAmount)} Bail amount - {formatCurrency(settingsForm.damageFee)} Damage Fee
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
