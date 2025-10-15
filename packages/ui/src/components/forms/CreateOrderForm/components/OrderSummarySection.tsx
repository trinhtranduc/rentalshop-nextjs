/**
 * OrderSummarySection - Component for order summary, validation, and actions
 */

import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  useFormatCurrency
} from '@rentalshop/ui';
import { 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import type { 
  OrderFormData, 
  OrderItemFormData 
} from '../types';

interface OrderSummarySectionProps {
  formData: OrderFormData;
  orderItems: OrderItemFormData[];
  isEditMode: boolean;
  loading: boolean;
  isFormValid: boolean;
  onPreviewClick: (e: React.FormEvent) => void;
  onCancel?: () => void;
}

export const OrderSummarySection: React.FC<OrderSummarySectionProps> = ({
  formData,
  orderItems,
  isEditMode,
  loading,
  isFormValid,
  onPreviewClick,
  onCancel,
}) => {
  // Use formatCurrency hook - automatically uses merchant's currency
  const formatMoney = useFormatCurrency();
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Order Summary & Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Summary */}
        <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-primary">
          <h4 className="text-sm font-semibold text-text-primary">Order Summary</h4>
          
          {/* Rental Duration - Show for RENT orders with dates */}
          {formData.orderType === 'RENT' && formData.pickupPlanAt && formData.returnPlanAt && (
            <div className="pb-2 mb-2 border-b border-border">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Rental Duration:</span>
                <span className="font-medium">
                  {(() => {
                    const start = new Date(formData.pickupPlanAt);
                    const end = new Date(formData.returnPlanAt);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    return `${days} ${days === 1 ? 'day' : 'days'}`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between text-xs text-text-tertiary">
                <span>From: {new Date(formData.pickupPlanAt).toLocaleDateString('en-GB')}</span>
                <span>To: {new Date(formData.returnPlanAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          )}
          
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Subtotal:</span>
            <span className="font-medium">{formatMoney(formData.subtotal)}</span>
          </div>

          {/* Discount */}
          {formData.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-action-success">
              <span>Discount:</span>
              <span className="font-medium">-{formatMoney(formData.discountAmount)}</span>
            </div>
          )}

          {/* Deposit */}
          {formData.orderType === 'RENT' && formData.depositAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Deposit:</span>
              <span className="font-medium">{formatMoney(formData.depositAmount)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between text-base font-bold text-action-primary pt-2 border-t border-border">
            <span>Grand Total:</span>
            <span>{formatMoney(formData.totalAmount)}</span>
          </div>
        </div>

        {/* Validation Summary */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Order Requirements:</h4>
          <div className="space-y-2 text-sm">
            {/* Products Required */}
            <div className="flex items-center gap-2">
              {orderItems.length > 0 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={orderItems.length > 0 ? 'text-green-700' : 'text-red-600'}>
                {orderItems.length > 0 ? '✓' : '✗'} Select at least one product
                {orderItems.length > 0 && ` (${orderItems.length} selected)`}
              </span>
            </div>

            {/* Customer Required */}
            <div className="flex items-center gap-2">
              {formData.customerId && formData.customerId > 0 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={formData.customerId && formData.customerId > 0 ? 'text-green-700' : 'text-red-600'}>
                {formData.customerId && formData.customerId > 0 ? '✓' : '✗'} Customer information required
              </span>
            </div>

            {/* Rental Period Required for RENT orders */}
            {formData.orderType === 'RENT' && (
              <div className="flex items-center gap-2">
                {formData.pickupPlanAt && formData.returnPlanAt ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className={formData.pickupPlanAt && formData.returnPlanAt ? 'text-green-700' : 'text-red-600'}>
                  {formData.pickupPlanAt && formData.returnPlanAt ? '✓' : '✗'} Rental period required (pickup & return dates)
                </span>
              </div>
            )}

            {/* Outlet Required */}
            <div className="flex items-center gap-2">
              {formData.outletId && formData.outletId > 0 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={formData.outletId && formData.outletId > 0 ? 'text-green-700' : 'text-red-600'}>
                {formData.outletId && formData.outletId > 0 ? '✓' : '✗'} Outlet selection required
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-2">
          <div className="flex gap-3">
            <Button
              type="button"
              disabled={loading || !isFormValid}
              onClick={onPreviewClick}
              className="flex-1"
            >
              {loading ? 'Processing...' : isEditMode ? 'Update Order' : 'Preview'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                {isEditMode ? 'Cancel' : 'Reset Selection'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
