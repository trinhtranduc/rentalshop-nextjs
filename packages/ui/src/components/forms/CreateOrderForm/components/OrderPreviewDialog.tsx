/**
 * OrderPreviewDialog - Dialog component for previewing orders before confirmation
 */

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@rentalshop/ui/base';
import { OrderPreviewForm } from './OrderPreviewForm';
import { ShoppingCart } from 'lucide-react';
import type { 
  OrderFormData, 
  OrderItemFormData,
  ProductWithStock 
} from '../types';

interface OrderPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: {
    orderType: OrderFormData['orderType'];
    customerId: number;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    outletId: number;
    outletName?: string;
    pickupPlanAt?: string;
    returnPlanAt?: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    depositAmount: number;
    securityDeposit: number;
    lateFee: number;
    damageFee: number;
    notes: string;
    orderItems: Array<{
      productId: number;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      deposit: number;
      notes: string;
    }>;
  };
  products: ProductWithStock[];
  onConfirm: () => void;
  onEdit: () => void;
  loading: boolean;
  confirmText: string;
  editText: string;
  title: string;
  subtitle: string;
}

export const OrderPreviewDialog: React.FC<OrderPreviewDialogProps> = ({
  open,
  onOpenChange,
  orderData,
  products,
  onConfirm,
  onEdit,
  loading,
  confirmText,
  editText,
  title,
  subtitle
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-700" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <OrderPreviewForm
          orderData={orderData}
          products={products}
          onConfirm={onConfirm}
          onEdit={onEdit}
          loading={loading}
          confirmText={confirmText}
          editText={editText}
          title={title}
          subtitle={subtitle}
        />
      </DialogContent>
    </Dialog>
  );
};
