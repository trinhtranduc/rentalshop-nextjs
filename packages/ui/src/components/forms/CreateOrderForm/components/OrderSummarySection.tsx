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
import { useOrderTranslations } from '@rentalshop/hooks';
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
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  hideCardWrapper?: boolean;
}

export const OrderSummarySection: React.FC<OrderSummarySectionProps> = ({
  formData,
  orderItems,
  isEditMode,
  loading,
  isFormValid,
  onSubmit,
  onCancel,
  hideCardWrapper = false,
}) => {
  // Use formatCurrency hook - automatically uses merchant's currency
  const formatMoney = useFormatCurrency();
  const t = useOrderTranslations();
  
  const content = (
    <>
        {/* Order Summary */}
        <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-primary">
          <h4 className="text-sm font-semibold text-text-primary">{t('detail.orderSummary')}</h4>
          
          {/* Rental Duration - Show for RENT orders with dates */}
          {formData.orderType === 'RENT' && formData.pickupPlanAt && formData.returnPlanAt && (
            <div className="pb-2 mb-2 border-b border-border">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">{t('summary.rentalDuration')}:</span>
                <span className="font-medium">
                  {(() => {
                    const start = new Date(formData.pickupPlanAt);
                    const end = new Date(formData.returnPlanAt);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    return `${days} ${days === 1 ? t('summary.day') : t('summary.days')}`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between text-xs text-text-tertiary">
                <span>{t('summary.from')}: {new Date(formData.pickupPlanAt).toLocaleDateString('en-GB')}</span>
                <span>{t('summary.to')}: {new Date(formData.returnPlanAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          )}
          
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">{t('summary.subtotal')}:</span>
            <span className="font-medium">{formatMoney(formData.subtotal)}</span>
          </div>

          {/* Discount */}
          {formData.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-action-success">
              <span>{t('summary.discount')}:</span>
              <span className="font-medium">-{formatMoney(formData.discountAmount)}</span>
            </div>
          )}

          {/* Deposit */}
          {formData.orderType === 'RENT' && formData.depositAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">{t('summary.deposit')}:</span>
              <span className="font-medium">{formatMoney(formData.depositAmount)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between text-base font-bold text-action-primary pt-2 border-t border-border">
            <span>{t('summary.grandTotal')}:</span>
            <span>{formatMoney(formData.totalAmount)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-2">
          <div className="flex gap-3">
            <Button
              type="button"
              disabled={loading || !isFormValid}
              onClick={onSubmit}
              className="flex-1"
            >
              {loading ? t('messages.processing') : isEditMode ? t('messages.updateOrder') : t('messages.createOrder')}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                {isEditMode ? t('messages.cancel') : t('messages.resetSelection')}
              </Button>
            )}
          </div>
        </div>
    </>
  );

  if (hideCardWrapper) {
    return (
      <div>
        <h4 className="text-base font-semibold text-text-primary mb-4">
          {t('detail.orderSummary')} & {t('detail.orderActions')}
        </h4>
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {t('detail.orderSummary')} & {t('detail.orderActions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
      </CardContent>
    </Card>
  );
};
