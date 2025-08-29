import React from 'react';
import { Button, Badge } from '@rentalshop/ui';
import { Edit } from 'lucide-react';
import { OrderDetailData } from '@rentalshop/types';

interface OrderHeaderProps {
  order: OrderDetailData;
  showActions: boolean;
  onEdit?: (order: OrderDetailData) => void;
  onCancel?: (order: OrderDetailData) => void;
  loading: boolean;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({ 
  order, 
  showActions, 
  onEdit, 
  onCancel, 
  loading 
}) => {
  // Check if order can be edited based on type and status
  const canEditOrder = (order: OrderDetailData) => {
    const isRentOrder = order.orderType === 'RENT';
    const isSaleOrder = order.orderType === 'SALE';
    const currentStatus = order.status;
    
    return (
      // RENT orders: can only edit when RESERVED
      (isRentOrder && currentStatus === 'RESERVED') ||
      // SALE orders: can only edit when COMPLETED
      (isSaleOrder && currentStatus === 'COMPLETED')
    );
  };

  const getOrderTypeBadge = (type: string) => {
    const variants = {
      RENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      SALE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    
    return (
      <Badge variant="default" className={variants[type as keyof typeof variants]}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Order #{order.orderNumber}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          {getOrderTypeBadge(order.orderType)}
          <span className="text-sm text-gray-600">
            {order.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0} items
          </span>
        </div>
      </div>
      
      {showActions && onEdit && (
        <Button 
          variant="outline" 
          onClick={() => onEdit(order)} 
          disabled={loading || !canEditOrder(order)} 
          size="sm"
          title={
            !canEditOrder(order) 
              ? order.orderType === 'RENT'
                ? 'RENT orders can only be edited when status is RESERVED'
                : 'SALE orders can only be edited when status is COMPLETED'
              : 'Edit Order'
          }
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      )}
    </div>
  );
};
