/**
 * OrderSummarySection - Component for order summary, validation, and actions
 */

import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button
} from '@rentalshop/ui';
import { 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import { formatCurrency } from '@rentalshop/utils';
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
  onCancel
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          Order Summary & Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Summary */}
        <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-primary">
          <h4 className="font-medium text-text-primary">Order Summary</h4>
          
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Subtotal:</span>
            <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
          </div>

          {/* Discount */}
          {formData.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-action-success">
              <span>Discount:</span>
              <span className="font-medium">-{formatCurrency(formData.discountAmount)}</span>
            </div>
          )}

          {/* Deposit */}
          {formData.orderType === 'RENT' && formData.depositAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Deposit:</span>
              <span className="font-medium">{formatCurrency(formData.depositAmount)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between text-lg font-bold text-action-primary pt-2 border-t border-border">
            <span>Grand Total:</span>
            <span>{formatCurrency(formData.totalAmount)}</span>
          </div>
        </div>

        {/* Validation Summary */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Order Requirements:</h4>
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
              {formData.customerId ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={formData.customerId ? 'text-green-700' : 'text-red-600'}>
                {formData.customerId ? '✓' : '✗'} Customer information required
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
              {formData.outletId ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={formData.outletId ? 'text-green-700' : 'text-red-600'}>
                {formData.outletId ? '✓' : '✗'} Outlet selection required
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
