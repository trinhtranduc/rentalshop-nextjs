import React from 'react';
import { Button } from '../../../ui/button';
import { X, Printer, Package, RotateCcw } from 'lucide-react';
import { OrderDetailData, SettingsForm } from '@rentalshop/types';

interface OrderActionsProps {
  order: OrderDetailData;
  settingsForm: SettingsForm;
  onCancel?: (order: OrderDetailData) => void;
  onPickup?: (orderId: string, data: any) => void;
  onReturn?: (orderId: string, data: any) => void;
}

export const OrderActions: React.FC<OrderActionsProps> = ({ 
  order, 
  settingsForm, 
  onCancel, 
  onPickup, 
  onReturn 
}) => {
  const canCancel = order.status !== 'PICKUPED' && 
                   order.status !== 'RETURNED' && 
                   order.status !== 'CANCELLED';
  
  const canPickup = order.orderType === 'RENT' && 
                   order.status !== 'PICKUPED' && 
                   order.status !== 'RETURNED' && 
                   order.status !== 'CANCELLED';
  
  const canReturn = order.orderType === 'RENT' && 
                   order.status === 'PICKUPED';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Order Actions</h3>
      
      {/* Primary Actions */}
      <div className="flex flex-wrap gap-3">
        {/* Cancel Order */}
        {canCancel && (
          <Button
            variant="destructive"
            onClick={() => onCancel?.(order)}
            className="px-6"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel Order
          </Button>
        )}

        {/* Pickup Order */}
        {canPickup && (
          <Button
            variant="default"
            onClick={() => onPickup?.(order.id, {
              order_status: 'PICKUP',
              bail_amount: settingsForm.bailAmount,
              material: settingsForm.material,
              notes: settingsForm.notes
            })}
            className="px-6"
          >
            <Package className="w-4 h-4 mr-2" />
            Pickup Order
          </Button>
        )}

        {/* Return Order */}
        {canReturn && (
          <Button
            variant="default"
            onClick={() => onReturn?.(order.id, {
              order_status: 'RETURNED',
              notes: settingsForm.notes,
              damage_fee: settingsForm.damageFee
            })}
            className="px-6"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Return Order
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="px-4"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Order
        </Button>
      </div>
    </div>
  );
};
