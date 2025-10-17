import React from 'react';
import { Button } from '../../../ui/button';
import { Edit, X, Package, RotateCcw, Printer, Info } from 'lucide-react';
import { useOrderTranslations } from '@rentalshop/hooks';
import { ORDER_STATUSES } from '@rentalshop/constants';
import type { OrderWithDetails } from '@rentalshop/types';

interface OrderActionsSectionProps {
  order: OrderWithDetails;
  canEdit: boolean;
  canCancel: boolean;
  canPickup: boolean;
  canReturn: boolean;
  canPrint: boolean;
  isRentOrder: boolean;
  isSaleOrder: boolean;
  isPickupLoading: boolean;
  isReturnLoading: boolean;
  isCancelLoading: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onPickup: () => void;
  onReturn: () => void;
  onPrint: () => void;
}

export const OrderActionsSection: React.FC<OrderActionsSectionProps> = ({
  order,
  canEdit,
  canCancel,
  canPickup,
  canReturn,
  canPrint,
  isRentOrder,
  isSaleOrder,
  isPickupLoading,
  isReturnLoading,
  isCancelLoading,
  onEdit,
  onCancel,
  onPickup,
  onReturn,
  onPrint
}) => {
  const t = useOrderTranslations();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">{t('detail.orderActions')}</h3>
        
        {/* Actions Layout: Cancel on left, others on right */}
        <div className="flex justify-between items-center">
          {/* Left side - Cancel button */}
          <div>
            {canCancel && (
              <Button
                variant="destructive"
                onClick={onCancel}
                className="px-6"
                disabled={isCancelLoading}
              >
                <X className="w-4 h-4 mr-2" />
                {isCancelLoading ? t('detail.cancelling') : t('actions.cancelOrder')}
              </Button>
            )}
          </div>

          {/* Right side - Other action buttons */}
          <div className="flex gap-3">
            {/* Edit Order */}
            <Button
              variant="outline"
              onClick={onEdit}
              className="px-4"
              disabled={!canEdit}
              title={
                !canEdit 
                  ? isRentOrder 
                    ? 'RENT orders can only be edited when status is RESERVED'
                    : 'SALE orders can only be edited when status is COMPLETED'
                  : t('detail.editOrder')
              }
            >
              <Edit className="w-4 h-4 mr-2" />
              {t('detail.editOrder')}
            </Button>

            {/* Pickup Order - Only for RENT orders with RESERVED status */}
            {canPickup && (
              <Button
                variant="default"
                onClick={onPickup}
                className="px-6"
                disabled={isPickupLoading}
              >
                <Package className="w-4 h-4 mr-2" />
                {isPickupLoading ? t('actions.pickingUp') : t('actions.markAsPickedUp')}
              </Button>
            )}

            {/* Return Order - Only for RENT orders with PICKUPED status */}
            {canReturn && (
              <Button
                variant="default"
                onClick={onReturn}
                className="px-4"
                disabled={isReturnLoading}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isReturnLoading ? t('actions.returning') : t('actions.markAsReturned')}
              </Button>
            )}

            {/* Print Order - Always visible */}
            {canPrint && (
              <Button
                variant="outline"
                onClick={onPrint}
                className="px-4"
              >
                <Printer className="w-4 h-4 mr-2" />
                {t('actions.printReceipt')}
              </Button>
            )}
          </div>
        </div>
        
        {/* Edit Rules Information */}
        <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-700 mb-1">{t('detail.editingRules')}:</p>
              <ul className="space-y-1 text-gray-600">
                <li>• {t('detail.rentOrderRule')} <span className="font-mono bg-blue-100 px-1 rounded">{ORDER_STATUSES.RESERVED}</span></li>
                <li>• {t('detail.saleOrderRule')} <span className="font-mono bg-green-100 px-1 rounded">{ORDER_STATUSES.COMPLETED}</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

