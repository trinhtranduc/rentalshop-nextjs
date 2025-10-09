"use client";

import React, { useState } from 'react';
import { Button, ConfirmationDialog } from '@rentalshop/ui';
import { X, Printer, Package, RotateCcw } from 'lucide-react';
import { OrderWithDetails } from '@rentalshop/types';

// Define SettingsForm interface locally
interface SettingsForm {
  damageFee: number;
  securityDeposit: number;
  collateralType: string;
  collateralDetails: string;
  notes: string;
  bailAmount?: number;
  material?: string;
}

interface OrderActionsProps {
  order: OrderWithDetails;
  settingsForm: SettingsForm;
  onCancel?: (order: OrderWithDetails) => void;
  onPickup?: (orderId: number, data: any) => void;
  onReturn?: (orderId: number, data: any) => void;
}

export const OrderActions: React.FC<OrderActionsProps> = ({ 
  order, 
  settingsForm, 
  onCancel, 
  onPickup, 
  onReturn 
}) => {
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);

  const canCancel = order.status !== 'PICKUPED' && 
                   order.status !== 'RETURNED' && 
                   order.status !== 'CANCELLED';
  
  const canPickup = order.orderType === 'RENT' && 
                   order.status !== 'PICKUPED' && 
                   order.status !== 'RETURNED' && 
                   order.status !== 'CANCELLED';
  
  const canReturn = order.orderType === 'RENT' && 
                   order.status === 'PICKUPED';

  const handleCancelClick = () => {
    setShowCancelConfirmDialog(true);
  };

  const handleCancelConfirm = () => {
    onCancel?.(order);
    setShowCancelConfirmDialog(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Order Actions</h3>
      
      {/* Actions Layout: Cancel on left, others on right */}
      <div className="flex justify-between items-center">
        {/* Left side - Cancel button */}
        <div>
          {canCancel && (
            <Button
              variant="destructive"
              onClick={handleCancelClick}
              className="px-6"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Order
            </Button>
          )}
        </div>

        {/* Right side - Other action buttons */}
        <div className="flex gap-3">
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

          {/* Print Order - Always visible */}
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

      {/* Cancel Order Confirmation Dialog */}
      <ConfirmationDialog
        open={showCancelConfirmDialog}
        onOpenChange={setShowCancelConfirmDialog}
        type="danger"
        title="Cancel Order"
        description={`Are you sure you want to cancel order #${order.orderNumber}? This action cannot be undone.`}
        confirmText="Cancel Order"
        cancelText="Keep Order"
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelConfirmDialog(false)}
      />
    </div>
  );
};
