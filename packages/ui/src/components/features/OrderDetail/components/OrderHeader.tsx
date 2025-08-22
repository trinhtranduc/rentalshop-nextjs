import React from 'react';
import { Button } from '@rentalshop/ui';
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
}) => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Order #{order.orderNumber}
      </h1>
      <p className="text-sm text-gray-600 mt-1">
        {order.orderType.replace('_', ' ')} • {order.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0} items
      </p>
    </div>
    
    {showActions && onEdit && (
      <Button variant="outline" onClick={() => onEdit(order)} disabled={loading} size="sm">
        <Edit className="w-4 h-4 mr-2" />
        Edit
      </Button>
    )}
  </div>
);
